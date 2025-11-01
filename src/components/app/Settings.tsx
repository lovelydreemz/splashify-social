import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
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

  const handleTestConnection = async () => {
    if (!threadsAppId || !hasExistingCredentials) {
      toast.error("Please save your credentials first");
      return;
    }

    setTesting(true);
    setConnectionStatus('idle');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the stored credentials
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("threads_access_token")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile?.threads_access_token) {
        throw new Error("No access token found. Please save your settings first.");
      }

      // Test the connection by making a simple API call to Threads
      const response = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${profile.threads_access_token}`
      );

      if (!response.ok) {
        throw new Error("Failed to connect to Threads API. Please check your credentials.");
      }

      const data = await response.json();
      
      if (data.id) {
        setConnectionStatus('success');
        toast.success(`Successfully connected! Username: @${data.username || 'N/A'}`);
      } else {
        throw new Error("Invalid response from Threads API");
      }
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error(error.message || "Connection test failed");
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setConnectionStatus('idle');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate inputs
      if (!threadsAppId.trim()) {
        throw new Error("App ID is required");
      }

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
        .upsert(updateData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Threads API Credentials</CardTitle>
          <CardDescription>
            Configure your Threads API credentials to enable automated posting
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

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Credentials"
            )}
          </Button>
          
          {hasExistingCredentials && (
            <Button
              onClick={handleTestConnection}
              disabled={testing || !threadsAppId}
              variant="outline"
              className="flex-1"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : connectionStatus === 'success' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Connected
                </>
              ) : connectionStatus === 'error' ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
                  Test Failed
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
          )}
        </div>

        {connectionStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-700 dark:text-green-300">
              API connection verified successfully!
            </p>
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>How to Get Threads API Credentials</CardTitle>
        <CardDescription>
          Follow these steps to obtain your Threads API credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta for Developers</a></li>
          <li>Create or select your app</li>
          <li>Add "Threads API" product to your app</li>
          <li>Generate a long-lived access token</li>
          <li>Copy your App ID, Access Token, and App Secret</li>
          <li>Paste them in the form above and save</li>
        </ol>
      </CardContent>
    </Card>
  </div>
  );
};