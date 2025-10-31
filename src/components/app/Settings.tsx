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
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Only fetch App ID - never retrieve sensitive credentials
      const { data, error } = await supabase
        .from("profiles")
        .select("threads_app_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setThreadsAppId(data.threads_app_id || "");
        // Check if credentials exist (app_id is a proxy for having setup)
        setHasExistingCredentials(!!data.threads_app_id);
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

      // Build update object - only include fields that have values
      const updateData: any = {
        user_id: user.id,
        threads_app_id: threadsAppId,
      };

      // Only update credentials if user entered new values
      if (threadsAccessToken.trim()) {
        updateData.threads_access_token = threadsAccessToken;
      }
      if (threadsAppSecret.trim()) {
        updateData.threads_app_secret = threadsAppSecret;
      }

      const { error } = await supabase
        .from("profiles")
        .upsert(updateData);

      if (error) throw error;

      toast.success("Settings saved successfully!");
      setHasExistingCredentials(true);
      // Clear the input fields after successful save
      setThreadsAccessToken("");
      setThreadsAppSecret("");
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
            placeholder={hasExistingCredentials ? "••••••••  (enter new to update)" : "Enter your access token"}
          />
          {hasExistingCredentials && (
            <p className="text-xs text-muted-foreground">
              Leave blank to keep existing token
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="appSecret">App Secret</Label>
          <Input
            id="appSecret"
            type="password"
            value={threadsAppSecret}
            onChange={(e) => setThreadsAppSecret(e.target.value)}
            placeholder={hasExistingCredentials ? "••••••••  (enter new to update)" : "Enter your app secret"}
          />
          {hasExistingCredentials && (
            <p className="text-xs text-muted-foreground">
              Leave blank to keep existing secret
            </p>
          )}
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};