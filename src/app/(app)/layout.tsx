
'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PmSidebarNav } from '@/components/PmSidebarNav';
import { useSidebarPersistedState } from '@/hooks/use-sidebar-state';
import { AuthGuard } from '@/components/AuthGuard';
import { SessionManager } from '@/components/SessionManager';
import { Settings, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs } from '@/lib/db-provider';
import { db } from '@/lib/db-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type AccessLevel = 'Super Admin' | 'Administrator' | 'Senior Management' | 'Project Manager' | 'Lead' | 'Team Member' | 'PMO';

const PORTFOLIO_ROLES: AccessLevel[] = ['Super Admin', 'Administrator', 'Senior Management', 'Project Manager'];

export default function AppLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();

  const isProjectPage = pathname.startsWith('/projects/');
  const { open, setOpen } = useSidebarPersistedState();

  const [userAccessLevel, setUserAccessLevel] = useState<AccessLevel | null>(null);
  const { hasAccess } = usePermissions();
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    const storedUser = localStorage.getItem('projectflow_user');
    if (!storedUser) return;

    try {
      const parsed = JSON.parse(storedUser);
      const level = (parsed.accessLevel as AccessLevel) || 'Team Member';
      setUserAccessLevel(level);

      // Check enablement from Firestore for current user
      if (db && parsed.empId) {
        const empId = parsed.empId;
        const q = query(collection(db, 'employees'), where('empId', '==', empId));
        getDocs(q).then((snapshot: any) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            // undefined isEnabled → treat as enabled (backward compat)
            setIsEnabled(data.isEnabled !== false);
          } else {
            setIsEnabled(true);
          }
        }).catch(() => {
          setIsEnabled(true);
        });
      } else {
        setIsEnabled(true);
      }
    } catch {
      setUserAccessLevel('Team Member');
      setIsEnabled(true);
    }
  }, []);

  const canSeePortfolioTabs = useMemo(() => {
    if (!userAccessLevel) return false;
    return PORTFOLIO_ROLES.includes(userAccessLevel);
  }, [userAccessLevel]);

  const showOnlyMyProjects = isEnabled === false;

  const getTabValue = () => {
    if (pathname.startsWith('/my-projects')) return 'my-projects';
    if (pathname.startsWith('/project-home')) return 'projects';
    if (pathname.startsWith('/portfolio-dashboard')) return 'projects';
    if (pathname.startsWith('/fp-portfolio-dash') || pathname.startsWith('/fp-dashboard')) return 'projects';
    if (pathname.startsWith('/quality')) return 'quality';
    if (pathname.startsWith('/billing')) return 'billing';
    if (pathname.startsWith('/billing-rate')) return 'billing';
    if (pathname.startsWith('/users')) return 'users';
    if (pathname.startsWith('/utilization')) return 'users';
    if (pathname.startsWith('/portfolio-trash') || pathname.startsWith('/trash')) return 'trash'; 
    if (pathname.startsWith('/holidays')) return 'holidays';
    if (pathname.startsWith('/portfolio-settings')) return 'portfolios';
    if (pathname.startsWith('/my-account') || pathname.startsWith('/messages')) return 'my-account';
    return 'my-projects';
  };

  const getDefaultRouteForTab = (tabKey: string) => {
    switch (tabKey) {
      case 'my-projects':
        return '/my-projects';
      case 'projects':
        if (hasAccess('Project Home')) return '/project-home';
        if (hasAccess('Portfolio Dashboard')) return '/portfolio-dashboard';
        if (hasAccess('FP Portfolio Dash') || hasAccess('FP Dashboard')) return '/fp-portfolio-dash';
        return '/project-home';
      case 'quality':
        if (hasAccess('Estimations')) return '/quality/estimations';
        if (hasAccess('Defects')) return '/quality/defects';
        return '/quality/estimations';
      case 'billing':
        if (hasAccess('Billing')) return '/billing';
        if (hasAccess('Billing Rate')) return '/billing-rate';
        return '/billing';
      case 'users':
        if (hasAccess('User List')) return '/users';
        if (hasAccess('Utilization')) return '/utilization';
        return '/users';
      case 'holidays':
        if (hasAccess('Holiday Calendar')) return '/holidays/holiday-calendar';
        if (hasAccess('Leave Settings')) return '/holidays/leave-settings';
        if (hasAccess('Leave Tracker')) return '/holidays/leave-tracker';
        return '/holidays/holiday-calendar';
      case 'portfolios':
        if (hasAccess('Access Settings')) return '/portfolio-settings/access-settings';
        if (hasAccess('Database')) return '/portfolio-settings/database';
        if (hasAccess('Authentication')) return '/portfolio-settings/authentication';
        if (hasAccess('AI Config')) return '/portfolio-settings/ai-config';
        if (hasAccess('Archive')) return '/portfolio-settings/archive';
        if (hasAccess('Test Data Studio')) return '/portfolio-settings/test-data-studio';
        if (hasAccess('Cron Jobs')) return '/portfolio-settings/cron-jobs';
        return '/portfolio-settings';
      case 'trash':
        return '/portfolio-trash';
      case 'my-account':
        return '/my-account';
      default:
        return '/my-projects';
    }
  };

  const onTabChange = (value: string) => {
    const route = getDefaultRouteForTab(value);
    if (route) {
      router.push(route);
    }
  };

  const dynamicTab = useMemo(() => {
    if (pathname.startsWith('/my-account') || pathname.startsWith('/messages')) return { value: 'my-account', label: 'Profile & Account' };
    return null;
  }, [pathname]);

  if (isProjectPage) {
    return (
      <AuthGuard>
        {children}
      </AuthGuard>
    );
  }

  const activeTab = getTabValue();

  return (
    <AuthGuard>
      <SessionManager />
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <Sidebar collapsible="icon">
          <PmSidebarNav activeTab={activeTab as any} />
        </Sidebar>
        <SidebarInset className="min-w-0">
          <div className="h-screen flex flex-col overflow-hidden">
            <div className="bg-topbar text-topbar-foreground px-4 md:px-8 py-4 border-b border-border flex items-center gap-4 shrink-0">
              <TooltipProvider delayDuration={150}>
                <Tabs value={activeTab} onValueChange={onTabChange}>
                    <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80">
                        <TabsTrigger value="my-projects" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                          <Link href={getDefaultRouteForTab('my-projects')}>My Projects</Link>
                        </TabsTrigger>
                        {!showOnlyMyProjects && (
                          <>
                            {(hasAccess('Project Home') || hasAccess('Portfolio Dashboard')) && (
                              <TabsTrigger value="projects" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href={getDefaultRouteForTab('projects')}>Projects</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Estimations') || hasAccess('Defects')) && (
                              <TabsTrigger value="quality" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href={getDefaultRouteForTab('quality')}>Quality</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Billing') || hasAccess('Billing Rate')) && (
                              <TabsTrigger value="billing" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href={getDefaultRouteForTab('billing')}>Billing</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('User List') || hasAccess('Utilization')) && (
                              <TabsTrigger value="users" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href={getDefaultRouteForTab('users')}>Users</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Holiday Calendar') || hasAccess('Leave Settings') || hasAccess('Leave Tracker')) && (
                              <TabsTrigger value="holidays" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href={getDefaultRouteForTab('holidays')}>Holidays</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Access Settings') || hasAccess('Database') || hasAccess('Authentication') || hasAccess('AI Config') || hasAccess('Setup Wizard') || hasAccess('Archive') || hasAccess('Test Data Studio') || hasAccess('Cron Jobs')) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <TabsTrigger value="portfolios" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground px-2.5">
                                    <Link href={getDefaultRouteForTab('portfolios')} className="flex items-center justify-center" aria-label="Portfolio Settings">
                                      <Settings className="h-4 w-4" />
                                      <span className="sr-only">Portfolio Settings</span>
                                    </Link>
                                  </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p>Portfolio Settings</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {(hasAccess('Portfolio Trash') || hasAccess('Trash')) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <TabsTrigger value="trash" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground px-2.5">
                                    <Link href={getDefaultRouteForTab('trash')} className="flex items-center justify-center" aria-label="Portfolio Trash">
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Portfolio Trash</span>
                                    </Link>
                                  </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p>Portfolio Trash</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        )}
                        {dynamicTab && (
                          <TabsTrigger value={dynamicTab.value} asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <Link href={dynamicTab.value === 'my-account' ? '/my-account' : '#'}>
                              {dynamicTab.label}
                            </Link>
                          </TabsTrigger>
                        )}
                    </TabsList>
                </Tabs>
              </TooltipProvider>
            </div>
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
