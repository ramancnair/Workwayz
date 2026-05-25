
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { SetupWizard } from "@/components/SetupWizard";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
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
  LogOut,
  Shield,
  Database,
  Bot,
  Key,
  Wand2,
  Archive,
  Calculator,
  Bug,
  ClipboardList,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";

type PmSidebarNavProps = {
  activeTab: 'portfolios' | 'projects' | 'users' | 'trash' | 'holidays' | 'billing' | 'quality';
};

export function PmSidebarNav({ activeTab }: PmSidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const [user, setUser] = useState({ name: '', email: '' });
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('projectflow_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from local storage");
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      const userStr = localStorage.getItem('projectflow_user');
      const sessionProvider = userStr ? (() => { try { return JSON.parse(userStr).authProvider; } catch { return null; } })() : null;

      localStorage.removeItem('projectflow_user');

      if (sessionProvider === 'keycloak') {
        const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
        const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
        const keycloakClientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
        if (keycloakUrl && keycloakRealm && keycloakClientId) {
          try {
            const Keycloak = (await import('keycloak-js')).default;
            const keycloak = new Keycloak({ url: keycloakUrl, realm: keycloakRealm, clientId: keycloakClientId });
            await keycloak.init({ checkLoginIframe: false });
            if (keycloak.authenticated) {
              await keycloak.logout({ redirectUri: window.location.origin + '/' });
              return;
            }
          } catch (kcErr) {
            console.warn('[Logout] Keycloak session termination failed:', kcErr);
          }
        }
      } else if (auth) {
        await signOut(auth);
      }

      router.push('/');
    } catch (error) {
      console.error("Error logging out:", error);
      localStorage.removeItem('projectflow_user');
      router.push('/');
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
  
  const allMenuItems = [
    {
      id: 'projects',
      href: `/project-home`,
      label: "Project Home",
      icon: FolderKanban,
      group: 'projects'
    },
    {
      id: 'portfolio-dashboard',
      href: `/portfolio-dashboard`,
      label: "Portfolio Dashboard",
      icon: LayoutDashboard,
      group: 'projects'
    },
    {
      id: 'billing',
      href: '/billing',
      label: 'Billing',
      icon: DollarSign,
      group: 'billing',
    },
    {
      id: 'quality-estimations',
      href: '/quality/estimations',
      label: 'Estimations',
      icon: Calculator,
      group: 'quality',
    },
    {
      id: 'quality-defects',
      href: '/quality/defects',
      label: 'Defects',
      icon: Bug,
      group: 'quality',
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
    {
      id: 'allocated-leaves',
      href: `/holidays/allocated`,
      label: "Allocated Leaves",
      icon: ClipboardList,
      group: 'holidays'
    },
    {
      id: 'access-settings',
      href: '/portfolio-settings/access-settings',
      label: 'Access Settings',
      icon: Shield,
      group: 'portfolio'
    },
    {
      id: 'database',
      href: '/portfolio-settings/database',
      label: 'Database',
      icon: Database,
      group: 'portfolio'
    },
    {
      id: 'authentication',
      href: '/portfolio-settings/authentication',
      label: 'Authentication',
      icon: Key,
      group: 'portfolio'
    },
    {
      id: 'ai-config',
      href: '/portfolio-settings/ai-config',
      label: 'AI Config',
      icon: Bot,
      group: 'portfolio'
    },
    {
      id: 'setup-wizard',
      href: '#',
      label: 'Setup Wizard',
      icon: Wand2,
      group: 'portfolio',
      onClick: (e: any) => {
        e.preventDefault();
        setShowWizard(true);
      }
    },
    {
      id: 'archive',
      href: '/portfolio-settings/archive',
      label: 'Archive',
      icon: Archive,
      group: 'portfolio'
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
      case 'quality':
        return 'quality';
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
          <div className="flex items-center ml-[2px] gap-2">
            <SidebarTrigger className="h-7 w-7 rounded-sm border bg-background shadow-sm hover:bg-sidebar-accent hidden md:flex shrink-0" />
            <div className="ml-auto flex transition-opacity duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden">
                <ThemeToggle />
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 transition-all duration-300">
        <SidebarMenu>
          {menuItems.map((item: any) => (
            <SidebarMenuItem key={item.id || item.href}>
              {item.onClick ? (
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href) && item.href !== '#'}
                  tooltip={item.label}
                  onClick={item.onClick}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              ) : (
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              )}
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
        </SidebarMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center mt-4 h-10 overflow-hidden cursor-pointer hover:bg-sidebar-accent rounded-md p-1 -mx-1 transition-colors">
              <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col ml-3 transition-opacity duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap min-w-0">
                  <span className="font-semibold text-sm text-sidebar-foreground truncate">{user.name || 'User'}</span>
                  <span className="text-xs text-sidebar-foreground/70 truncate">{user.email}</span>
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
      {showWizard && <SetupWizard onClose={() => setShowWizard(false)} />}
    </>
  );
}
