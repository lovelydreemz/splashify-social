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
    console.log("Processing scheduled posts - called by cron job");

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
        // Fetch profile with all platform credentials
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('threads_access_token, threads_app_id, linkedin_access_token, instagram_access_token, instagram_user_id')
          .eq('user_id', scheduledPost.user_id)
          .single();

        if (profileError) {
          console.error("Error fetching profile for user:", scheduledPost.user_id, profileError);
          continue;
        }

        console.log("Processing post for schedule:", scheduledPost.id);

        // Parse platforms configuration
        const platforms = scheduledPost.platforms || { threads: true, linkedin: false, instagram: false };
        const platformContent = scheduledPost.platform_content || {};

        // Generate AI content if needed
        const generateContent = async (platform: string) => {
          // Check if platform-specific content exists
          if (platformContent[platform]) {
            return platformContent[platform];
          }

          // Check if generated content exists
          if (scheduledPost.generated_content) {
            return scheduledPost.generated_content;
          }

          // Generate new content
          if (scheduledPost.post_templates) {
            const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
            const systemPrompt = `You are creating social media content that appears naturally human-written. Generate content based on the user's request WITHOUT any conversational preambles, introductions, or meta-commentary.

CRITICAL RULES:
- Output ONLY the actual poem, text, or content itself
- Do NOT include phrases like "here's a poem", "especially for you", "sure!", "of course!", or any conversational lead-ins
- Do NOT explain what you're doing or add commentary
- Start directly with the content itself
- Make it appear as if a human wrote it spontaneously
- Keep it concise and authentic
- Include relevant hashtags naturally at the end if appropriate
${scheduledPost.post_templates.language && scheduledPost.post_templates.language !== 'en' ? `- Write in ${scheduledPost.post_templates.language} language` : ''}

Just output the pure content as if you're the person posting it naturally.`;

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
              const content = aiData.choices[0].message.content;
              console.log("AI generated content:", content);
              return content;
            } else {
              const errorText = await aiResponse.text();
              console.error("AI generation failed:", errorText);
              return null;
            }
          }
          return null;
        };

        let postSuccessful = false;
        const platformResults: any[] = [];

        // Post to Threads
        if (platforms.threads && profile.threads_access_token && profile.threads_app_id) {
          try {
            const content = await generateContent('threads');
            if (content) {
              console.log("Posting to Threads...");
              
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
                console.log("Threads container created:", containerData.id);
                
                // Wait 4 seconds before publishing
                await new Promise(resolve => setTimeout(resolve, 4000));
                
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
                  
                  await supabaseClient.from('post_history').insert({
                    user_id: scheduledPost.user_id,
                    scheduled_post_id: scheduledPost.id,
                    content: content,
                    threads_post_id: publishData.id,
                    platform: 'threads',
                    status: 'success',
                  });

                  platformResults.push({ platform: 'threads', status: 'success' });
                  postSuccessful = true;
                  console.log("Threads post successful");
                } else {
                  const errorText = await publishResponse.text();
                  console.error("Threads publish error:", errorText);
                  
                  await supabaseClient.from('post_history').insert({
                    user_id: scheduledPost.user_id,
                    scheduled_post_id: scheduledPost.id,
                    content: content,
                    platform: 'threads',
                    status: 'failed',
                    error_message: errorText,
                  });

                  platformResults.push({ platform: 'threads', status: 'failed', error: errorText });
                }
              }
            }
          } catch (error) {
            console.error("Threads posting error:", error);
            platformResults.push({ platform: 'threads', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        // Post to LinkedIn
        if (platforms.linkedin && profile.linkedin_access_token) {
          try {
            const content = await generateContent('linkedin');
            if (content) {
              console.log("Posting to LinkedIn...");
              
              // Get user info
              const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: {
                  'Authorization': `Bearer ${profile.linkedin_access_token}`,
                },
              });

              if (userInfoResponse.ok) {
                const userInfo = await userInfoResponse.json();
                const personUrn = `urn:li:person:${userInfo.sub}`;

                const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${profile.linkedin_access_token}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0',
                  },
                  body: JSON.stringify({
                    author: personUrn,
                    lifecycleState: 'PUBLISHED',
                    specificContent: {
                      'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                          text: content,
                        },
                        shareMediaCategory: 'NONE',
                      },
                    },
                    visibility: {
                      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
                    },
                  }),
                });

                if (postResponse.ok) {
                  const postData = await postResponse.json();
                  
                  await supabaseClient.from('post_history').insert({
                    user_id: scheduledPost.user_id,
                    scheduled_post_id: scheduledPost.id,
                    content: content,
                    platform: 'linkedin',
                    status: 'success',
                  });

                  platformResults.push({ platform: 'linkedin', status: 'success' });
                  postSuccessful = true;
                  console.log("LinkedIn post successful");
                } else {
                  const errorText = await postResponse.text();
                  console.error("LinkedIn post error:", errorText);
                  
                  await supabaseClient.from('post_history').insert({
                    user_id: scheduledPost.user_id,
                    scheduled_post_id: scheduledPost.id,
                    content: content,
                    platform: 'linkedin',
                    status: 'failed',
                    error_message: errorText,
                  });

                  platformResults.push({ platform: 'linkedin', status: 'failed', error: errorText });
                }
              }
            }
          } catch (error) {
            console.error("LinkedIn posting error:", error);
            platformResults.push({ platform: 'linkedin', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        // Post to Instagram
        if (platforms.instagram && profile.instagram_access_token && profile.instagram_user_id) {
          try {
            const content = await generateContent('instagram');
            if (content) {
              console.log("Posting to Instagram...");
              
              const createResponse = await fetch(
                `https://graph.instagram.com/v21.0/${profile.instagram_user_id}/media`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    media_type: 'TEXT',
                    text: content,
                    access_token: profile.instagram_access_token,
                  }),
                }
              );

              if (createResponse.ok) {
                const containerData = await createResponse.json();
                console.log("Instagram container created:", containerData.id);
                
                // Wait 4 seconds before publishing
                await new Promise(resolve => setTimeout(resolve, 4000));
                
                const publishResponse = await fetch(
                  `https://graph.instagram.com/v21.0/${profile.instagram_user_id}/media_publish`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      creation_id: containerData.id,
                      access_token: profile.instagram_access_token,
                    }),
                  }
                );

                if (publishResponse.ok) {
                  const publishData = await publishResponse.json();
                  
                  await supabaseClient.from('post_history').insert({
                    user_id: scheduledPost.user_id,
                    scheduled_post_id: scheduledPost.id,
                    content: content,
                    platform: 'instagram',
                    status: 'success',
                  });

                  platformResults.push({ platform: 'instagram', status: 'success' });
                  postSuccessful = true;
                  console.log("Instagram post successful");
                } else {
                  const errorText = await publishResponse.text();
                  console.error("Instagram publish error:", errorText);
                  
                  await supabaseClient.from('post_history').insert({
                    user_id: scheduledPost.user_id,
                    scheduled_post_id: scheduledPost.id,
                    content: content,
                    platform: 'instagram',
                    status: 'failed',
                    error_message: errorText,
                  });

                  platformResults.push({ platform: 'instagram', status: 'failed', error: errorText });
                }
              }
            }
          } catch (error) {
            console.error("Instagram posting error:", error);
            platformResults.push({ platform: 'instagram', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        // Update scheduled post for next run if at least one platform succeeded
        if (postSuccessful) {
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

          await supabaseClient
            .from('scheduled_posts')
            .update({
              last_posted_at: new Date().toISOString(),
              next_post_time: nextTime.toISOString(),
              generated_content: null,
            })
            .eq('id', scheduledPost.id);
        }

        results.push({
          id: scheduledPost.id,
          platformResults,
          overallStatus: postSuccessful ? 'success' : 'failed'
        });

      } catch (error) {
        console.error("Error processing post:", scheduledPost.id, error);
        results.push({
          id: scheduledPost.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
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
