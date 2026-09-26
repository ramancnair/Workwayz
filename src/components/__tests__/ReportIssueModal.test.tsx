import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportIssueModal } from '../ReportIssueModal';

describe('ReportIssueModal Component', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders technical details section and icon-only copy button when initialError is provided', () => {
    render(
      <ReportIssueModal
        open={true}
        onOpenChange={vi.fn()}
        initialError={{
          name: 'ReferenceError',
          message: "Cannot access 'activeProjectsByPortfolio' before initialization",
          stack: 'ReferenceError: at ProjectsDashboard line 765',
        }}
      />
    );

    expect(screen.getByText('Captured Technical Details')).toBeInTheDocument();

    const copyBtn = screen.getByLabelText('Copy technical details');
    expect(copyBtn).toBeInTheDocument();

    // Verify button does NOT contain "Copy" as text (icon only)
    expect(copyBtn.textContent).toBe('');
  });

  it('copies technical error details to clipboard when copy icon is clicked', async () => {
    render(
      <ReportIssueModal
        open={true}
        onOpenChange={vi.fn()}
        initialError={{
          name: 'ReferenceError',
          code: 'ERR_TDZ',
          message: "Cannot access 'activeProjectsByPortfolio' before initialization",
          stack: 'ReferenceError: at ProjectsDashboard line 765',
        }}
      />
    );

    const copyBtn = screen.getByLabelText('Copy technical details');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("ReferenceError: Cannot access 'activeProjectsByPortfolio' before initialization")
      );
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('ERR_TDZ')
      );
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('ReferenceError: at ProjectsDashboard line 765')
      );
    });
  });

  it('toggles technical details visibility when clicking the accordion trigger', () => {
    render(
      <ReportIssueModal
        open={true}
        onOpenChange={vi.fn()}
        initialError={{
          name: 'ReferenceError',
          message: "Cannot access 'activeProjectsByPortfolio' before initialization",
          stack: 'ReferenceError: at ProjectsDashboard line 765',
        }}
      />
    );

    // Initially collapsed
    expect(screen.queryByText(/at ProjectsDashboard line 765/)).not.toBeInTheDocument();

    // Click accordion trigger
    const accordionBtn = screen.getByRole('button', { name: /Captured Technical Details/i });
    fireEvent.click(accordionBtn);

    // Expanded
    expect(screen.getByText(/at ProjectsDashboard line 765/)).toBeInTheDocument();
  });
});
