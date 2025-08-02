
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
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

type PmSidebarNavProps = {
  activeTab: 'portfolios' | 'projects' | 'users';
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
    },
    {
      id: 'projects',
      href: `/pmdashboard`,
      label: "Projects Dashboard",
      icon: FolderKanban,
    },
    {
      id: 'users',
      href: `/users`,
      label: "User List",
      icon: Building2,
    },
  ];

  const menuItems = allMenuItems.filter(item => item.id === activeTab);

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
