
'use client';

import { usePathname, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
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
  const isTestingPath = pathname.startsWith(`${basePath}/testing`);
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

  const getDefaultRouteForTab = (tabKey: string) => {
    switch (tabKey) {
      case 'initial-estimation':
        if (hasAccess('Specifications (Initial Estimation)')) return `${basePath}/initial-estimation/specifications`;
        if (hasAccess('Project Status (Initial Estimation)')) return `${basePath}/initial-estimation/project-status`;
        return `${basePath}/initial-estimation/specifications`;

      case 'project':
        if (hasAccess('Project Status')) return `${basePath}/project-details/project-status`;
        if (hasAccess('PM Dashboard')) return `${basePath}/project-details/pm-dashboard`;
        if (hasAccess('Specifications')) return `${basePath}/project-details/specifications`;
        return `${basePath}/project-details/project-status`;

      case 'resources':
        if (hasAccess('Project Resources')) return `${basePath}/resources/project-resources`;
        if (hasAccess('Worklog')) return `${basePath}/resources/worklog`;
        if (hasAccess('Resource Workload')) return `${basePath}/resources/resource-workload`;
        if (hasAccess('Project Gantt')) return `${basePath}/resources/project-gantt`;
        return `${basePath}/resources/project-resources`;

      case 'releases':
        return `${basePath}/releases/project-releases`;

      case 'development':
        if (hasAccess('Development Dashboard')) return `${basePath}/development/dashboard`;
        if (hasAccess('Product Backlog')) return `${basePath}/development/backlog`;
        if (hasAccess('Grooming')) return `${basePath}/development/grooming`;
        if (hasAccess('Kanban Board')) return `${basePath}/development/kanban`;
        if (hasAccess('Sub-Tasks')) return `${basePath}/development/development-tasks`;
        if (hasAccess('Defect Tracker')) return `${basePath}/development/defect-tracker`;
        return `${basePath}/development/dashboard`;

      case 'testing':
        if (hasAccess('Test Dashboard')) return `${basePath}/testing/dashboard`;
        if (hasAccess('Test Cases') || hasAccess('Test Backlog') || hasAccess('Test Backlogs')) return `${basePath}/testing/test-cases`;
        if (hasAccess('Test Cycle') || hasAccess('Test Cycles') || hasAccess('Test Plan')) return `${basePath}/testing/test-cycle`;
        if (hasAccess('Test Execution') || hasAccess('Test Executions')) return `${basePath}/testing/test-execution`;
        if (hasAccess('Defects')) return `${basePath}/testing/defects`;
        if (hasAccess('Defect Tracker')) return `${basePath}/testing/defect-tracker`;
        return `${basePath}/testing/dashboard`;

      case 'governance':
        if (hasAccess('RAID Dashboard')) return `${basePath}/raid-dashboard`;
        if (hasAccess('Risks')) return `${basePath}/risks`;
        if (hasAccess('Assumptions')) return `${basePath}/assumptions`;
        if (hasAccess('Issues')) return `${basePath}/issues`;
        if (hasAccess('Dependencies')) return `${basePath}/dependencies`;
        return `${basePath}/raid-dashboard`;

      case 'holidays':
        if (hasAccess('Project Holiday Calendar')) return `${basePath}/holidays`;
        if (hasAccess('Leave Calendar')) return `${basePath}/holidays/leave-calendar`;
        return `${basePath}/holidays`;

      case 'pmo':
        if (hasAccess('PMO Documents')) return `${basePath}/pmo/documents`;
        if (project?.pricingModel !== 'T&M' && hasAccess('PMO FB Billing')) return `${basePath}/pmo/fb-billing`;
        if (project?.pricingModel !== 'T&M' && hasAccess('PMO FB Payment Milestones')) return `${basePath}/pmo/fb-payment-milestones`;
        if (project?.pricingModel !== 'Fixed Bid' && hasAccess('PMO TnM Billing')) return `${basePath}/pmo/tnm-billing`;
        if (project?.pricingModel !== 'Fixed Bid' && hasAccess('PMO TnM Payment Milestones')) return `${basePath}/pmo/tnm-payment-milestones`;
        if (hasAccess('Business Continuity')) return `${basePath}/pmo/business-continuity`;
        return `${basePath}/pmo/documents`;

      case 'settings':
        if (hasAccess('Board Settings')) return `${basePath}/project-settings/board`;
        if (hasAccess('Sprint Settings')) return `${basePath}/project-settings/sprint`;
        if (hasAccess('Effort Settings')) return `${basePath}/project-settings/effort`;
        return `${basePath}/project-settings/board`;

      case 'trash':
        return `${basePath}/project-trash`;

      case 'my-account':
        return '/my-account';

      default:
        return basePath;
    }
  };

  const onTabChange = (value: string) => {
    const route = getDefaultRouteForTab(value);
    if (route) {
      router.push(route);
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
                    asChild
                    className={cn(
                      "data-[state=active]:bg-background data-[state=active]:text-foreground",
                      showInitialTabsOnly && !dynamicTab && "pointer-events-none cursor-default"
                    )}
                  >
                    <Link href={getDefaultRouteForTab('initial-estimation')}>Initial Estimation</Link>
                  </TabsTrigger>
                )}
                {!showInitialTabsOnly && (
                  <>
                    {(hasAccess('Project Status') || hasAccess('PM Dashboard') || hasAccess('Specifications')) && (
                      <TabsTrigger value="project" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('project')}>Project Details</Link>
                      </TabsTrigger>
                    )}
                    {(hasAccess('Project Resources') || hasAccess('Worklog') || hasAccess('Resource Workload') || hasAccess('Project Gantt')) && (
                      <TabsTrigger value="resources" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('resources')}>Resources</Link>
                      </TabsTrigger>
                    )}
                    {hasAccess('Project Releases') && (
                      <TabsTrigger value="releases" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('releases')}>Releases</Link>
                      </TabsTrigger>
                    )}
                    {(hasAccess('Development Dashboard') || hasAccess('Product Backlog') || hasAccess('Grooming') || hasAccess('Kanban Board') || hasAccess('Sub-Tasks') || hasAccess('Defect Tracker')) && (
                      <TabsTrigger value="development" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('development')}>Development</Link>
                      </TabsTrigger>
                    )}
                    {(hasAccess('Test Dashboard') || hasAccess('Test Backlog') || hasAccess('Test Backlogs') || hasAccess('Test Cycle') || hasAccess('Test Cycles') || hasAccess('Test Plan') || hasAccess('Test Execution') || hasAccess('Test Executions') || hasAccess('Defects')) && (
                      <TabsTrigger value="testing" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('testing')}>Testing</Link>
                      </TabsTrigger>
                    )}
                    {(hasAccess('RAID Dashboard') || hasAccess('Risks') || hasAccess('Assumptions') || hasAccess('Issues') || hasAccess('Dependencies')) && (
                      <TabsTrigger value="governance" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('governance')}>Governance</Link>
                      </TabsTrigger>
                    )}
                    {(hasAccess('Project Holiday Calendar') || hasAccess('Leave Calendar')) && (
                      <TabsTrigger value="holidays" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('holidays')}>Holidays</Link>
                      </TabsTrigger>
                    )}
                    {(hasAccess('PMO Documents') || hasAccess('PMO FB Billing') || hasAccess('PMO FB Payment Milestones') || hasAccess('PMO TnM Billing') || hasAccess('PMO TnM Payment Milestones') || hasAccess('Business Continuity')) && (
                      <TabsTrigger value="pmo" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('pmo')}>PMO</Link>
                      </TabsTrigger>
                    )}
                    {(hasAccess('Board Settings') || hasAccess('Sprint Settings') || hasAccess('Effort Settings')) && (
                      <TabsTrigger value="settings" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('settings')} className="flex items-center gap-1.5">
                          <Settings className="h-4 w-4" />
                          <span>Project Settings</span>
                        </Link>
                      </TabsTrigger>
                    )}
                    {hasAccess('Project Trash') && (
                      <TabsTrigger value="trash" asChild className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Link href={getDefaultRouteForTab('trash')} className="flex items-center gap-1.5">
                          <Trash2 className="h-4 w-4" />
                          <span>Project Trash</span>
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
