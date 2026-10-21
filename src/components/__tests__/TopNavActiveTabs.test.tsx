import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, Trash2, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

function MockPortfolioTopNav({ activeTab }: { activeTab: string }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="my-projects" asChild>
            <Link href="/my-projects">My Projects</Link>
          </TabsTrigger>
          <TabsTrigger
            value="portfolios"
            asChild
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:text-emerald-600 px-2.5",
              activeTab === 'portfolios' && "bg-background text-emerald-600 font-semibold"
            )}
          >
            <Link href="/portfolio-settings" aria-label="Portfolio Settings">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center">
                    <Settings data-testid="settings-icon" className="h-4 w-4" />
                    <span className="sr-only">Portfolio Settings</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Portfolio Settings</TooltipContent>
              </Tooltip>
            </Link>
          </TabsTrigger>
          <TabsTrigger
            value="trash"
            asChild
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:text-emerald-600 px-2.5",
              activeTab === 'trash' && "bg-background text-emerald-600 font-semibold"
            )}
          >
            <Link href="/portfolio-trash" aria-label="Portfolio Trash">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center">
                    <Trash2 data-testid="trash-icon" className="h-4 w-4" />
                    <span className="sr-only">Portfolio Trash</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Portfolio Trash</TooltipContent>
              </Tooltip>
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </TooltipProvider>
  );
}

function MockProjectTopNav({ activeTab }: { activeTab: string }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="project" asChild>
            <Link href="/projects/P1/project-details">Project Details</Link>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            asChild
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:text-foreground px-2.5",
              activeTab === 'settings' && "bg-background text-foreground font-semibold border border-emerald-500/40 shadow-sm"
            )}
          >
            <Link href="/projects/P1/project-settings/board" aria-label="Project Settings">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center">
                    <Settings data-testid="project-settings-icon" className="h-4 w-4" />
                    <span className="sr-only">Project Settings</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Project Settings</TooltipContent>
              </Tooltip>
            </Link>
          </TabsTrigger>
          <TabsTrigger
            value="trash"
            asChild
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:text-foreground px-2.5",
              activeTab === 'trash' && "bg-background text-foreground font-semibold border border-emerald-500/40 shadow-sm"
            )}
          >
            <Link href="/projects/P1/project-trash" aria-label="Project Trash">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center">
                    <Trash2 data-testid="project-trash-icon" className="h-4 w-4" />
                    <span className="sr-only">Project Trash</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Project Trash</TooltipContent>
              </Tooltip>
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </TooltipProvider>
  );
}

function MockProjectSidebar({ pathname, projectId = 'P1' }: { pathname: string; projectId?: string }) {
  const basePath = `/projects/${projectId}`;
  const isTrashPath = pathname.startsWith(`${basePath}/project-trash`) || pathname.startsWith(`${basePath}/trash`);
  const isDevelopmentPath = pathname.startsWith(`${basePath}/development`);

  const devMenuItems = [
    { href: `${basePath}/development/dashboard`, label: "Development Dashboard" },
    { href: `${basePath}/development/backlog`, label: "Product Backlog" },
    { href: `${basePath}/development/development-tasks`, label: "Sub-Tasks" },
    { href: `${basePath}/development/grooming`, label: "Grooming" },
    { href: `${basePath}/development/kanban`, label: "Kanban Board" },
  ];

  const trashMenuItems = [
    { href: `${basePath}/project-trash`, label: "Project Trash" },
  ];

  const menuItems = isTrashPath ? trashMenuItems : (isDevelopmentPath ? devMenuItems : devMenuItems);

  const isItemActive = (href: string) => {
    const cleanHref = href.replace(/\/$/, '');
    const cleanPath = pathname.replace(/\/$/, '');
    return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`);
  };

  return (
    <nav data-testid="project-sidebar">
      <div data-testid="sidebar-universal">
        <Link href="/my-projects">
          <Home className="h-4 w-4" />
          <span>My Projects</span>
        </Link>
      </div>
      <ul data-testid="sidebar-section-items">
        {menuItems.map(item => (
          <li key={item.href}>
            <Link
              href={item.href}
              data-active={isItemActive(item.href)}
              className={cn(
                "flex items-center gap-2",
                isItemActive(item.href) && "text-emerald-600 bg-sidebar-accent font-medium border-l-2 border-emerald-500"
              )}
            >
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

describe('Top Navigation Active Tab Highlights', () => {
  it('highlights Portfolio Settings when activeTab is portfolios', () => {
    render(<MockPortfolioTopNav activeTab="portfolios" />);

    const settingsTab = screen.getByRole('tab', { name: /Portfolio Settings/i });
    expect(settingsTab).toHaveAttribute('data-state', 'active');
    expect(settingsTab.className).toContain('text-emerald-600');
    expect(settingsTab.className).toContain('bg-background');

    const trashTab = screen.getByRole('tab', { name: /Portfolio Trash/i });
    expect(trashTab).toHaveAttribute('data-state', 'inactive');
  });

  it('highlights Portfolio Trash when activeTab is trash', () => {
    render(<MockPortfolioTopNav activeTab="trash" />);

    const trashTab = screen.getByRole('tab', { name: /Portfolio Trash/i });
    expect(trashTab).toHaveAttribute('data-state', 'active');
    expect(trashTab.className).toContain('text-emerald-600');
    expect(trashTab.className).toContain('bg-background');

    const settingsTab = screen.getByRole('tab', { name: /Portfolio Settings/i });
    expect(settingsTab).toHaveAttribute('data-state', 'inactive');
  });

  it('highlights Project Settings when activeTab is settings', () => {
    render(<MockProjectTopNav activeTab="settings" />);

    const settingsTab = screen.getByRole('tab', { name: /Project Settings/i });
    expect(settingsTab).toHaveAttribute('data-state', 'active');
    expect(settingsTab.className).toContain('bg-background');
    expect(settingsTab.className).toContain('text-foreground');
  });

  it('highlights Project Trash when activeTab is trash', () => {
    render(<MockProjectTopNav activeTab="trash" />);

    const trashTab = screen.getByRole('tab', { name: /Project Trash/i });
    expect(trashTab).toHaveAttribute('data-state', 'active');
    expect(trashTab.className).toContain('bg-background');
    expect(trashTab.className).toContain('text-foreground');
  });
});

describe('Project Sidebar Trash Navigation', () => {
  it('populates only one tab saying Project Trash when on project trash route, keeping My Projects visible', () => {
    render(<MockProjectSidebar pathname="/projects/P1/project-trash" />);

    // My Projects is visible
    expect(screen.getByText('My Projects')).toBeInTheDocument();

    // Section items contain ONLY Project Trash
    expect(screen.getByText('Project Trash')).toBeInTheDocument();

    // Development items are NOT populated
    expect(screen.queryByText('Development Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Backlog')).not.toBeInTheDocument();
    expect(screen.queryByText('Sub-Tasks')).not.toBeInTheDocument();
    expect(screen.queryByText('Grooming')).not.toBeInTheDocument();
    expect(screen.queryByText('Kanban Board')).not.toBeInTheDocument();

    // Project Trash has active styling
    const trashLink = screen.getByRole('link', { name: 'Project Trash' });
    expect(trashLink).toHaveAttribute('data-active', 'true');
    expect(trashLink.className).toContain('text-emerald-600');
    expect(trashLink.className).toContain('border-emerald-500');
  });

  it('shows development menu items when on development route', () => {
    render(<MockProjectSidebar pathname="/projects/P1/development/dashboard" />);

    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('Development Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Product Backlog')).toBeInTheDocument();
    expect(screen.queryByText('Project Trash')).not.toBeInTheDocument();
  });
});

