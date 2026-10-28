
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { getPageNameForRoute } from "@/lib/permissions";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  KanbanSquare,
  ClipboardCheck,
  TestTube2,
  Settings,
  Waves,
  ChevronLeft,
  Layers,
  Users,
  Bug,
  ShieldAlert,
  NotebookText,
  AlertCircle,
  Link2,
  CheckSquare,
  CalendarDays,
  GanttChartSquare,
  ClipboardList,
  Network,
  CalendarCheck,
  Package,
  Home,
  FileText,
  PlayCircle,
  Server,
  ChevronsUpDown,
  ListTree,
  Trash2,
  DollarSign,
  Component,
  Briefcase as PmoIcon,
  File as DocumentsIcon,
  CreditCard as BillingIcon,
  HeartPulse,
  Hourglass,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useProject } from "@/context/ProjectContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { unsubscribeAllListeners } from "@/lib/db-provider";
import { getEffectiveRoute } from "@/lib/route-utils";

export function SidebarNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { project } = useProject();
  const [user, setUser] = useState<{ name: string; email: string; avatar: string; accessLevel?: string; role?: string }>({ name: '', email: '', avatar: '' });
  const [routeTick, setRouteTick] = useState(0);

  useEffect(() => {
    const handleRouteChange = () => setRouteTick((t) => t + 1);
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('workwayz-route-change', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('workwayz-route-change', handleRouteChange);
    };
  }, []);

  const effectivePath = getEffectiveRoute(pathname);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('projectflow_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse user from local storage", e);
        }
      }
    };
    loadUser();
    window.addEventListener('user-profile-updated', loadUser);
    return () => window.removeEventListener('user-profile-updated', loadUser);
  }, []);

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        (window as any).__isLoggingOut = true;
      }
      unsubscribeAllListeners();

      // Read current session before clearing so we know which provider to terminate
      const userStr = localStorage.getItem('projectflow_user');
      const sessionProvider = userStr ? (() => { try { return JSON.parse(userStr).authProvider; } catch { return null; } })() : null;

      // Always clear local session first
      localStorage.removeItem('projectflow_user');
      localStorage.removeItem('projectflow_last_activity');
      sessionStorage.removeItem('workwayz_real_route');
      document.cookie = "projectflow_session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      if (sessionProvider === 'supabase') {
        try {
          const { supabase } = await import('@/lib/supabase');
          await supabase?.auth.signOut();
        } catch (supaErr) {
          console.warn('[Logout] Supabase signOut failed:', supaErr);
        }
      } else if (auth) {
        // Firebase signOut
        await signOut(auth);
      }

      window.location.href = '/';
    } catch (error) {
      console.error("Error logging out:", error);
      // Even on error, ensure local session is cleared and redirect
      localStorage.removeItem('projectflow_user');
      localStorage.removeItem('projectflow_last_activity');
      sessionStorage.removeItem('workwayz_real_route');
      document.cookie = "projectflow_session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = '/';
    }
  };


  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const basePath = `/projects/${projectId}`;

  const devMenuItems = [
    {
      href: `${basePath}/development/dashboard`,
      label: "Development Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `${basePath}/development/backlog`,
      label: "Product Backlog",
      icon: Layers,
    },
    {
      href: `${basePath}/development/development-tasks`,
      label: "Sub-Tasks",
      icon: Component,
    },
    {
      href: `${basePath}/development/grooming`,
      label: "Grooming",
      icon: ChevronsUpDown,
    },
    {
      href: `${basePath}/development/kanban`,
      label: "Kanban Board",
      icon: KanbanSquare,
    },
  ];

  const testMenuItems = [
    {
      href: `${basePath}/testing/dashboard`,
      label: "Test Dashboard",
      icon: TestTube2,
    },
    {
      href: `${basePath}/testing/test-cases`,
      label: "Test Cases",
      icon: ClipboardCheck,
    },
    {
      href: `${basePath}/testing/test-cycle`,
      label: "Test Cycles",
      icon: FileText,
    },
    {
      href: `${basePath}/testing/test-execution`,
      label: "Test Executions",
      icon: PlayCircle,
    },
    {
      href: `${basePath}/testing/defects`,
      label: "Defects",
      icon: Bug,
    },
    {
      href: `${basePath}/testing/defect-tracker`,
      label: "Defect Tracker",
      icon: Bug,
    },
  ];

  const projectMenuItems = [
    {
      href: `${basePath}/project-details/project-status`,
      label: "Project Status",
      icon: ClipboardList,
    },
    {
      href: `${basePath}/project-details/pm-dashboard`,
      label: "PM Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `${basePath}/project-details/fp-pm-dash`,
      label: "Project PromptBoard",
      icon: Sparkles,
    },
    {
      href: `${basePath}/project-details/specifications`,
      label: "Specifications",
      icon: Server,
    },
  ];

  const initialEstimationMenuItems = [
    {
      href: `${basePath}/initial-estimation/specifications`,
      label: "Specifications",
      icon: DollarSign,
    },
    {
      href: `${basePath}/initial-estimation/project-status`,
      label: "Project Status",
      icon: ClipboardList,
    },
  ];

  const releasesMenuItems = [
    {
      href: `${basePath}/releases/project-releases`,
      label: "Project Releases",
      icon: Package,
    }
  ];

  const resourcesMenuItems = [
    {
      href: `${basePath}/resources/project-resources`,
      label: "Project Resources",
      icon: Users,
    },
    {
      href: `${basePath}/resources/worklog`,
      label: "Worklog",
      icon: ClipboardList,
    },
    {
      href: `${basePath}/resources/resource-workload`,
      label: "Resource Workload",
      icon: GanttChartSquare,
    },
  ];

  const governanceMenuItems = [
    {
      href: `${basePath}/raid-dashboard`,
      label: "RAID Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `${basePath}/risks`,
      label: "Risks",
      icon: ShieldAlert,
    },
    {
      href: `${basePath}/assumptions`,
      label: "Assumptions",
      icon: NotebookText,
    },
    {
      href: `${basePath}/issues`,
      label: "Issues",
      icon: AlertCircle,
    },
    {
      href: `${basePath}/dependencies`,
      label: "Dependencies",
      icon: Link2,
    },
  ];

  const holidaysMenuItems = [
    {
      href: `${basePath}/holidays`,
      label: "Company Holidays",
      icon: CalendarDays,
    },
    {
      href: `${basePath}/holidays/leave-calendar`,
      label: "Leave Calendar",
      icon: CalendarDays,
    },
  ];

  const pmoMenuItems = [
    {
      href: `${basePath}/pmo/documents`,
      label: "Documents",
      icon: DocumentsIcon,
    },
    ...(project?.pricingModel !== 'T&M' ? [
      {
        href: `${basePath}/pmo/fb-billing`,
        label: "FB Billing",
        icon: DollarSign,
      },
      {
        href: `${basePath}/pmo/fb-payment-milestones`,
        label: "FB Payment Milestones",
        icon: BillingIcon,
      },
    ] : []),
    ...(project?.pricingModel !== 'Fixed Bid' ? [
      {
        href: `${basePath}/pmo/tnm-billing`,
        label: "TnM Billing",
        icon: DollarSign,
      },
      {
        href: `${basePath}/pmo/tnm-payment-milestones`,
        label: "TnM Payment Milestones",
        icon: BillingIcon,
      },
    ] : []),
    {
      href: `${basePath}/pmo/business-continuity`,
      label: "Business Continuity",
      icon: HeartPulse,
    },
  ];

  const settingsMenuItems = [
    {
      href: `${basePath}/project-settings/board`,
      label: "Board Settings",
      icon: KanbanSquare,
    },
    {
      href: `${basePath}/project-settings/sprint`,
      label: "Sprint Settings",
      icon: Settings,
    },
    {
      href: `${basePath}/project-settings/effort`,
      label: "Effort Settings",
      icon: Hourglass,
    }
  ];

  const trashMenuItems = [
    {
      href: `${basePath}/project-trash`,
      label: "Project Trash",
      icon: Trash2,
    },
  ];

  const isTestingPath = effectivePath.startsWith(`${basePath}/testing`);
  const isProjectPath = effectivePath.startsWith(`${basePath}/project-details`);
  const isInitialEstimationPath = effectivePath.startsWith(`${basePath}/initial-estimation`);
  const isReleasesPath = effectivePath.startsWith(`${basePath}/releases`);
  const isResourcesPath = effectivePath.startsWith(`${basePath}/resources`);
  const isGovernancePath = ['/raid-dashboard', '/risks', '/assumptions', '/issues', '/dependencies'].some(p => effectivePath.startsWith(basePath + p));
  const isSettingsPath = effectivePath.startsWith(`${basePath}/project-settings`) || effectivePath.startsWith(`${basePath}/settings`);
  const isTrashPath = effectivePath.startsWith(`${basePath}/project-trash`) || effectivePath.startsWith(`${basePath}/trash`);
  const isHolidaysPath = effectivePath.startsWith(`${basePath}/holidays`);
  const isPmoPath = ['/pmo/documents', '/pmo/fb-payment-milestones', '/pmo/tnm-payment-milestones', '/pmo/business-continuity', '/pmo/fb-billing', '/pmo/tnm-billing'].some(p => effectivePath.startsWith(basePath + p));
  const isDevelopmentPath = effectivePath.startsWith(`${basePath}/development`);


  const { hasAccess } = usePermissions();

  const rawMenuItems = isTrashPath ? trashMenuItems
    : isSettingsPath ? settingsMenuItems
      : isTestingPath ? testMenuItems
        : isProjectPath ? projectMenuItems
          : isInitialEstimationPath ? initialEstimationMenuItems
            : isReleasesPath ? releasesMenuItems
              : isResourcesPath ? resourcesMenuItems
                : isGovernancePath ? governanceMenuItems
                  : isHolidaysPath ? holidaysMenuItems
                    : isPmoPath ? pmoMenuItems
                      : isDevelopmentPath ? devMenuItems
                        : devMenuItems;

  const menuItems = rawMenuItems.filter(item => {
    const pageName = getPageNameForRoute(item.href);
    return hasAccess(pageName || item.label);
  });

  const isItemActive = (href: string) => {
    if (!href || href === '#') return false;
    const cleanHref = href.replace(/\/$/, '');
    const cleanPath = effectivePath.replace(/\/$/, '');
    return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`);
  };

  return (
    <>
      <SidebarHeader className="p-2 transition-all duration-300">
        <div className="flex flex-col gap-3">
          <div className="flex items-center h-10 overflow-hidden">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm ring-1 ring-white/10">
              <img
                src="/workwayz-icon.png"
                alt="Workwayz"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="ml-3 text-xl font-bold tracking-tight text-sidebar-foreground transition-all duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap">
              Workwayz
            </h1>
            <Button variant="ghost" size="icon" className="md:hidden ml-auto shrink-0 transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 overflow-hidden" onClick={toggleSidebar}>
              <ChevronLeft />
            </Button>
          </div>
          <div className="flex items-center ml-[2px] gap-2">
            <SidebarTrigger className="h-7 w-7 rounded-sm border bg-background shadow-sm hover:bg-sidebar-accent hidden md:flex shrink-0" />
            <div className="ml-auto flex transition-opacity duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </SidebarHeader>
      <div className="p-2 transition-all duration-300">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="My Projects">
              <Link href="/my-projects">
                <Home />
                <span>My Projects</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
      <SidebarContent className="p-2 transition-all duration-300">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isItemActive(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 transition-all duration-300">

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center mt-2 h-12 overflow-hidden cursor-pointer hover:bg-sidebar-accent rounded-md p-1.5 -mx-1 transition-colors">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">{getUserInitials(null, null, user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col ml-3 transition-all duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap min-w-0 leading-tight">
                <span className="font-semibold text-sm text-sidebar-foreground truncate">{user.name || 'User'}</span>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">{user.accessLevel || user.role || 'Team Member'}</span>
                <span className="text-[11px] text-muted-foreground truncate">{user.email || ''}</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/my-account">
                <Users className="mr-2 h-4 w-4" />
                <span>Profile & Account</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
  );
}
