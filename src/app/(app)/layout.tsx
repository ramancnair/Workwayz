
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
    if (pathname.startsWith('/pmdashboard')) return 'projects';
    if (pathname.startsWith('/portfolios')) return 'portfolios';
    if (pathname.startsWith('/employees')) return 'employees';
    return 'portfolios'; // Default to portfolios
  };

  const onTabChange = (value: string) => {
    if (value === 'projects') {
      router.push('/pmdashboard');
    } else if (value === 'portfolios') {
      router.push('/portfolios');
    } else if (value === 'employees') {
      router.push('/employees');
    }
  };

  if (isProjectPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <PmSidebarNav />
      </Sidebar>
      <SidebarInset>
        <div className="h-screen flex flex-col">
          <div className="bg-topbar text-topbar-foreground px-4 md:px-8 py-4 border-b border-topbar-foreground/10 flex items-center gap-4">
              <Tabs value={getTabValue()} onValueChange={onTabChange}>
                  <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80">
                      <TabsTrigger value="portfolios" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Portfolio</TabsTrigger>
                      <TabsTrigger value="projects" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Projects</TabsTrigger>
                      <TabsTrigger value="employees" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Employees</TabsTrigger>
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
