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
      releaseId: 'rel-1', // Explicit alignment
    },
    {
      id: 'sp-2',
      sprintId: 'SP-2',
      title: 'Sprint 2 - API Integration',
      status: 'Current',
      isCurrent: true,
      startDate: '2026-10-19T00:00:00.000Z',
      endDate: '2026-11-01T00:00:00.000Z',
      // No explicit releaseId, falls within rel-1 dates (date fallback)
    },
    {
      id: 'sp-3',
      sprintId: 'SP-3',
      title: 'Sprint 3 - Next Year Planning',
      status: 'Yet to Start',
      isCurrent: false,
      startDate: '2027-05-01T00:00:00.000Z',
      endDate: '2027-05-15T00:00:00.000Z',
      // Outside rel-1 dates and no explicit releaseId
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

    // Sprints should NOT be visible
    expect(screen.queryByText('Sprint 1 - Core Foundations')).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint 2 - API Integration')).not.toBeInTheDocument();
  });

  it('renders aligned sprints under the parent release when showSprints is true', () => {
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

    // Explicitly aligned sprint should be visible
    expect(screen.getAllByText('Sprint 1 - Core Foundations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SP-1').length).toBeGreaterThan(0);

    // Date fallback aligned sprint should be visible
    expect(screen.getAllByText('Sprint 2 - API Integration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SP-2').length).toBeGreaterThan(0);

    // Unaligned distant sprint should NOT be in this release
    expect(screen.queryByText('Sprint 3 - Next Year Planning')).not.toBeInTheDocument();
  });
});
