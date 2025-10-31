import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PostHistory {
  id: string;
  content: string;
  posted_at: string;
  status: string;
  error_message: string | null;
  threads_post_id: string | null;
}

export const History = () => {
  const [posts, setPosts] = useState<PostHistory[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("post_history")
        .select("*")
        .order("posted_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load post history");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Post History</h3>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        posts.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {new Date(post.posted_at).toLocaleString()}
                </CardTitle>
                <Badge variant={post.status === 'success' ? 'default' : 'destructive'}>
                  {post.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">{post.content}</p>
              {post.error_message && (
                <p className="text-xs text-destructive">Error: {post.error_message}</p>
              )}
              {post.threads_post_id && (
                <p className="text-xs text-muted-foreground">
                  Thread ID: {post.threads_post_id}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};