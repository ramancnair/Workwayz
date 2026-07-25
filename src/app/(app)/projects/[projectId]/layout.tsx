
'use client';

import { usePathname, useRouter, useParams } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type PropsWithChildren, use, useMemo, useEffect } from "react";
import { ProjectProvider, useProject } from "@/context/ProjectContext";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarNav } from '@/components/SidebarNav';
import { useSidebarPersistedState } from '@/hooks/use-sidebar-state';
import { cn } from '@/lib/utils';
import { Settings, Trash2 } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

function ProjectLayoutContent({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { projectId } = useParams() as { projectId: string };
  const { project, isLoading } = useProject();
  const { hasAccess } = usePermissions();

  const basePath = `/projects/${projectId}`;

  useEffect(() => {
    if (!isLoading && project && (project.status === 'Initial Estimation' || project.status === 'Not Started')) {
      const allowedPaths = [
        `${basePath}/initial-estimation`,
        `${basePath}/project-settings`,
        `${basePath}/settings`,
        `${basePath}/project-trash`,
        `${basePath}/trash`,
        '/my-account'
      ];
      const isAllowed = allowedPaths.some(p => pathname.startsWith(p));
      if (!isAllowed) {
        router.replace(`${basePath}/initial-estimation/specifications`);
      }
    }
  }, [project, isLoading, pathname, basePath, router]);

  const isAllowed = useMemo(() => {
    if (isLoading || !project) return true;
    if (project.status === 'Initial Estimation' || project.status === 'Not Started') {
      const allowedPaths = [
        `${basePath}/initial-estimation`,
        `${basePath}/project-settings`,
        `${basePath}/settings`,
        `${basePath}/project-trash`,
        `${basePath}/trash`,
        '/my-account'
      ];
      return allowedPaths.some(p => pathname.startsWith(p));
    }
    return true;
  }, [project, isLoading, basePath, pathname]);

  const isSettingsPath = pathname.startsWith(`${basePath}/project-settings`) || pathname.startsWith(`${basePath}/settings`);
  const isTestingPath = ['/testing/dashboard', '/testing/test-backlog', '/testing/defects', '/testing/defect-tracker', '/testing/test-plan'].some(p => pathname.startsWith(basePath + p));
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
    if (pathname.startsWith(`${basePath}/project-settings`) || pathname.startsWith(`${basePath}/settings`)) return 'settings';
    if (pathname.startsWith(`${basePath}/project-trash`) || pathname.startsWith(`${basePath}/trash`)) return 'trash';
    if (pathname.startsWith('/my-account')) return 'my-account';
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
      router.push(`${basePath}/initial-estimation/specifications`);
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
    } else if (value === 'settings') {
      router.push(`${basePath}/project-settings/board`);
    } else if (value === 'trash') {
      router.push(`${basePath}/project-trash`);
    } else if (value === 'my-account') {
      router.push('/my-account');
    }
  };

  const dynamicTab = useMemo(() => {
    if (pathname.startsWith('/my-account')) return { value: 'my-account', label: 'Profile & Account' };
    return null;
  }, [pathname]);

  const { open, setOpen } = useSidebarPersistedState();

  if (isLoading) {
    // You might want a more sophisticated loading skeleton here
    return <div className="flex h-screen w-full items-center justify-center">Loading project...</div>;
  }

  const renderContent = () => {
    const showInitialTabsOnly = project?.status === 'Initial Estimation' || project?.status === 'Not Started';

    return (
      <>
        <div className="bg-topbar text-topbar-foreground px-4 md:px-8 py-4 border-b border-border flex items-center justify-between gap-4 overflow-hidden shrink-0">
          <div className="overflow-x-auto max-w-full py-1 -my-1 shrink-0">
            <Tabs value={getTabValue()} onValueChange={onTabChange} className="w-auto">
              <TabsList className="bg-topbar-foreground/10 text-topbar-foreground/80 flex whitespace-nowrap w-max">
                {(hasAccess('Specifications (Initial Estimation)') || hasAccess('Project Status (Initial Estimation)')) && (
                  <TabsTrigger 
                    value="initial-estimation" 
                    className={cn(
                      "data-[state=active]:bg-background data-[state=active]:text-foreground",
                      showInitialTabsOnly && !dynamicTab && "pointer-events-none cursor-default"
                    )}
                  >
                    Initial Estimation
                  </TabsTrigger>
                )}
                {!showInitialTabsOnly && (
                  <>
                    {(hasAccess('Project Status') || hasAccess('PM Dashboard') || hasAccess('Specifications')) && (
                      <TabsTrigger value="project" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Project Details</TabsTrigger>
                    )}
                    {(hasAccess('Project Resources') || hasAccess('Worklog') || hasAccess('Resource Workload') || hasAccess('Project Gantt')) && (
                      <TabsTrigger value="resources" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Resources</TabsTrigger>
                    )}
                    {hasAccess('Project Releases') && (
                      <TabsTrigger value="releases" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Releases</TabsTrigger>
                    )}
                    {(hasAccess('Development Dashboard') || hasAccess('Product Backlog') || hasAccess('Grooming') || hasAccess('Kanban Board') || hasAccess('Sub-Tasks') || hasAccess('Defect Tracker')) && (
                      <TabsTrigger value="development" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Development</TabsTrigger>
                    )}
                    {(hasAccess('Test Dashboard') || hasAccess('Test Backlog') || hasAccess('Test Plan') || hasAccess('Defects')) && (
                      <TabsTrigger value="testing" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Testing</TabsTrigger>
                    )}
                    {(hasAccess('RAID Dashboard') || hasAccess('Risks') || hasAccess('Assumptions') || hasAccess('Issues') || hasAccess('Dependencies')) && (
                      <TabsTrigger value="governance" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Governance</TabsTrigger>
                    )}
                    {(hasAccess('Project Holiday Calendar') || hasAccess('Leave Calendar')) && (
                      <TabsTrigger value="holidays" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Holidays</TabsTrigger>
                    )}
                    {(hasAccess('PMO Documents') || hasAccess('PMO FB Billing') || hasAccess('PMO FB Payment Milestones') || hasAccess('PMO TnM Billing') || hasAccess('PMO TnM Payment Milestones') || hasAccess('Business Continuity')) && (
                      <TabsTrigger value="pmo" className="data-[state=active]:bg-background data-[state=active]:text-foreground">PMO</TabsTrigger>
                    )}
                    {(hasAccess('Board Settings') || hasAccess('Sprint Settings') || hasAccess('Effort Settings')) && (
                      <TabsTrigger value="settings" className="data-[state=active]:bg-background data-[state=active]:text-foreground flex items-center gap-1.5">
                        <Settings className="h-4 w-4" />
                        <span>Project Settings</span>
                      </TabsTrigger>
                    )}
                    {hasAccess('Project Trash') && (
                      <TabsTrigger value="trash" className="data-[state=active]:bg-background data-[state=active]:text-foreground flex items-center gap-1.5">
                        <Trash2 className="h-4 w-4" />
                        <span>Project Trash</span>
                      </TabsTrigger>
                    )}
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
          <div className="flex-shrink-0 text-right hidden sm:block">
            <h1 className="text-base font-bold leading-tight truncate max-w-[250px] md:max-w-[350px]">{project?.name || 'Loading Project...'}</h1>
            <p className="text-xs text-muted-foreground font-mono">{project?.id}</p>
          </div>
        </div>
        <div className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col">
          {isAllowed ? children : <div className="flex h-full w-full items-center justify-center text-muted-foreground">Redirecting...</div>}
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
