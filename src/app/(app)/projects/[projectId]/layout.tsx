
'use client';

import { usePathname, useRouter, useParams } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type PropsWithChildren, use } from "react";
import { ProjectProvider, useProject } from "@/context/ProjectContext";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarNav } from '@/components/SidebarNav';
import { useSidebarPersistedState } from '@/hooks/use-sidebar-state';

function ProjectLayoutContent({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { projectId } = useParams() as { projectId: string };
  const { project, isLoading } = useProject();

  const basePath = `/projects/${projectId}`;

  const isSettingsPath = pathname.startsWith(`${basePath}/settings`);
  const isTestingPath = ['/testing/dashboard', '/testing/test-backlog', '/testing/bug-list', '/testing/test-plan'].some(p => pathname.startsWith(basePath + p));
  const isProjectPath = pathname.startsWith(`${basePath}/project-details`);
  const isInitialEstimationPath = pathname.startsWith(`${basePath}/initial-estimation`);
  const isReleasesPath = pathname.startsWith(`${basePath}/releases`);
  const isResourcesPath = pathname.startsWith(`${basePath}/resources`);
  const isGovernancePath = ['/raid-dashboard', '/risks', '/assumptions', '/issues', '/dependencies'].some(p => pathname.startsWith(basePath + p));
  const isHolidaysPath = pathname.startsWith(`${basePath}/holidays`);
  const isPmoPath = pathname.startsWith(`${basePath}/pmo`);

  const isDevelopmentPath = pathname.startsWith(`${basePath}/development`);

  const getTabValue = () => {
    if (isDevelopmentPath) return 'development';
    if (isTestingPath) return 'testing';
    if (isProjectPath) return 'project';
    if (isInitialEstimationPath) return 'initial-estimation';
    if (isReleasesPath) return 'releases';
    if (isResourcesPath) return 'resources';
    if (isGovernancePath) return 'governance';
    if (isHolidaysPath) return 'holidays';
    if (isPmoPath) return 'pmo';
    return ''; // No active tab for settings
  };

  const onTabChange = (value: string) => {
    if (value === 'development') {
      router.push(`${basePath}/development/dashboard`);
    } else if (value === 'testing') {
      router.push(`${basePath}/testing/dashboard`);
    } else if (value === 'project') {
      router.push(`${basePath}/project-details/project-status`);
    } else if (value === 'initial-estimation') {
      router.push(`${basePath}/initial-estimation/ballpark`);
    } else if (value === 'releases') {
      router.push(`${basePath}/releases/project-releases`);
    } else if (value === 'resources') {
      router.push(`${basePath}/resources/project-resources`);
    } else if (value === 'governance') {
      router.push(`${basePath}/raid-dashboard`);
    } else if (value === 'holidays') {
      router.push(`${basePath}/holidays`);
    } else if (value === 'pmo') {
      router.push(`${basePath}/pmo/documents`);
    }
  };

  const { open, setOpen } = useSidebarPersistedState();

  if (isLoading) {
    // You might want a more sophisticated loading skeleton here
    return <div className="flex h-screen w-full items-center justify-center">Loading project...</div>;
  }

  const renderContent = () => {
    const isInitialStatus = project?.status === 'Initial Estimation';

    return (
      <>
        <div className="bg-topbar text-topbar-foreground px-4 md:px-8 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{project?.name || 'Loading Project...'}</h1>
            <p className="text-xs text-muted-foreground">{project?.id}</p>
          </div>
          <Tabs value={getTabValue()} onValueChange={onTabChange}>
            <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80">
              <TabsTrigger value="initial-estimation" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Initial Estimation</TabsTrigger>
              {!isInitialStatus && (
                <>
                  <TabsTrigger value="project" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Project Details</TabsTrigger>
                  <TabsTrigger value="resources" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Resources</TabsTrigger>
                  <TabsTrigger value="releases" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Releases</TabsTrigger>
                  <TabsTrigger value="development" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Development</TabsTrigger>
                  <TabsTrigger value="testing" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Testing</TabsTrigger>
                  <TabsTrigger value="governance" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Governance</TabsTrigger>
                  <TabsTrigger value="holidays" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Holidays</TabsTrigger>
                  <TabsTrigger value="pmo" className="data-[state=active]:bg-background data-[state=active]:text-foreground">PMO</TabsTrigger>
                </>
              )}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </>
    );
  };


  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Sidebar collapsible="icon">
        <SidebarNav projectId={projectId} />
      </Sidebar>
      <SidebarInset>
        <div className="h-screen flex flex-col overflow-hidden">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// This is a Server Component, so we can use `use` to resolve the params promise
export default function AppLayout({ children }: PropsWithChildren) {
  const { projectId } = useParams() as { projectId: string };
  return (
    <ProjectProvider projectId={projectId}>
      <ProjectLayoutContent>{children}</ProjectLayoutContent>
    </ProjectProvider>
  )
}
