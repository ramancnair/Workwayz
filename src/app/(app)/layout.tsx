
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
import { cn } from '@/lib/utils';
import { getEffectiveRoute } from '@/lib/route-utils';

type AccessLevel = 'Super Admin' | 'Administrator' | 'Senior Management' | 'Project Manager' | 'Lead' | 'Team Member' | 'PMO';

const PORTFOLIO_ROLES: AccessLevel[] = ['Super Admin', 'Administrator', 'Senior Management', 'Project Manager'];

export default function AppLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [routeTick, setRouteTick] = useState(0);

  useEffect(() => {
    const handleRouteChange = () => {
      setRouteTick((t) => t + 1);
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('workwayz-route-change', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('workwayz-route-change', handleRouteChange);
    };
  }, []);

  const effectivePath = useMemo(() => {
    void routeTick;
    return getEffectiveRoute(pathname);
  }, [pathname, routeTick]);

  const isProjectPage = effectivePath.startsWith('/projects/');
  const { open, setOpen } = useSidebarPersistedState();

  const [userAccessLevel, setUserAccessLevel] = useState<AccessLevel | null>(null);
  const { hasAccess } = usePermissions();
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    const storedUser = localStorage.getItem('workwayz_user');
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
    if (effectivePath.startsWith('/my-projects') || effectivePath.startsWith('/holidays/leave-tracker') || effectivePath.startsWith('/messages')) return 'my-projects';
    if (effectivePath.startsWith('/project-home')) return 'projects';
    if (effectivePath.startsWith('/portfolio-dashboard')) return 'projects';
    if (effectivePath.startsWith('/fp-portfolio-dash') || effectivePath.startsWith('/fp-dashboard')) return 'projects';
    if (effectivePath.startsWith('/quality')) return 'quality';
    if (effectivePath.startsWith('/billing')) return 'billing';
    if (effectivePath.startsWith('/billing-rate')) return 'billing';
    if (effectivePath.startsWith('/users')) return 'users';
    if (effectivePath.startsWith('/utilization')) return 'users';
    if (effectivePath.startsWith('/portfolio-trash') || effectivePath.startsWith('/trash')) return 'trash'; 
    if (effectivePath.startsWith('/holidays')) return 'holidays';
    if (effectivePath.startsWith('/portfolio-settings')) return 'portfolios';
    if (effectivePath.startsWith('/my-account')) return 'my-account';
    return 'my-projects';
  };

  const getDefaultRouteForTab = (tabKey: string) => {
    switch (tabKey) {
      case 'my-projects':
        return '/my-projects';
      case 'projects':
        if (hasAccess('Project Home')) return '/project-home';
        if (hasAccess('Portfolio Dashboard')) return '/portfolio-dashboard';
        if (hasAccess('Portfolio PromptBoard') || hasAccess('FP Portfolio Dash') || hasAccess('FP Dashboard')) return '/fp-portfolio-dash';
        return '/project-home';
      case 'quality':
        if (hasAccess('Estimation Variance') || hasAccess('Estimations')) return '/quality/estimations';
        if (hasAccess('Defect Containment') || hasAccess('Defects')) return '/quality/defects';
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
        return '/holidays/holiday-calendar';
      case 'portfolios':
        if (hasAccess('Access Settings')) return '/portfolio-settings/access-settings';
        if (hasAccess('Database')) return '/portfolio-settings/database';
        if (hasAccess('Authentication')) return '/portfolio-settings/authentication';
        if (hasAccess('AI Config')) return '/portfolio-settings/ai-config';
        if (hasAccess('Inactive') || hasAccess('Archive') || hasAccess('Inactive Projects')) return '/portfolio-settings/archive';
        if (hasAccess('Cron Jobs')) return '/portfolio-settings/cron-jobs';
        if (hasAccess('Test Data Studio')) return '/portfolio-settings/test-data-studio';
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
    if (effectivePath.startsWith('/my-account')) return { value: 'my-account', label: 'Profile & Account' };
    return null;
  }, [effectivePath]);

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
      <SidebarProvider open={open} onOpenChange={setOpen} className="h-screen max-h-screen overflow-hidden w-full max-w-full">
        <Sidebar collapsible="icon">
          <PmSidebarNav activeTab={activeTab as any} />
        </Sidebar>
        <SidebarInset className="min-w-0 h-screen max-h-screen overflow-hidden flex flex-col">
          <div className="h-full max-h-full flex flex-col overflow-hidden min-h-0 flex-1">
            <div className="bg-topbar text-topbar-foreground px-4 md:px-8 py-4 border-b border-border flex items-center gap-4 shrink-0">
              <TooltipProvider delayDuration={150}>
                <Tabs value={activeTab} onValueChange={onTabChange}>
                    <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80 border border-border/40">
                        <TabsTrigger value="my-projects" asChild className="data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-500 dark:hover:text-emerald-300 transition-all">
                          <Link href={getDefaultRouteForTab('my-projects')}>My Workspace</Link>
                        </TabsTrigger>
                        {!showOnlyMyProjects && (
                          <>
                            {(hasAccess('Project Home') || hasAccess('Portfolio Dashboard')) && (
                              <TabsTrigger value="projects" asChild className="data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-500 dark:hover:text-emerald-300 transition-all">
                                <Link href={getDefaultRouteForTab('projects')}>Projects</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Estimation Variance') || hasAccess('Estimations') || hasAccess('Defect Containment') || hasAccess('Defects')) && (
                              <TabsTrigger value="quality" asChild className="data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-500 dark:hover:text-emerald-300 transition-all">
                                <Link href={getDefaultRouteForTab('quality')}>Quality</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Billing') || hasAccess('Billing Rate')) && (
                              <TabsTrigger value="billing" asChild className="data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-500 dark:hover:text-emerald-300 transition-all">
                                <Link href={getDefaultRouteForTab('billing')}>Billing</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('User List') || hasAccess('Utilization')) && (
                              <TabsTrigger value="users" asChild className="data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-500 dark:hover:text-emerald-300 transition-all">
                                <Link href={getDefaultRouteForTab('users')}>Users</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Holiday Calendar') || hasAccess('Leave Settings')) && (
                              <TabsTrigger value="holidays" asChild className="data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-500 dark:hover:text-emerald-300 transition-all">
                                <Link href={getDefaultRouteForTab('holidays')}>Time Off</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Access Settings') || hasAccess('Database') || hasAccess('Authentication') || hasAccess('AI Config') || hasAccess('Setup Wizard') || hasAccess('Archive') || hasAccess('Test Data Studio') || hasAccess('Cron Jobs')) && (
                              <TabsTrigger
                                value="portfolios"
                                asChild
                                className={cn(
                                  "data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-500 dark:hover:text-emerald-300 transition-all px-2.5",
                                  activeTab === 'portfolios' && "bg-background text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/40 shadow-sm"
                                )}
                              >
                                <Link href={getDefaultRouteForTab('portfolios')} className="flex items-center justify-center" aria-label="Portfolio Settings">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="flex items-center justify-center">
                                        <Settings className="h-4 w-4" />
                                        <span className="sr-only">Portfolio Settings</span>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>Portfolio Settings</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Portfolio Trash') || hasAccess('Trash')) && (
                              <TabsTrigger
                                value="trash"
                                asChild
                                className={cn(
                                  "data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-500 dark:hover:text-emerald-300 transition-all px-2.5",
                                  activeTab === 'trash' && "bg-background text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/40 shadow-sm"
                                )}
                              >
                                <Link href={getDefaultRouteForTab('trash')} className="flex items-center justify-center" aria-label="Portfolio Trash">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="flex items-center justify-center">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Portfolio Trash</span>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>Portfolio Trash</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </Link>
                              </TabsTrigger>
                            )}
                          </>
                        )}
                        {dynamicTab && (
                          <TabsTrigger value={dynamicTab.value} asChild className="data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-500 dark:hover:text-emerald-300 transition-all">
                            <Link href={dynamicTab.value === 'my-account' ? '/my-account' : '#'}>
                              {dynamicTab.label}
                            </Link>
                          </TabsTrigger>
                        )}
                    </TabsList>
                </Tabs>
              </TooltipProvider>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
