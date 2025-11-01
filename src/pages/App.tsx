import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { Dashboard } from "@/components/app/Dashboard";
import { Settings } from "@/components/app/Settings";
import { Templates } from "@/components/app/Templates";
import { Schedule } from "@/components/app/Schedule";
import { History } from "@/components/app/History";

const App = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const activeTab = searchParams.get("tab") || "dashboard";

  useEffect(() => {
    checkAuth();

    // Check if user is new (first time visiting the app)
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    // Listen for tab change events from Dashboard
    const handleTabChange = (event: any) => {
      handleTabChange(event.detail);
    };
    window.addEventListener('changeTab', handleTabChange);

    return () => {
      window.removeEventListener('changeTab', handleTabChange);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setLoading(false);
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/auth");
    }
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Error signing out");
      console.error(error);
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <OnboardingWizard open={showOnboarding} onComplete={handleOnboardingComplete} />
      
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
          
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-16 items-center gap-4 px-6">
                <SidebarTrigger />
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <ProfileDropdown 
                    onSignOut={handleSignOut}
                    onSettingsClick={() => handleTabChange("settings")}
                  />
                </div>
              </div>
            </header>

            <main className="flex-1 p-6">
              <div className="mx-auto max-w-7xl">
                {activeTab === "dashboard" && <Dashboard />}
                {activeTab === "templates" && <Templates />}
                {activeTab === "schedule" && <Schedule />}
                {activeTab === "history" && <History />}
                {activeTab === "settings" && <Settings />}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
};

export default App;