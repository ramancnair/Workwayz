
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { 
  LayoutDashboard,
  KanbanSquare,
  ClipboardCheck,
  TestTube2,
  Settings,
  Flame,
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
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  
  const basePath = `/projects/${projectId}`;

  const devMenuItems = [
    {
      href: `${basePath}/dashboard/development`,
      label: "Dev Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `${basePath}/kanban`,
      label: "Kanban Board",
      icon: KanbanSquare,
    },
    {
      href: `${basePath}/backlog`,
      label: "Product Backlog",
      icon: Layers,
    },
     {
      href: `${basePath}/development-tasks`,
      label: "Development Tasks",
      icon: CheckSquare,
    },
  ];

  const testMenuItems = [
    {
      href: `${basePath}/dashboard/testing`,
      label: "Test Dashboard",
      icon: TestTube2,
    },
    {
      href: `${basePath}/testing/test-plan`,
      label: "Test Plan",
      icon: FileText,
    },
    {
      href: `${basePath}/testing/test-cases`,
      label: "Test Cases",
      icon: ClipboardCheck,
    },
    {
      href: `${basePath}/testing/bug-list`,
      label: "Bug List",
      icon: Bug,
    },
  ];

  const architectureMenuItems = [
    {
      href: `${basePath}/architecture`,
      label: "Impacted Systems",
      icon: Network,
    },
    {
      href: `${basePath}/architecture/initial-estimation`,
      label: "Initial Estimation",
      icon: FileText,
    },
  ];
  
  const releasesMenuItems = [
    {
      href: `${basePath}/releases`,
      label: "Project Releases",
      icon: Package,
    }
  ];

  const resourcesMenuItems = [
    {
      href: `${basePath}/resources`,
      label: "Employees",
      icon: Users,
    },
    {
      href: `${basePath}/project-gantt`,
      label: "Resource Gantt",
      icon: GanttChartSquare,
    },
    {
      href: `${basePath}/worklog`,
      label: "Worklog",
      icon: ClipboardList,
    },
     {
      href: `${basePath}/leave-tracker`,
      label: "Leave Tracker",
      icon: CalendarCheck,
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

  const holidayMenuItems = [
    {
      href: `${basePath}/holiday-calendar`,
      label: "Holiday Calendar",
      icon: CalendarDays,
    },
  ];

  const settingsMenuItems = [
    {
      href: `${basePath}/settings/board`,
      label: "Board Settings",
      icon: KanbanSquare,
    },
    {
      href: `${basePath}/settings/sprint`,
      label: "Sprint Settings",
      icon: Settings,
    }
  ];

  const isTestingPath = ['/dashboard/testing', '/testing/test-cases', '/testing/bug-list', '/testing/test-plan'].some(p => pathname.startsWith(basePath + p));
  const isArchitecturePath = pathname.startsWith(`${basePath}/architecture`);
  const isReleasesPath = pathname.startsWith(`${basePath}/releases`);
  const isResourcesPath = ['/resources', '/project-gantt', '/worklog', '/leave-tracker'].some(p => pathname.startsWith(basePath + p));
  const isGovernancePath = ['/raid-dashboard', '/risks', '/assumptions', '/issues', '/dependencies'].some(p => pathname.startsWith(basePath + p));
  const isHolidaysPath = pathname.startsWith(`${basePath}/holiday-calendar`);
  const isSettingsPath = pathname.startsWith(`${basePath}/settings`);

  const menuItems = isSettingsPath ? settingsMenuItems
    : isTestingPath ? testMenuItems 
    : isArchitecturePath ? architectureMenuItems
    : isReleasesPath ? releasesMenuItems
    : isResourcesPath ? resourcesMenuItems 
    : isGovernancePath ? governanceMenuItems 
    : isHolidaysPath ? holidayMenuItems 
    : devMenuItems;

  return (
    <>
      <SidebarHeader className="flex items-center justify-between p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2">
          <Flame className="w-8 h-8 text-primary" />
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
                  <ChevronLeft />
              </Button>
              <h1 className="text-xl font-semibold text-sidebar-foreground">ProjectFlow</h1>
          </div>
        </div>
      </SidebarHeader>
      <div className="p-4 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/pmdashboard">
                <SidebarMenuButton
                  tooltip="PM Dashboard"
                >
                  <Home />
                  <span>PM Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </div>
      <SidebarContent className="p-4 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
        <Separator className="my-2 bg-sidebar-border group-data-[collapsible=icon]:hidden" />
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={`${basePath}/settings`}>
              <SidebarMenuButton tooltip="Settings" isActive={pathname.startsWith(`${basePath}/settings`)}>
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 mt-4 px-2 group-data-[collapsible=icon]:hidden">
            <Avatar className="h-10 w-10">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="user avatar" />
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="font-semibold text-sm text-sidebar-foreground">Jane Doe</span>
                <span className="text-xs text-sidebar-foreground/70">janedoe@example.com</span>
            </div>
        </div>
      </SidebarFooter>
    </>
  );
}
