import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortfolioDashboardPage from '../page';

const mockGetDocs = vi.fn();

vi.mock('@/lib/db-provider', () => ({
  db: {},
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  query: (col: { path: string }) => col,
  where: () => ({}),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

function makeSnapshot<T extends Record<string, unknown>>(items: Array<T & { id: string }>) {
  const docs = items.map((item) => ({
    id: item.id,
    data: () => {
      const { id: _id, ...rest } = item;
      return rest;
    },
  }));
  return {
    docs,
    forEach: (cb: (d: (typeof docs)[number]) => void) => docs.forEach(cb),
  };
}

describe('PortfolioDashboardPage — Unified Open Defects by Project (Option A)', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();

    mockGetDocs.mockImplementation(async (ref: { path: string }) => {
      switch (ref.path) {
        case 'portfolios':
          return makeSnapshot([{ id: 'port-1', name: 'Core Engineering' }]);
        case 'projects':
          return makeSnapshot([
            { id: 'p-alpha', name: 'Alpha Platform', status: 'Active', overallStatus: 'Green', portfolioId: 'port-1' },
            { id: 'p-beta', name: 'Beta Checkout', status: 'Active', overallStatus: 'Amber', portfolioId: 'port-1' },
            { id: 'p-gamma', name: 'Gamma Clean', status: 'Active', overallStatus: 'Green', portfolioId: 'port-1' },
          ]);
        case 'projects/p-alpha/stories':
          // 10 open bugs: 1 Critical, 3 High, 4 Medium (1 untyped Bug defaults to Medium), 2 Low
          // Plus 1 Closed Critical bug & 1 soft-deleted High bug (both must be excluded)
          return makeSnapshot([
            { id: 's1', itemType: 'Bug', severity: 'Critical', status: 'In Progress' },
            { id: 's2', itemType: 'Bug', severity: 'High', status: 'To Do' },
            { id: 's3', itemType: 'In-Sprint Bug', severity: 'High', status: 'To Do' },
            { id: 's4', itemType: 'Bug / Defect', severity: 'High', status: 'In QA' },
            { id: 's5', itemType: 'Bug', severity: 'Medium', status: 'To Do' },
            { id: 's6', itemType: 'Bug', severity: 'Medium', status: 'To Do' },
            { id: 's7', itemType: 'Bug', severity: 'Medium', status: 'To Do' },
            { id: 's8', itemType: 'Bug', status: 'To Do' }, // defaults to Medium
            { id: 's9', itemType: 'Bug', severity: 'Low', status: 'To Do' },
            { id: 's10', itemType: 'Bug', severity: 'Low', status: 'To Do' },
            { id: 's11', itemType: 'Bug', severity: 'Critical', status: 'Done' }, // closed -> excluded
            { id: 's12', itemType: 'Bug', severity: 'High', status: 'To Do', isDeleted: true }, // deleted -> excluded
            { id: 's13', itemType: 'User Story', status: 'To Do' }, // non-bug -> excluded
          ]);
        case 'projects/p-beta/stories':
          // 5 open bugs, but 4 are Critical and 1 is Low!
          return makeSnapshot([
            { id: 'b1', itemType: 'Bug', severity: 'Critical', status: 'To Do' },
            { id: 'b2', itemType: 'Bug', severity: 'Critical', status: 'To Do' },
            { id: 'b3', itemType: 'Bug', severity: 'Critical', status: 'In Progress' },
            { id: 'b4', itemType: 'Bug', severity: 'Critical', status: 'To Do' },
            { id: 'b5', itemType: 'Bug', severity: 'Low', status: 'To Do' },
          ]);
        default:
          return makeSnapshot([]);
      }
    });
  });

  it('consolidates defect distribution into proportional stacked project bars, side totals, and By Critical sorting', async () => {
    const user = userEvent.setup();
    render(<PortfolioDashboardPage />);

    // Wait for loading spinner to clear and top KPI card to display 15 open defects (10 + 5)
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
    expect(screen.getByText('5 Critical')).toBeInTheDocument();
    expect(screen.getByText('3 High')).toBeInTheDocument();

    // Switch to Quality & Tech Debt tab
    await user.click(screen.getByRole('tab', { name: /Quality & Tech Debt/i }));

    // Unified card is visible; legacy redundant titles are absent
    const card = await screen.findByTestId('project-defect-distribution-card');
    expect(card).toBeInTheDocument();
    expect(screen.getByText('Open Defects by Project')).toBeInTheDocument();
    expect(screen.queryByText('Defect Severity Distribution')).not.toBeInTheDocument();
    expect(screen.queryByText('Top Defect Hotspots')).not.toBeInTheDocument();

    // Verify default sorting ('By Total'): Alpha Platform (10 bugs, 100% bar) before Beta Checkout (5 bugs, 50% bar)
    const rowsByTotal = screen.getAllByTestId('project-defect-row');
    expect(rowsByTotal).toHaveLength(2);
    expect(rowsByTotal[0]).toHaveTextContent('1. Alpha Platform');
    expect(rowsByTotal[0]).toHaveTextContent('10bugs');
    expect(rowsByTotal[1]).toHaveTextContent('2. Beta Checkout');
    expect(rowsByTotal[1]).toHaveTextContent('5bugs');

    const bars = screen.getAllByTestId('project-defect-bar');
    expect(bars[0]).toHaveStyle({ width: '100%' });
    expect(bars[1]).toHaveStyle({ width: '50%' });

    // Zero-defect active project summary note
    expect(screen.getByText(/1 active project has zero open bugs\./i)).toBeInTheDocument();

    // Toggle to 'By Critical': Beta Checkout (4 Critical) moves ahead of Alpha Platform (1 Critical)
    await user.click(screen.getByRole('button', { name: 'By Critical' }));
    const rowsByCritical = screen.getAllByTestId('project-defect-row');
    expect(rowsByCritical[0]).toHaveTextContent('1. Beta Checkout');
    expect(rowsByCritical[1]).toHaveTextContent('2. Alpha Platform');
  });
});

