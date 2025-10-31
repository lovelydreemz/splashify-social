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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("Processing scheduled posts...");

    // Get all active scheduled posts that are due
    const { data: duePosts, error: fetchError } = await supabaseClient
      .from('scheduled_posts')
      .select('*, post_templates(*), profiles(*)')
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
          }
        }

        if (!content) {
          console.error("No content available for post:", scheduledPost.id);
          continue;
        }

        // Post to Threads
        if (scheduledPost.profiles?.threads_access_token && scheduledPost.profiles?.threads_app_id) {
          // Create container
          const createResponse = await fetch(
            `https://graph.threads.net/v1.0/${scheduledPost.profiles.threads_app_id}/threads`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                media_type: 'TEXT',
                text: content,
                access_token: scheduledPost.profiles.threads_access_token,
              }),
            }
          );

          if (createResponse.ok) {
            const containerData = await createResponse.json();
            
            // Publish
            const publishResponse = await fetch(
              `https://graph.threads.net/v1.0/${scheduledPost.profiles.threads_app_id}/threads_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: containerData.id,
                  access_token: scheduledPost.profiles.threads_access_token,
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