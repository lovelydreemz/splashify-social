import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pause, Play, Trash2, Send, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Template {
  id: string;
  title: string;
}

interface ScheduledPost {
  id: string;
  template_id: string;
  interval_value: number;
  interval_unit: string;
  next_post_time: string;
  status: string;
  post_templates: { title: string };
}

export const Schedule = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [intervalValue, setIntervalValue] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState("hours");

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from("post_templates")
        .select("id, title");

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      const { data: scheduledData, error: scheduledError } = await supabase
        .from("scheduled_posts")
        .select("*, post_templates(title)")
        .order("created_at", { ascending: false });

      if (scheduledError) throw scheduledError;
      setScheduledPosts(scheduledData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    }
  };

  const handleSchedule = async () => {
    if (!selectedTemplate || !intervalValue) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const nextPostTime = new Date();
      const value = parseInt(intervalValue);
      
      switch (intervalUnit) {
        case 'minutes':
          nextPostTime.setMinutes(nextPostTime.getMinutes() + value);
          break;
        case 'hours':
          nextPostTime.setHours(nextPostTime.getHours() + value);
          break;
        case 'days':
          nextPostTime.setDate(nextPostTime.getDate() + value);
          break;
      }

      const { error } = await supabase.from("scheduled_posts").insert({
        user_id: user.id,
        template_id: selectedTemplate,
        interval_value: value,
        interval_unit: intervalUnit,
        next_post_time: nextPostTime.toISOString(),
        status: 'active',
      });

      if (error) throw error;

      toast.success("Post scheduled successfully!");
      setSelectedTemplate("");
      setIntervalValue("1");
      setIntervalUnit("hours");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error scheduling post");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Post ${newStatus === 'active' ? 'resumed' : 'paused'}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error updating status");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Schedule deleted");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error deleting schedule");
      console.error(error);
    }
  };

  const handleTestPost = async (scheduledPostId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user has credentials
      const { data: profile } = await supabase
        .from("profiles")
        .select("threads_app_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.threads_app_id) {
        toast.error("Please set up your Threads API credentials in Settings first!");
        return;
      }

      // Call the process function manually
      const { error } = await supabase.functions.invoke('process-scheduled-posts', {
        body: {}
      });

      if (error) throw error;

      toast.success("Processing post... Check History tab for results");
      setTimeout(loadData, 2000); // Refresh after 2 seconds
    } catch (error: any) {
      toast.error(error.message || "Error processing post");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (nextPostTime: string) => {
    const now = new Date();
    const nextPost = new Date(nextPostTime);
    const diffMs = nextPost.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Due now";
    
    return `in ${formatDistanceToNow(nextPost)}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule New Posts</CardTitle>
          <CardDescription>
            Set up automatic posting with AI-generated content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interval">Interval</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                value={intervalValue}
                onChange={(e) => setIntervalValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={intervalUnit} onValueChange={setIntervalUnit}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSchedule} disabled={loading} className="w-full">
            {loading ? "Scheduling..." : "Schedule Posts"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Schedules</h3>
        {scheduledPosts.length === 0 ? (
          <p className="text-muted-foreground">No scheduled posts yet.</p>
        ) : (
          scheduledPosts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{post.post_templates?.title}</CardTitle>
                    <CardDescription>
                      Every {post.interval_value} {post.interval_unit}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={post.status === 'active' ? 'default' : 'secondary'}>
                      {post.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTestPost(post.id)}
                      title="Test post now"
                      disabled={loading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleStatus(post.id, post.status)}
                    >
                      {post.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{getTimeRemaining(post.next_post_time)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.next_post_time).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};