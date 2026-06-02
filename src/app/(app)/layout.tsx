
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PmSidebarNav } from '@/components/PmSidebarNav';
import { useSidebarPersistedState } from '@/hooks/use-sidebar-state';
import { AuthGuard } from '@/components/AuthGuard';
import { Settings } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type AccessLevel = 'Administrator' | 'Senior Management' | 'Project Manager' | 'Lead' | 'Team Member' | 'PMO';

const PORTFOLIO_ROLES: AccessLevel[] = ['Administrator', 'Senior Management', 'Project Manager'];

export default function AppLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();

  const isProjectPage = pathname.startsWith('/projects/');
  const { open, setOpen } = useSidebarPersistedState();

  const [userAccessLevel, setUserAccessLevel] = useState<AccessLevel | null>(null);
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
        getDocs(q).then((snapshot) => {
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
    if (pathname.startsWith('/trash')) return 'trash'; 
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
        router.push('/trash');
    } else if (value === 'portfolios') {
        router.push('/portfolio-settings');
    } else if (value === 'my-account') {
        router.push('/my-account');
    }
  };

  const dynamicTab = useMemo(() => {
    if (pathname.startsWith('/trash')) return { value: 'trash', label: 'Trash' };
    if (pathname.startsWith('/portfolio-settings')) return { value: 'portfolios', label: 'Portfolio Settings' };
    if (pathname.startsWith('/my-account')) return { value: 'my-account', label: 'Profile & Account' };
    return null;
  }, [pathname]);

  if (isProjectPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  const activeTab = getTabValue();

  return (
    <AuthGuard>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <Sidebar collapsible="icon">
          <PmSidebarNav activeTab={activeTab as any} />
        </Sidebar>
        <SidebarInset className="min-w-0">
          <div className="h-screen flex flex-col overflow-hidden">
            <div className="bg-topbar text-topbar-foreground px-4 md:px-8 py-4 border-b border-border flex items-center gap-4 shrink-0">
                <Tabs value={activeTab} onValueChange={onTabChange}>
                    <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80">
                        <TabsTrigger value="my-projects" className="data-[state=active]:bg-background data-[state=active]:text-foreground">My Projects</TabsTrigger>
                        {!showOnlyMyProjects && canSeePortfolioTabs && (
                          <>
                            <TabsTrigger value="projects" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Projects</TabsTrigger>
                            <TabsTrigger value="quality" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Quality</TabsTrigger>
                            <TabsTrigger value="billing" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Billing</TabsTrigger>
                            <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Users</TabsTrigger>
                            <TabsTrigger value="holidays" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Holidays</TabsTrigger>
                          </>
                        )}
                        {dynamicTab && (
                          <TabsTrigger value={dynamicTab.value} className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                            {dynamicTab.label}
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
