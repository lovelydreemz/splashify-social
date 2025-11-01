import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Filter, Calendar, ExternalLink } from "lucide-react";

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
  const [filteredPosts, setFilteredPosts] = useState<PostHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, searchQuery, statusFilter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("post_history")
        .select("*")
        .order("posted_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load post history");
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = () => {
    let filtered = [...posts];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(post => post.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(post =>
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPosts(filtered);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Post History
          </CardTitle>
          <CardDescription>View and filter your posted content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search posts
              </label>
              <Input
                placeholder="Search by content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Posts</SelectItem>
                  <SelectItem value="success">Success Only</SelectItem>
                  <SelectItem value="failed">Failed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredPosts.length} of {posts.length} posts</span>
            <Button variant="ghost" size="sm" onClick={loadHistory}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground text-center">
              {posts.length === 0 ? "No posts yet" : "No posts match your filters"}
            </p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {posts.length === 0
                ? "Your posted content will appear here"
                : "Try adjusting your search or filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        filteredPosts.map((post) => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(post.posted_at).toLocaleString()}
                </CardTitle>
                <Badge variant={post.status === 'success' ? 'default' : 'destructive'}>
                  {post.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{post.content}</p>
              {post.error_message && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive font-medium">Error: {post.error_message}</p>
                </div>
              )}
              {post.threads_post_id && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Thread ID: {post.threads_post_id}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => window.open(`https://threads.net/@user/post/${post.threads_post_id}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View on Threads
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};