
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
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  const devMenuItems = [
    {
      href: "/dashboard/development",
      label: "Dev Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/kanban",
      label: "Kanban Board",
      icon: KanbanSquare,
    },
    {
      href: "/backlog",
      label: "Product Backlog",
      icon: Layers,
    },
  ];

  const testMenuItems = [
    {
      href: "/dashboard/testing",
      label: "Test Dashboard",
      icon: TestTube2,
    },
    {
      href: "/testing/test-cases",
      label: "Test Cases",
      icon: ClipboardCheck,
    },
    {
      href: "/testing/bug-list",
      label: "Bug List",
      icon: Bug,
    },
  ];

  const resourcesMenuItems = [
    {
      href: "/resources",
      label: "Employees",
      icon: Users,
    },
  ];

  const governanceMenuItems = [
    {
      href: "/risks",
      label: "Risks",
      icon: ShieldAlert,
    },
    {
      href: "/assumptions",
      label: "Assumptions",
      icon: NotebookText,
    },
    {
      href: "/issues",
      label: "Issues",
      icon: AlertCircle,
    },
    {
      href: "/dependencies",
      label: "Dependencies",
      icon: Link2,
    },
  ];

  const isTestingPath = ['/dashboard/testing', '/testing/test-cases', '/testing/bug-list'].some(p => pathname.startsWith(p));
  const isResourcesPath = pathname.startsWith('/resources');
  const isGovernancePath = ['/risks', '/assumptions', '/issues', '/dependencies'].some(p => pathname.startsWith(p));
  
  const menuItems = isTestingPath ? testMenuItems : isResourcesPath ? resourcesMenuItems : isGovernancePath ? governanceMenuItems : devMenuItems;

  return (
    <>
      <SidebarHeader className="flex items-center justify-between p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
                <ChevronLeft />
            </Button>
            <Flame className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-semibold text-sidebar-foreground">ProjectFlow</h1>
        </div>
        <SidebarTrigger className="hidden md:flex" />
      </SidebarHeader>
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
              <SidebarMenuButton tooltip="Settings">
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
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
