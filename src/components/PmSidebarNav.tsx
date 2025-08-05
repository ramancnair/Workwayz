
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Flame,
  ChevronLeft,
  FolderKanban,
  Building2,
  Briefcase,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type PmSidebarNavProps = {
  activeTab: 'portfolios' | 'projects' | 'users' | 'trash';
};

export function PmSidebarNav({ activeTab }: PmSidebarNavProps) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  
  const allMenuItems = [
    {
      id: 'portfolios',
      href: `/portfolios`,
      label: "Manage Portfolios",
      icon: Briefcase,
      group: 'portfolio'
    },
    {
      id: 'projects',
      href: `/pmdashboard`,
      label: "Projects Dashboard",
      icon: FolderKanban,
      group: 'projects'
    },
    {
      id: 'users',
      href: `/users`,
      label: "User List",
      icon: Building2,
      group: 'users'
    },
     {
      id: 'utilization',
      href: `/utilization`,
      label: "Utilization",
      icon: Users,
      group: 'users'
    },
  ];

  const getGroupForTab = (tab: PmSidebarNavProps['activeTab']) => {
    switch (tab) {
      case 'portfolios':
      case 'trash':
        return 'portfolio';
      case 'projects':
        return 'projects';
      case 'users':
        return 'users';
      default:
        return 'portfolio';
    }
  }

  const activeGroup = getGroupForTab(activeTab);
  const menuItems = allMenuItems.filter(item => item.group === activeGroup);

  return (
    <>
      <SidebarHeader className="flex items-center gap-2 p-4 group-data-[collapsible=icon]:justify-center">
        <Flame className="w-8 h-8 text-primary" />
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
                <ChevronLeft />
            </Button>
            <h1 className="text-xl font-semibold text-sidebar-foreground">ProjectFlow</h1>
        </div>
      </SidebarHeader>
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
            <Link href="/trash">
              <SidebarMenuButton tooltip="Trash" isActive={pathname.startsWith(`/trash`)}>
                <Trash2 />
                <span>Trash</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/portfolio-settings">
              <SidebarMenuButton tooltip="Portfolio Settings" isActive={pathname.startsWith(`/portfolio-settings`)}>
                <Settings />
                <span>Portfolio Settings</span>
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
