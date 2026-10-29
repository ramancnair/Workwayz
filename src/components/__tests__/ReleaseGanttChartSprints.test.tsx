import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReleaseGanttChart } from '../ReleaseGanttChart';
import { type Release, type Sprint } from '@/types';

describe('ReleaseGanttChart with Sprints Alignment', () => {
  const mockReleases: Release[] = [
    {
      id: 'rel-1',
      releaseId: 'REL-1',
      name: 'v1.0 Production Release',
      description: 'Major production release',
      itemType: 'Release',
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-11-30T00:00:00.000Z',
    },
    {
      id: 'stg-1',
      releaseId: 'S-1',
      name: 'Development Phase',
      description: 'Dev stage',
      itemType: 'Stage',
      parentReleaseId: 'rel-1',
      startDate: '2026-10-05T00:00:00.000Z',
      endDate: '2026-10-25T00:00:00.000Z',
    },
  ];

  const mockSprints: Sprint[] = [
    {
      id: 'sp-1',
      sprintId: 'SP-1',
      title: 'Sprint 1 - Core Foundations',
      status: 'Completed',
      isCurrent: false,
      startDate: '2026-10-05T00:00:00.000Z',
      endDate: '2026-10-18T00:00:00.000Z',
      releaseId: 'rel-1', // Explicitly aligned to rel-1
    },
    {
      id: 'sp-2',
      sprintId: 'SP-2',
      title: 'Sprint 2 - API Integration',
      status: 'Current',
      isCurrent: true,
      startDate: '2026-10-19T00:00:00.000Z',
      endDate: '2026-11-01T00:00:00.000Z',
      // Unassigned (Non-Release sprint)
    },
    {
      id: 'sp-3',
      sprintId: 'SP-3',
      title: 'Sprint 3 - Next Year Planning',
      status: 'Yet to Start',
      isCurrent: false,
      startDate: '2027-05-01T00:00:00.000Z',
      endDate: '2027-05-15T00:00:00.000Z',
      // Unassigned (Non-Release sprint)
    },
  ];

  it('renders releases and stages normally when showSprints is false', () => {
    render(
      <ReleaseGanttChart
        releases={mockReleases}
        sprints={mockSprints}
        showSprints={false}
      />
    );

    expect(screen.getAllByText('v1.0 Production Release').length).toBeGreaterThan(0);

    // Expand the release
    const releaseHeaders = screen.getAllByText('v1.0 Production Release');
    fireEvent.click(releaseHeaders[0]);

    // Stage should be visible
    expect(screen.getAllByText('Development Phase').length).toBeGreaterThan(0);

    // Sprints should NOT be visible when toggle is off
    expect(screen.queryByText('Sprint 1 - Core Foundations')).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint 2 - API Integration')).not.toBeInTheDocument();
    expect(screen.queryByText('Non-Release Sprints')).not.toBeInTheDocument();
  });

  it('renders explicitly aligned sprints under release and unaligned sprints in Non-Release Sprints group', () => {
    render(
      <ReleaseGanttChart
        releases={mockReleases}
        sprints={mockSprints}
        showSprints={true}
      />
    );

    // Expand the release
    const releaseHeaders = screen.getAllByText('v1.0 Production Release');
    fireEvent.click(releaseHeaders[0]);

    // Explicitly aligned sprint (sp-1) MUST be visible under release
    expect(screen.getAllByText('Sprint 1 - Core Foundations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SP-1').length).toBeGreaterThan(0);

    // Non-Release Sprints group should exist
    expect(screen.getAllByText('Non-Release Sprints').length).toBeGreaterThan(0);

    // The unassigned sprints (sp-2, sp-3) are rendered under the Non-Release Sprints group
    expect(screen.getAllByText('Sprint 2 - API Integration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SP-2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sprint 3 - Next Year Planning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SP-3').length).toBeGreaterThan(0);
  });
});
