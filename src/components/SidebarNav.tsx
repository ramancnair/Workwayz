
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
  Server,
  ChevronsUpDown,
  Trash2,
  DollarSign,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  
  const basePath = `/projects/${projectId}`;

  const devMenuItems = [
    {
      href: `${basePath}/development/dashboard`,
      label: "Dev Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `${basePath}/development/kanban`,
      label: "Kanban Board",
      icon: KanbanSquare,
    },
    {
        href: `${basePath}/development/grooming`,
        label: "Grooming",
        icon: ChevronsUpDown,
    },
    {
      href: `${basePath}/development/backlog`,
      label: "Product Backlog",
      icon: Layers,
    },
     {
      href: `${basePath}/development/development-tasks`,
      label: "Development Tasks",
      icon: CheckSquare,
    },
  ];

  const testMenuItems = [
    {
      href: `${basePath}/testing/dashboard`,
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

  const projectMenuItems = [
    {
      href: `${basePath}/project-details/project-dashboard`,
      label: "Project Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `${basePath}/project-details/environments`,
      label: "Architecture",
      icon: Server,
    },
  ];

  const initialEstimationMenuItems = [
     {
      href: `${basePath}/initial-estimation/ballpark`,
      label: "Ballpark",
      icon: DollarSign,
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
      href: `${basePath}/resources/resource-gantt`,
      label: "Resource Gantt",
      icon: GanttChartSquare,
    },
    {
      href: `${basePath}/resources/worklog`,
      label: "Worklog",
      icon: ClipboardList,
    },
     {
      href: `${basePath}/resources/leave-tracker`,
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
  
  const holidaysMenuItems = [
      {
          href: `${basePath}/holidays`,
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

  const isTestingPath = ['/testing/dashboard', '/testing/test-cases', '/testing/bug-list', '/testing/test-plan'].some(p => pathname.startsWith(basePath + p));
  const isProjectPath = pathname.startsWith(`${basePath}/project-details`);
  const isInitialEstimationPath = pathname.startsWith(`${basePath}/initial-estimation`);
  const isReleasesPath = pathname.startsWith(`${basePath}/releases`);
  const isResourcesPath = pathname.startsWith(`${basePath}/resources`);
  const isGovernancePath = ['/raid-dashboard', '/risks', '/assumptions', '/issues', '/dependencies'].some(p => pathname.startsWith(basePath + p));
  const isSettingsPath = pathname.startsWith(`${basePath}/settings`);
  const isHolidaysPath = pathname.startsWith(`${basePath}/holidays`);
  const isDevelopmentPath = pathname.startsWith(`${basePath}/development`);


  const menuItems = isSettingsPath ? settingsMenuItems
    : isTestingPath ? testMenuItems 
    : isProjectPath ? projectMenuItems
    : isInitialEstimationPath ? initialEstimationMenuItems
    : isReleasesPath ? releasesMenuItems
    : isResourcesPath ? resourcesMenuItems 
    : isGovernancePath ? governanceMenuItems 
    : isHolidaysPath ? holidaysMenuItems 
    : isDevelopmentPath ? devMenuItems
    : devMenuItems;

  return (
    <>
      <SidebarHeader className="flex items-center justify-between p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2">
          <Waves className="w-8 h-8 text-primary" />
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
              <Link href="/project-home">
                <SidebarMenuButton
                  tooltip="Project Home"
                >
                  <Home />
                  <span>Project Home</span>
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
                  isActive={pathname.startsWith(item.href)}
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
            <Link href={`${basePath}/trash`}>
              <SidebarMenuButton tooltip="Project Trash" isActive={pathname.startsWith(`${basePath}/trash`)}>
                <Trash2 />
                <span>Project Trash</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href={`${basePath}/settings`}>
              <SidebarMenuButton tooltip="Project Settings" isActive={pathname.startsWith(`${basePath}/settings`)}>
                <Settings />
                <span>Project Settings</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 mt-4 px-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-10 w-10">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="user avatar" />
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sm text-sidebar-foreground">Jane Doe</span>
                <span className="text-xs text-sidebar-foreground/70">janedoe@example.com</span>
            </div>
        </div>
      </SidebarFooter>
    </>
  );
}
