import { LayoutDashboard, FileText, Calendar, History, Settings, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, value: "dashboard" },
  { title: "Templates", url: "/app?tab=templates", icon: FileText, value: "templates" },
  { title: "Schedule", url: "/app?tab=schedule", icon: Calendar, value: "schedule" },
  { title: "History", url: "/app?tab=history", icon: History, value: "history" },
  { title: "Settings", url: "/app?tab=settings", icon: Settings, value: "settings" },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "px-0 justify-center" : ""}>
            {isCollapsed ? "SS" : "Splashify Social"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = activeTab === item.value;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      onClick={() => onTabChange(item.value)}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <button className="w-full">
                        <item.icon className={isCollapsed ? "mx-auto" : ""} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
