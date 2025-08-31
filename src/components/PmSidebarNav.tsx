
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
      id: 'cto-dashboard',
      href: `/cto-dashboard`,
      label: "CTO Dashboard",
      icon: LayoutDashboard,
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
              <AvatarImage src="https://i.imgur.com/sdGSP24.jpeg" alt="User" data-ai-hint="user avatar" />
              <AvatarFallback>RN</AvatarFallback>
          </Avatar>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-sm text-sidebar-foreground">Raman C Nair</span>
              <span className="text-xs text-sidebar-foreground/70">ramanreadsmail@gmail.com</span>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
