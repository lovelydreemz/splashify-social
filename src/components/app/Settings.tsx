import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [threadsAppId, setThreadsAppId] = useState("");
  const [threadsAccessToken, setThreadsAccessToken] = useState("");
  const [threadsAppSecret, setThreadsAppSecret] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("threads_app_id, threads_access_token, threads_app_secret")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setThreadsAppId(data.threads_app_id || "");
        setThreadsAccessToken(data.threads_access_token || "");
        setThreadsAppSecret(data.threads_app_secret || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          threads_app_id: threadsAppId,
          threads_access_token: threadsAccessToken,
          threads_app_secret: threadsAppSecret,
        });

      if (error) throw error;

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Error saving settings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Threads API Settings</CardTitle>
        <CardDescription>
          Configure your Threads API credentials to enable posting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="appId">Threads App ID</Label>
          <Input
            id="appId"
            value={threadsAppId}
            onChange={(e) => setThreadsAppId(e.target.value)}
            placeholder="Enter your Threads App ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accessToken">Access Token</Label>
          <Input
            id="accessToken"
            type="password"
            value={threadsAccessToken}
            onChange={(e) => setThreadsAccessToken(e.target.value)}
            placeholder="Enter your access token"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="appSecret">App Secret</Label>
          <Input
            id="appSecret"
            type="password"
            value={threadsAppSecret}
            onChange={(e) => setThreadsAppSecret(e.target.value)}
            placeholder="Enter your app secret"
          />
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};