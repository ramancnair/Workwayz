
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
  const isSettingsPage = pathname.startsWith('/portfolio-settings');


  const getTabValue = () => {
    if (pathname.startsWith('/pmdashboard')) return 'projects';
    if (pathname.startsWith('/portfolios')) return 'portfolios';
    if (pathname.startsWith('/users')) return 'users';
    return 'portfolios'; // Default to portfolios
  };

  const onTabChange = (value: string) => {
    if (value === 'projects') {
      router.push('/pmdashboard');
    } else if (value === 'portfolios') {
      router.push('/portfolios');
    } else if (value === 'users') {
      router.push('/users');
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
              {!isSettingsPage && (
                <Tabs value={activeTab} onValueChange={onTabChange}>
                    <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80">
                        <TabsTrigger value="portfolios" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Portfolio</TabsTrigger>
                        <TabsTrigger value="projects" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Projects</TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Users</TabsTrigger>
                    </TabsList>
                </Tabs>
              )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
