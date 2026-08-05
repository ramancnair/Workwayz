
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

type AccessLevel = 'Administrator' | 'Senior Management' | 'Project Manager' | 'Lead' | 'Team Member' | 'PMO';

const PORTFOLIO_ROLES: AccessLevel[] = ['Administrator', 'Senior Management', 'Project Manager'];

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
    if (pathname.startsWith('/quality')) return 'quality';
    if (pathname.startsWith('/billing')) return 'billing';
    if (pathname.startsWith('/billing-rate')) return 'billing';
    if (pathname.startsWith('/users')) return 'users';
    if (pathname.startsWith('/utilization')) return 'users';
    if (pathname.startsWith('/portfolio-trash') || pathname.startsWith('/trash')) return 'trash'; 
    if (pathname.startsWith('/holidays')) return 'holidays';
    if (pathname.startsWith('/portfolio-settings')) return 'portfolios';
    if (pathname.startsWith('/my-account')) return 'my-account';
    return 'my-projects';
  };

  const onTabChange = (value: string) => {
    if (value === 'my-projects') {
      router.push('/my-projects');
    } else if (value === 'projects') {
      router.push('/project-home');
    } else if (value === 'quality') {
      router.push('/quality/estimations');
    } else if (value === 'portfolio-dashboard') {
        router.push('/portfolio-dashboard');
    } else if (value === 'billing') {
      router.push('/billing');
    } else if (value === 'users') {
      router.push('/users');
    } else if (value === 'holidays') {
      router.push('/holidays/holiday-calendar');
    } else if (value === 'trash') {
        router.push('/portfolio-trash');
    } else if (value === 'portfolios') {
        router.push('/portfolio-settings');
    } else if (value === 'my-account') {
        router.push('/my-account');
    }
  };

  const dynamicTab = useMemo(() => {
    if (pathname.startsWith('/my-account')) return { value: 'my-account', label: 'Profile & Account' };
    return null;
  }, [pathname]);

  if (isProjectPage) {
    return <AuthGuard>{children}</AuthGuard>;
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
                <Tabs value={activeTab} onValueChange={onTabChange}>
                    <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80">
                        {hasAccess('My Projects') && (
                          <TabsTrigger value="my-projects" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <Link href="/my-projects">My Projects</Link>
                          </TabsTrigger>
                        )}
                        {!showOnlyMyProjects && canSeePortfolioTabs && (
                          <>
                            {hasAccess('Project Home') && (
                              <TabsTrigger value="projects" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href="/project-home">Projects</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Estimations') || hasAccess('Defects')) && (
                              <TabsTrigger value="quality" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href="/quality/estimations">Quality</Link>
                              </TabsTrigger>
                            )}
                            {hasAccess('Billing') && (
                              <TabsTrigger value="billing" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href="/billing">Billing</Link>
                              </TabsTrigger>
                            )}
                            {hasAccess('User List') && (
                              <TabsTrigger value="users" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href="/users">Users</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Holiday Calendar') || hasAccess('Leave Settings') || hasAccess('Leave Tracker')) && (
                              <TabsTrigger value="holidays" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href="/holidays/holiday-calendar">Holidays</Link>
                              </TabsTrigger>
                            )}
                            {(hasAccess('Access Settings') || hasAccess('Database') || hasAccess('Authentication') || hasAccess('AI Config') || hasAccess('Archive')) && (
                              <TabsTrigger value="portfolios" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href="/portfolio-settings" className="flex items-center gap-1.5">
                                  <Settings className="h-4 w-4" />
                                  <span>Portfolio Settings</span>
                                </Link>
                              </TabsTrigger>
                            )}
                            {hasAccess('Trash') && (
                              <TabsTrigger value="trash" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                                <Link href="/portfolio-trash" className="flex items-center gap-1.5">
                                  <Trash2 className="h-4 w-4" />
                                  <span>Portfolio Trash</span>
                                </Link>
                              </TabsTrigger>
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
