import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Threads states
  const [threadsAppId, setThreadsAppId] = useState("");
  const [threadsAccessToken, setThreadsAccessToken] = useState("");
  const [threadsAppSecret, setThreadsAppSecret] = useState("");
  const [hasExistingThreads, setHasExistingThreads] = useState(false);

  // LinkedIn states
  const [linkedinAccessToken, setLinkedinAccessToken] = useState("");
  const [hasExistingLinkedIn, setHasExistingLinkedIn] = useState(false);

  // Instagram states
  const [instagramUserId, setInstagramUserId] = useState("");
  const [instagramAccessToken, setInstagramAccessToken] = useState("");
  const [hasExistingInstagram, setHasExistingInstagram] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("threads_app_id, linkedin_access_token, instagram_user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setThreadsAppId(data.threads_app_id || "");
        setHasExistingThreads(!!data.threads_app_id);
        setHasExistingLinkedIn(!!data.linkedin_access_token);
        setInstagramUserId(data.instagram_user_id || "");
        setHasExistingInstagram(!!data.instagram_user_id);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleTestThreadsConnection = async () => {
    if (!threadsAppId || !hasExistingThreads) {
      toast.error("Please save your credentials first");
      return;
    }

    setTesting(true);
    setConnectionStatus('idle');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("threads_access_token")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile?.threads_access_token) {
        throw new Error("No access token found. Please save your settings first.");
      }

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

  const handleSaveThreads = async () => {
    setLoading(true);
    setConnectionStatus('idle');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!threadsAppId.trim()) {
        throw new Error("App ID is required");
      }

      const updateData: any = {
        user_id: user.id,
        threads_app_id: threadsAppId,
      };

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

      toast.success("Threads credentials saved successfully!");
      setHasExistingThreads(true);
      setThreadsAccessToken("");
      setThreadsAppSecret("");
    } catch (error: any) {
      toast.error(error.message || "Error saving settings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLinkedIn = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!linkedinAccessToken.trim()) {
        throw new Error("Access token is required");
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          linkedin_access_token: linkedinAccessToken,
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      toast.success("LinkedIn credentials saved successfully!");
      setHasExistingLinkedIn(true);
      setLinkedinAccessToken("");
    } catch (error: any) {
      toast.error(error.message || "Error saving credentials");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInstagram = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!instagramUserId.trim() || !instagramAccessToken.trim()) {
        throw new Error("Both User ID and Access Token are required");
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          instagram_user_id: instagramUserId,
          instagram_access_token: instagramAccessToken,
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      toast.success("Instagram credentials saved successfully!");
      setHasExistingInstagram(true);
      setInstagramAccessToken("");
    } catch (error: any) {
      toast.error(error.message || "Error saving credentials");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="threads" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="threads">Threads</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
        </TabsList>

        <TabsContent value="threads" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Threads API Credentials</CardTitle>
              <CardDescription>
                Configure your Threads API credentials to enable automated posting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="threadsAppId">Threads App ID</Label>
                <Input
                  id="threadsAppId"
                  value={threadsAppId}
                  onChange={(e) => setThreadsAppId(e.target.value)}
                  placeholder="Enter your Threads App ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threadsAccessToken">Access Token</Label>
                <Input
                  id="threadsAccessToken"
                  type="password"
                  value={threadsAccessToken}
                  onChange={(e) => setThreadsAccessToken(e.target.value)}
                  placeholder={hasExistingThreads ? "••••••••  (enter new to update)" : "Enter your access token"}
                />
                {hasExistingThreads && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing token
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="threadsAppSecret">App Secret</Label>
                <Input
                  id="threadsAppSecret"
                  type="password"
                  value={threadsAppSecret}
                  onChange={(e) => setThreadsAppSecret(e.target.value)}
                  placeholder={hasExistingThreads ? "••••••••  (enter new to update)" : "Enter your app secret"}
                />
                {hasExistingThreads && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing secret
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveThreads} disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Credentials"
                  )}
                </Button>
                
                {hasExistingThreads && (
                  <Button
                    onClick={handleTestThreadsConnection}
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
        </TabsContent>

        <TabsContent value="linkedin" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn API Credentials</CardTitle>
              <CardDescription>
                Configure your LinkedIn access token to enable posting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedinAccessToken">Access Token</Label>
                <Input
                  id="linkedinAccessToken"
                  type="password"
                  value={linkedinAccessToken}
                  onChange={(e) => setLinkedinAccessToken(e.target.value)}
                  placeholder={hasExistingLinkedIn ? "••••••••  (enter new to update)" : "Enter your access token"}
                />
                {hasExistingLinkedIn && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing token
                  </p>
                )}
              </div>

              <Button onClick={handleSaveLinkedIn} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Credentials"
                )}
              </Button>

              {hasExistingLinkedIn && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    LinkedIn credentials configured
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Get LinkedIn API Credentials</CardTitle>
              <CardDescription>
                Follow these steps to obtain your LinkedIn access token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Go to <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn Developer Portal</a></li>
                <li>Create or select your app</li>
                <li>Request access to the "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect" products</li>
                <li>Go to the Auth tab and generate an OAuth 2.0 access token</li>
                <li>Ensure the token has the "w_member_social" and "openid" scopes</li>
                <li>Copy your access token and paste it above</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instagram" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Instagram API Credentials</CardTitle>
              <CardDescription>
                Configure your Instagram credentials to enable posting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagramUserId">Instagram User ID</Label>
                <Input
                  id="instagramUserId"
                  value={instagramUserId}
                  onChange={(e) => setInstagramUserId(e.target.value)}
                  placeholder="Enter your Instagram User ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagramAccessToken">Access Token</Label>
                <Input
                  id="instagramAccessToken"
                  type="password"
                  value={instagramAccessToken}
                  onChange={(e) => setInstagramAccessToken(e.target.value)}
                  placeholder={hasExistingInstagram ? "••••••••  (enter new to update)" : "Enter your access token"}
                />
                {hasExistingInstagram && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing token
                  </p>
                )}
              </div>

              <Button onClick={handleSaveInstagram} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Credentials"
                )}
              </Button>

              {hasExistingInstagram && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Instagram credentials configured
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Get Instagram API Credentials</CardTitle>
              <CardDescription>
                Follow these steps to obtain your Instagram credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta for Developers</a></li>
                <li>Create or select your app</li>
                <li>Add the "Instagram Graph API" product</li>
                <li>Connect your Instagram Business or Creator account</li>
                <li>Get your Instagram Business Account ID (this is your User ID)</li>
                <li>Generate an access token with "instagram_content_publish" permission</li>
                <li>Copy your User ID and Access Token and paste them above</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
