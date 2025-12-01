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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { content } = await req.json();
    
    if (!content) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's Threads credentials
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('threads_app_id, threads_access_token')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile.threads_access_token || !profile.threads_app_id) {
      return new Response(JSON.stringify({ error: "Threads credentials not configured" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Posting to Threads...");

    // Step 1: Create media container
    const createContainerResponse = await fetch(
      `https://graph.threads.net/v1.0/${profile.threads_app_id}/threads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_type: 'TEXT',
          text: content,
          access_token: profile.threads_access_token,
        }),
      }
    );

    if (!createContainerResponse.ok) {
      const errorText = await createContainerResponse.text();
      console.error("Threads API error (create container):", errorText);
      return new Response(JSON.stringify({ error: "Failed to create Threads post container", details: errorText }), {
        status: createContainerResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const containerData = await createContainerResponse.json();
    
    if (!containerData.id) {
      console.error("No container ID returned:", containerData);
      return new Response(JSON.stringify({ error: "Failed to create container", details: containerData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const creationId = containerData.id;
    console.log("Container created:", creationId);

    // Wait 4 seconds before publishing to ensure container is fully ready on Threads servers
    console.log("Waiting 4 seconds before publishing...");
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Step 2: Publish the container
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${profile.threads_app_id}/threads_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: profile.threads_access_token,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error("Threads API error (publish):", errorText);
      return new Response(JSON.stringify({ error: "Failed to publish Threads post", details: errorText }), {
        status: publishResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const publishData = await publishResponse.json();
    const threadsPostId = publishData.id;

    console.log("Post published successfully:", threadsPostId);

    return new Response(JSON.stringify({ 
      success: true, 
      threads_post_id: threadsPostId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in post-to-threads function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});