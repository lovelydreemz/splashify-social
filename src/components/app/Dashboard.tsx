import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, TrendingUp, Clock, CheckCircle2, XCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Stats {
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  activeSchedules: number;
  totalTemplates: number;
  nextPostTime: string | null;
  nextPostTemplate: string | null;
}

export const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load all stats in parallel
      const [historyResult, scheduledResult, templatesResult] = await Promise.all([
        supabase.from("post_history").select("status", { count: "exact" }).eq("user_id", user.id),
        supabase.from("scheduled_posts").select("*, post_templates(title)", { count: "exact" }).eq("user_id", user.id).eq("status", "active").order("next_post_time", { ascending: true }).limit(1),
        supabase.from("post_templates").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);

      const successfulPosts = historyResult.data?.filter(p => p.status === "success").length || 0;
      const failedPosts = historyResult.data?.filter(p => p.status === "failed").length || 0;
      const nextSchedule = scheduledResult.data?.[0];

      setStats({
        totalPosts: historyResult.count || 0,
        successfulPosts,
        failedPosts,
        activeSchedules: scheduledResult.count || 0,
        totalTemplates: templatesResult.count || 0,
        nextPostTime: nextSchedule?.next_post_time || null,
        nextPostTemplate: nextSchedule?.post_templates?.title || null,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSuccessRate = () => {
    if (!stats || stats.totalPosts === 0) return 0;
    return Math.round((stats.successfulPosts / stats.totalPosts) * 100);
  };

  const getTimeUntilNext = () => {
    if (!stats?.nextPostTime) return null;
    const now = new Date();
    const next = new Date(stats.nextPostTime);
    const diff = next.getTime() - now.getTime();
    
    if (diff < 0) return "Processing...";
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalPosts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.successfulPosts || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getSuccessRate()}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.failedPosts || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeSchedules || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalTemplates || 0} templates
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Post</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.nextPostTime ? getTimeUntilNext() : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {stats?.nextPostTemplate || "No scheduled posts"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="w-full" onClick={() => {
            const event = new CustomEvent('changeTab', { detail: 'templates' });
            window.dispatchEvent(event);
          }}>
            Create Template
          </Button>
          <Button variant="outline" className="w-full" onClick={() => {
            const event = new CustomEvent('changeTab', { detail: 'schedule' });
            window.dispatchEvent(event);
          }}>
            Schedule Post
          </Button>
          <Button variant="outline" className="w-full" onClick={() => {
            const event = new CustomEvent('changeTab', { detail: 'history' });
            window.dispatchEvent(event);
          }}>
            View History
          </Button>
          <Button variant="outline" className="w-full" onClick={() => {
            const event = new CustomEvent('changeTab', { detail: 'settings' });
            window.dispatchEvent(event);
          }}>
            Configure API
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest posts and schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentActivity />
        </CardContent>
      </Card>
    </div>
  );
};

const RecentActivity = () => {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      const { data, error } = await supabase
        .from("post_history")
        .select("*")
        .order("posted_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setActivity(data || []);
    } catch (error) {
      console.error("Error loading activity:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No recent activity</p>
        <p className="text-sm mt-1">Your posts will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activity.map((item) => (
        <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
          <div className={`p-2 rounded-full ${item.status === 'success' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
            {item.status === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-300" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm line-clamp-2">{item.content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(item.posted_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
