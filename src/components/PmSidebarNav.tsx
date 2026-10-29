
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/use-permissions";
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
import { getUserInitials } from "@/lib/utils";
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
  Archive,
  Calculator,
  Bug,
  ClipboardList,
  CalendarCheck,
  Sparkles,
  UserCog,
  Mail,
  Clock,
} from "lucide-react";
import { db, collection, query, where, onSnapshot, unsubscribeAllListeners } from "@/lib/db-provider";
import { useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTestDataStudio, triggerOpenTestDataStudio } from "@/dev-tools";
import { getEffectiveRoute } from "@/lib/route-utils";

type PmSidebarNavProps = {
  activeTab: 'portfolios' | 'projects' | 'users' | 'trash' | 'holidays' | 'billing' | 'quality' | 'my-projects' | 'my-account';
};

export function PmSidebarNav({ activeTab }: PmSidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { isEnabled: isTestDataStudioEnabled } = useTestDataStudio();
  const [user, setUser] = useState<{ name: string; email: string; avatar: string; accessLevel?: string; role?: string; empId?: string; id?: string }>({ name: '', email: '', avatar: '' });
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [routeTick, setRouteTick] = useState<number>(0);

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
      const storedUser = localStorage.getItem('workwayz_user');
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

  useEffect(() => {
    if (!db || (!user.empId && !user.email)) return;
    const userIds = [user.empId, (user.email || '').toLowerCase()].filter(Boolean);
    if (userIds.length === 0) return;

    try {
      const q = query(collection(db, 'messages'), where('recipientUserIds', 'array-contains-any', userIds));
      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        let count = 0;
        snapshot.docs.forEach((d: any) => {
          const data = d.data();
          const isRead = userIds.some(id => data.readBy?.includes(id));
          const isDeleted = userIds.some(id => data.deletedBy?.includes(id));
          if (!isRead && !isDeleted) {
            count++;
          }
        });
        setUnreadCount(count);
      }, (err: any) => {
        if (
          err?.code === 'permission-denied' ||
          String(err?.message || '').toLowerCase().includes('permission') ||
          (typeof window !== 'undefined' && (window as any).__isLoggingOut)
        ) {
          return;
        }
        console.warn('Error fetching unread message count:', err);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Failed to subscribe to unread messages:', err);
    }
  }, [user.empId, user.email]);

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        (window as any).__isLoggingOut = true;
      }
      unsubscribeAllListeners();

      const userStr = localStorage.getItem('workwayz_user');
      const sessionProvider = userStr ? (() => { try { return JSON.parse(userStr).authProvider; } catch { return null; } })() : null;

      localStorage.removeItem('workwayz_user');
      localStorage.removeItem('workwayz_last_activity');
      sessionStorage.removeItem('workwayz_real_route');
      document.cookie = "workwayz_session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      if (sessionProvider === 'supabase') {
        try {
          const { supabase } = await import('@/lib/supabase');
          await supabase?.auth.signOut();
        } catch (supaErr) {
          console.warn('[Logout] Supabase signOut failed:', supaErr);
        }
      } else if (auth) {
        await signOut(auth);
      }

      window.location.href = '/';
    } catch (error) {
      console.error("Error logging out:", error);
      localStorage.removeItem('workwayz_user');
      localStorage.removeItem('workwayz_last_activity');
      sessionStorage.removeItem('workwayz_real_route');
      document.cookie = "workwayz_session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
  
  const allMenuItems = [
    {
      id: 'my-projects-home',
      href: `/my-projects`,
      label: "My Projects",
      icon: Briefcase,
      group: 'my-projects'
    },
    {
      id: 'worklog',
      href: '/worklog',
      label: 'Worklog',
      icon: ClipboardList,
      group: 'my-projects'
    },
    {
      id: 'leave-tracker',
      href: `/holidays/leave-tracker`,
      label: "Leave Tracker",
      icon: CalendarCheck,
      group: 'my-projects'
    },
    {
      id: 'messages',
      href: '/messages',
      label: 'Messages',
      icon: Mail,
      group: 'my-projects'
    },
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
      id: 'fp-portfolio-dash',
      href: `/fp-portfolio-dash`,
      label: "Portfolio PromptBoard",
      icon: Sparkles,
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
      id: 'billing-rate',
      href: '/billing-rate',
      label: 'Billing Rate',
      icon: DollarSign,
      group: 'billing',
    },
    {
      id: 'quality-estimations',
      href: '/quality/estimations',
      label: 'Estimation Variance',
      icon: Calculator,
      group: 'quality',
    },
    {
      id: 'quality-defects',
      href: '/quality/defects',
      label: 'Defect Containment',
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
      href: `/holidays/holiday-calendar`,
      label: "Company Holidays",
      icon: CalendarDays,
      group: 'holidays'
    },
    {
      id: 'leave-settings',
      href: `/holidays/leave-settings`,
      label: "Leave Policy & Quotas",
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
      id: 'archive',
      href: '/portfolio-settings/archive',
      label: 'Inactive Projects',
      icon: Archive,
      group: 'portfolio'
    },
    {
      id: 'cron-jobs',
      href: '/portfolio-settings/cron-jobs',
      label: 'Cron Jobs',
      icon: Clock,
      group: 'portfolio'
    },
    {
      id: 'test-data-studio',
      href: '/portfolio-settings/test-data-studio',
      label: 'Test Data Studio',
      icon: Sparkles,
      group: 'portfolio'
    },
    {
      id: 'trash',
      href: '/portfolio-trash',
      label: 'Portfolio Trash',
      icon: Trash2,
      group: 'trash'
    },
    {
      id: 'account-settings',
      href: '/my-account',
      label: 'Account Settings',
      icon: UserCog,
      group: 'account'
    },
  ];

  const getGroupForTab = (tab: PmSidebarNavProps['activeTab']) => {
    switch (tab) {
      case 'my-projects':
        return 'my-projects';
      case 'my-account':
        return 'account';
      case 'portfolios':
        return 'portfolio';
      case 'trash':
        return 'trash';
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

  const { hasAccess } = usePermissions();
  const activeGroup = getGroupForTab(activeTab);
  const menuItems = allMenuItems
    .filter(item => item.group === activeGroup)
    .filter(item => item.label === 'My Projects' || item.label === 'Worklog' || item.label === 'Leave Tracker' || item.label === 'Account Settings' || item.label === 'Messages' || hasAccess(item.label));

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
      <SidebarContent className="p-2 transition-all duration-300">
        <SidebarMenu>
          {menuItems.map((item: any) => (
            <SidebarMenuItem key={item.id || item.href}>
              {item.onClick ? (
                <SidebarMenuButton
                  isActive={isItemActive(item.href)}
                  tooltip={item.label}
                  onClick={item.onClick}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={isItemActive(item.href)}
                  tooltip={item.id === 'messages' && unreadCount > 0 ? `${item.label} (${unreadCount})` : item.label}
                >
                  <Link href={item.href} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.id === 'messages' && unreadCount > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none group-data-[collapsible=icon]:hidden">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 transition-all duration-300">
        <Separator className="my-2 transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:my-0 bg-sidebar-border" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center mt-2 h-12 overflow-hidden cursor-pointer hover:bg-sidebar-accent rounded-md p-1.5 -mx-1 transition-colors">
              <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">{getUserInitials(null, null, user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col ml-3 transition-opacity duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 overflow-hidden whitespace-nowrap min-w-0 leading-tight">
                  <span className="font-semibold text-sm text-sidebar-foreground truncate">{user.name || 'User'}</span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">{user.accessLevel || user.role || 'Team Member'}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
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
