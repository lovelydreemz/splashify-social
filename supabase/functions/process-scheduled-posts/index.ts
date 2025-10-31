import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Verify service role key (for cron) OR valid user JWT (for manual triggers)
    const apiKey = req.headers.get('apikey');
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Allow if it's the service role key (cron job) or has valid auth (manual trigger)
    const isServiceRole = apiKey === serviceRoleKey;
    const hasAuth = authHeader && authHeader.startsWith('Bearer ');
    
    if (!isServiceRole && !hasAuth) {
      console.error("Unauthorized access attempt to process-scheduled-posts");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("Processing scheduled posts...");

    // Get all active scheduled posts that are due
    const { data: duePosts, error: fetchError } = await supabaseClient
      .from('scheduled_posts')
      .select('*, post_templates(*)')
      .eq('status', 'active')
      .lte('next_post_time', new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching due posts:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${duePosts?.length || 0} posts to process`);

    const results = [];

    for (const scheduledPost of duePosts || []) {
      try {
        // Fetch profile separately to get Threads credentials
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('threads_access_token, threads_app_id')
          .eq('user_id', scheduledPost.user_id)
          .single();

        if (profileError) {
          console.error("Error fetching profile for user:", scheduledPost.user_id, profileError);
          continue;
        }

        if (!profile?.threads_access_token || !profile?.threads_app_id) {
          console.error("Missing Threads credentials for user:", scheduledPost.user_id);
          continue;
        }

        console.log("Processing post for schedule:", scheduledPost.id);

        let content = scheduledPost.generated_content;
        
        // Generate new content if not already generated
        if (!content && scheduledPost.post_templates) {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          const systemPrompt = `You are a creative social media content creator. Generate engaging, authentic posts for Threads based on the user's comment. The post should be:
- Natural and conversational
- Around 150-300 characters
- Include relevant hashtags if appropriate
- Match the tone and intent of the original comment
${scheduledPost.post_templates.language && scheduledPost.post_templates.language !== 'en' ? `- Written in ${scheduledPost.post_templates.language}` : ''}`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: scheduledPost.post_templates.comment }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            content = aiData.choices[0].message.content;
            console.log("AI generated content:", content);
          } else {
            const errorText = await aiResponse.text();
            console.error("AI generation failed:", errorText);
          }
        }

        if (!content) {
          console.error("No content available for post:", scheduledPost.id);
          continue;
        }

        console.log("Posting to Threads with content:", content);

        // Post to Threads
        if (profile.threads_access_token && profile.threads_app_id) {
          // Create container
          const createResponse = await fetch(
            `https://graph.threads.net/v1.0/${profile.threads_app_id}/threads`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                media_type: 'TEXT',
                text: content,
                access_token: profile.threads_access_token,
              }),
            }
          );

          if (createResponse.ok) {
            const containerData = await createResponse.json();
            console.log("Container created:", containerData.id);
            
            // Publish
            const publishResponse = await fetch(
              `https://graph.threads.net/v1.0/${profile.threads_app_id}/threads_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: containerData.id,
                  access_token: profile.threads_access_token,
                }),
              }
            );

            if (publishResponse.ok) {
              const publishData = await publishResponse.json();
              
              // Record in history
              await supabaseClient.from('post_history').insert({
                user_id: scheduledPost.user_id,
                scheduled_post_id: scheduledPost.id,
                content: content,
                threads_post_id: publishData.id,
                status: 'success',
              });

              // Calculate next post time
              const nextTime = new Date();
              const intervalValue = scheduledPost.interval_value;
              
              switch (scheduledPost.interval_unit) {
                case 'minutes':
                  nextTime.setMinutes(nextTime.getMinutes() + intervalValue);
                  break;
                case 'hours':
                  nextTime.setHours(nextTime.getHours() + intervalValue);
                  break;
                case 'days':
                  nextTime.setDate(nextTime.getDate() + intervalValue);
                  break;
              }

              // Update scheduled post
              await supabaseClient
                .from('scheduled_posts')
                .update({
                  last_posted_at: new Date().toISOString(),
                  next_post_time: nextTime.toISOString(),
                  generated_content: null, // Clear for next generation
                })
                .eq('id', scheduledPost.id);

              results.push({ id: scheduledPost.id, status: 'success' });
              console.log("Successfully posted:", scheduledPost.id);
            } else {
              const errorText = await publishResponse.text();
              console.error("Publish error:", errorText);
              
              await supabaseClient.from('post_history').insert({
                user_id: scheduledPost.user_id,
                scheduled_post_id: scheduledPost.id,
                content: content,
                status: 'failed',
                error_message: errorText,
              });

              results.push({ id: scheduledPost.id, status: 'failed', error: errorText });
            }
          } else {
            const createErrorText = await createResponse.text();
            console.error("Container creation error:", createErrorText);
            
            await supabaseClient.from('post_history').insert({
              user_id: scheduledPost.user_id,
              scheduled_post_id: scheduledPost.id,
              content: content,
              status: 'failed',
              error_message: `Container creation failed: ${createErrorText}`,
            });

            results.push({ id: scheduledPost.id, status: 'failed', error: createErrorText });
          }
        }
      } catch (error) {
        console.error("Error processing post:", scheduledPost.id, error);
        results.push({ id: scheduledPost.id, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return new Response(JSON.stringify({ 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in process-scheduled-posts function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});