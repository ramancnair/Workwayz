
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type PropsWithChildren } from "react";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PmSidebarNav } from '@/components/PmSidebarNav';

export default function AppLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();

  const isProjectPage = pathname.startsWith('/projects/');
  
  const getTabValue = () => {
    if (pathname.startsWith('/project-home')) return 'projects';
    if (pathname.startsWith('/portfolios')) return 'portfolios';
    if (pathname.startsWith('/cto-dashboard')) return 'portfolios';
    if (pathname.startsWith('/billing')) return 'billing';
    if (pathname.startsWith('/billing-rate')) return 'billing';
    if (pathname.startsWith('/users')) return 'users';
    if (pathname.startsWith('/utilization')) return 'users';
    if (pathname.startsWith('/trash')) return 'trash'; 
    if (pathname.startsWith('/holidays')) return 'holidays';
    if (pathname.startsWith('/portfolio-settings')) return 'portfolios';
    return 'portfolios';
  };

  const onTabChange = (value: string) => {
    if (value === 'projects') {
      router.push('/project-home');
    } else if (value === 'portfolios') {
      router.push('/portfolios');
    } else if (value === 'cto-dashboard') {
        router.push('/cto-dashboard');
    } else if (value === 'billing') {
      router.push('/billing');
    } else if (value === 'users') {
      router.push('/users');
    } else if (value === 'holidays') {
      router.push('/holidays');
    } else if (value === 'trash') {
        router.push('/trash');
    }
  };

  if (isProjectPage) {
    return <>{children}</>;
  }

  const activeTab = getTabValue();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <PmSidebarNav activeTab={activeTab} />
      </Sidebar>
      <SidebarInset>
        <div className="h-screen flex flex-col">
          <div className="bg-topbar text-topbar-foreground px-4 md:px-8 py-4 border-b border-topbar-foreground/10 flex items-center gap-4">
              <Tabs value={activeTab} onValueChange={onTabChange}>
                  <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80">
                      <TabsTrigger value="portfolios" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Portfolio</TabsTrigger>
                      <TabsTrigger value="projects" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Projects</TabsTrigger>
                      <TabsTrigger value="billing" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Billing</TabsTrigger>
                      <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Users</TabsTrigger>
                      <TabsTrigger value="holidays" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Holidays</TabsTrigger>
                  </TabsList>
              </Tabs>
          </div>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
