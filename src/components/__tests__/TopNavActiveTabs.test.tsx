import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function MockPortfolioTopNav({ activeTab }: { activeTab: string }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="my-projects" asChild>
            <a href="/my-projects">My Projects</a>
          </TabsTrigger>
          <TabsTrigger
            value="portfolios"
            asChild
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:text-emerald-600 px-2.5",
              activeTab === 'portfolios' && "bg-background text-emerald-600 font-semibold"
            )}
          >
            <a href="/portfolio-settings" aria-label="Portfolio Settings">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center">
                    <Settings data-testid="settings-icon" className="h-4 w-4" />
                    <span className="sr-only">Portfolio Settings</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Portfolio Settings</TooltipContent>
              </Tooltip>
            </a>
          </TabsTrigger>
          <TabsTrigger
            value="trash"
            asChild
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:text-emerald-600 px-2.5",
              activeTab === 'trash' && "bg-background text-emerald-600 font-semibold"
            )}
          >
            <a href="/portfolio-trash" aria-label="Portfolio Trash">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center">
                    <Trash2 data-testid="trash-icon" className="h-4 w-4" />
                    <span className="sr-only">Portfolio Trash</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Portfolio Trash</TooltipContent>
              </Tooltip>
            </a>
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
            <a href="/projects/P1/project-details">Project Details</a>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            asChild
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:text-foreground px-2.5",
              activeTab === 'settings' && "bg-background text-foreground font-semibold border border-emerald-500/40 shadow-sm"
            )}
          >
            <a href="/projects/P1/project-settings/board" aria-label="Project Settings">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center">
                    <Settings data-testid="project-settings-icon" className="h-4 w-4" />
                    <span className="sr-only">Project Settings</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Project Settings</TooltipContent>
              </Tooltip>
            </a>
          </TabsTrigger>
          <TabsTrigger
            value="trash"
            asChild
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:text-foreground px-2.5",
              activeTab === 'trash' && "bg-background text-foreground font-semibold border border-emerald-500/40 shadow-sm"
            )}
          >
            <a href="/projects/P1/project-trash" aria-label="Project Trash">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center">
                    <Trash2 data-testid="project-trash-icon" className="h-4 w-4" />
                    <span className="sr-only">Project Trash</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Project Trash</TooltipContent>
              </Tooltip>
            </a>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </TooltipProvider>
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
