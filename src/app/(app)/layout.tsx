
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/SidebarNav";
import { type PropsWithChildren } from "react";
import { ProjectProvider } from "@/context/ProjectContext";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AppLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();

  const isTestingPath = ['/dashboard/testing', '/testing/test-cases', '/testing/bug-list'].some(p => pathname.startsWith(p));
  const isResourcesPath = pathname.startsWith('/resources');
  const isGovernancePath = ['/raid-dashboard', '/risks', '/assumptions', '/issues', '/dependencies'].some(p => pathname.startsWith(p));
  
  const isDevelopmentPath = !isTestingPath && !isResourcesPath && !isGovernancePath;

  const tabValue = isTestingPath ? 'testing' : isResourcesPath ? 'resources' : isGovernancePath ? 'governance' : 'development';

  const onTabChange = (value: string) => {
    if (value === 'development') {
      router.push('/dashboard/development');
    } else if (value === 'testing') {
      router.push('/dashboard/testing');
    } else if (value === 'resources') {
      router.push('/resources');
    } else if (value === 'governance') {
      router.push('/raid-dashboard');
    }
  };

  return (
    <ProjectProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarNav />
        </Sidebar>
        <SidebarInset>
          <div className="h-screen flex flex-col">
            <div className="bg-topbar text-topbar-foreground px-4 md:px-8 py-4 border-b border-topbar-foreground/10">
                <Tabs value={tabValue} onValueChange={onTabChange}>
                    <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80">
                        <TabsTrigger value="development" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Development</TabsTrigger>
                        <TabsTrigger value="testing" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Testing</TabsTrigger>
                        <TabsTrigger value="resources" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Resources</TabsTrigger>
                        <TabsTrigger value="governance" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Governance</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProjectProvider>
  );
}
