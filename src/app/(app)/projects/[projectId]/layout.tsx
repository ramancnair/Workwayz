
'use client';

import { usePathname, useRouter, useParams } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type PropsWithChildren } from "react";
import { ProjectProvider, useProject } from "@/context/ProjectContext";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarNav } from '@/components/SidebarNav';

function ProjectLayoutContent({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { projectId } = useParams() as { projectId: string };
  const { project, isLoading } = useProject();

  const basePath = `/projects/${projectId}`;

  const isSettingsPath = pathname.startsWith(`${basePath}/settings`);
  const isTestingPath = ['/dashboard/testing', '/testing/test-cases', '/testing/bug-list'].some(p => pathname.startsWith(basePath + p));
  const isArchitecturePath = pathname.startsWith(`${basePath}/architecture`);
  const isReleasesPath = pathname.startsWith(`${basePath}/releases`);
  const isResourcesPath = ['/resources', '/project-gantt', '/worklog', '/leave-tracker'].some(p => pathname.startsWith(basePath + p));
  const isGovernancePath = ['/raid-dashboard', '/risks', '/assumptions', '/issues', '/dependencies'].some(p => pathname.startsWith(basePath + p));
  const isHolidaysPath = pathname.startsWith(`${basePath}/holiday-calendar`);
  
  const isDevelopmentPath = !isTestingPath && !isResourcesPath && !isGovernancePath && !isHolidaysPath && !isArchitecturePath && !isReleasesPath && !isSettingsPath;

  const getTabValue = () => {
    if (isDevelopmentPath) return 'development';
    if (isTestingPath) return 'testing';
    if (isArchitecturePath) return 'architecture';
    if (isReleasesPath) return 'releases';
    if (isResourcesPath) return 'resources';
    if (isGovernancePath) return 'governance';
    if (isHolidaysPath) return 'holidays';
    return ''; // No active tab for settings
  };

  const onTabChange = (value: string) => {
    if (value === 'development') {
      router.push(`${basePath}/dashboard/development`);
    } else if (value === 'testing') {
      router.push(`${basePath}/dashboard/testing`);
    } else if (value === 'architecture') {
      router.push(`${basePath}/architecture`);
    } else if (value === 'releases') {
      router.push(`${basePath}/releases`);
    } else if (value === 'resources') {
      router.push(`${basePath}/resources`);
    } else if (value === 'governance') {
      router.push(`${basePath}/raid-dashboard`);
    } else if (value === 'holidays') {
      router.push(`${basePath}/holiday-calendar`);
    }
  };

  return (
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarNav projectId={projectId} />
        </Sidebar>
        <SidebarInset>
          <div className="h-screen flex flex-col">
            <div className="bg-topbar text-topbar-foreground px-4 md:px-8 py-4 border-b border-topbar-foreground/10 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{project?.name || 'Loading Project...'}</h1>
                <p className="text-xs text-muted-foreground">{project?.id}</p>
              </div>
              <Tabs value={getTabValue()} onValueChange={onTabChange}>
                  <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80">
                      <TabsTrigger value="development" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Development</TabsTrigger>
                      <TabsTrigger value="testing" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Testing</TabsTrigger>
                      <TabsTrigger value="architecture" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Architecture</TabsTrigger>
                      <TabsTrigger value="releases" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Releases</TabsTrigger>
                      <TabsTrigger value="resources" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Resources</TabsTrigger>
                      <TabsTrigger value="governance" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Governance</TabsTrigger>
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

export default function AppLayout({ children, params }: PropsWithChildren<{ params: { projectId: string } }>) {
  return (
    <ProjectProvider projectId={params.projectId}>
      <ProjectLayoutContent>{children}</ProjectLayoutContent>
    </ProjectProvider>
  )
}
