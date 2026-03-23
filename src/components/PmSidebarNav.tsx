
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
  Waves,
  ChevronLeft,
  FolderKanban,
  Building2,
  Briefcase,
  Settings,
  Trash2,
  Users,
  CalendarDays,
  CreditCard,
  DollarSign,
  LayoutDashboard,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type PmSidebarNavProps = {
  activeTab: 'portfolios' | 'projects' | 'users' | 'trash' | 'holidays' | 'billing';
};

export function PmSidebarNav({ activeTab }: PmSidebarNavProps) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  
  const allMenuItems = [
    {
      id: 'portfolios',
      href: `/portfolios`,
      label: "Portfolios",
      icon: Briefcase,
      group: 'portfolio'
    },
    {
      id: 'projects',
      href: `/project-home`,
      label: "Project Home",
      icon: FolderKanban,
      group: 'projects'
    },
    {
      id: 'cto-dashboard',
      href: `/cto-dashboard`,
      label: "CTO Dashboard",
      icon: LayoutDashboard,
      group: 'projects'
    },
    {
      id: 'billing-rate',
      href: '/billing-rate',
      label: 'Billing Rate',
      icon: DollarSign,
      group: 'billing',
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
    {
      id: 'holidays',
      href: `/holidays`,
      label: "Holiday Calendar",
      icon: CalendarDays,
      group: 'holidays'
    },
  ];

  const getGroupForTab = (tab: PmSidebarNavProps['activeTab']) => {
    switch (tab) {
      case 'portfolios':
      case 'trash':
        return 'portfolio';
      case 'projects':
        return 'projects';
      case 'billing':
        return 'billing';
      case 'users':
        return 'users';
      case 'holidays':
        return 'holidays';
      default:
        return 'portfolio';
    }
  }

  const activeGroup = getGroupForTab(activeTab);
  const menuItems = allMenuItems.filter(item => item.group === activeGroup);

  return (
    <>
      <SidebarHeader className="p-2 transition-all duration-300">
        <div className="flex flex-col gap-3">
          <div className="flex items-center h-10 overflow-hidden">
            <Waves className="w-8 h-8 text-primary shrink-0" />
            <h1 className="ml-3 text-xl font-semibold text-sidebar-foreground transition-all duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap">
                ProjectFlow
            </h1>
            <Button variant="ghost" size="icon" className="md:hidden ml-auto shrink-0 transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 overflow-hidden" onClick={toggleSidebar}>
               <ChevronLeft />
            </Button>
          </div>
          <div className="flex items-center ml-[2px]">
            <SidebarTrigger className="h-7 w-7 rounded-sm border bg-background shadow-sm hover:bg-sidebar-accent hidden md:flex shrink-0" />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 transition-all duration-300">
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
      <SidebarFooter className="p-2 transition-all duration-300">
        <Separator className="my-2 transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:my-0 bg-sidebar-border" />
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
        <div className="flex items-center mt-4 h-10 overflow-hidden">
          <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback>RN</AvatarFallback>
          </Avatar>
          <div className="flex flex-col ml-3 transition-all duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap">
              <span className="font-semibold text-sm text-sidebar-foreground truncate pr-2">Raman C Nair</span>
              <span className="text-xs text-sidebar-foreground/70 truncate pr-2">ramanreadsmail@gmail.com</span>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
