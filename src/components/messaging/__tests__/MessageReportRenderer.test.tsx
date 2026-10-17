import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageReportRenderer } from '../MessageReportRenderer';

// Mock Recharts since happy-dom does not measure SVG bounding boxes
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('MessageReportRenderer', () => {
  it('renders standard plain text for non-report messages', () => {
    render(<MessageReportRenderer body="Hello, can you review the sprint backlog?" />);
    expect(screen.getByText(/Hello, can you review the sprint backlog/i)).toBeInTheDocument();
  });

  it('renders rich report layout, KPIs, and embedded chart when chart spec is present', () => {
    const chartSpec = {
      type: 'bar',
      title: 'Bugs Opened vs Closed',
      dataKey: 'Open',
      secondaryKey: 'Closed',
      categoryKey: 'name',
      data: [
        { name: 'Critical', Open: 2, Closed: 1, Total: 3 },
        { name: 'High', Open: 4, Closed: 2, Total: 6 },
      ],
      colors: ['#ef4444', '#10b981'],
    };

    const kpiSpec = [
      { id: 'k1', label: 'Total Defects', value: 9, subtext: '3 resolved', status: 'neutral' },
      { id: 'k2', label: 'Open Defects', value: 6, status: 'warning' },
    ];

    const messageBody = [
      '### 📊 Scheduled Automated Report: Bug Status Analysis',
      '*Triggered via **Manual Run** on Sep 19, 2026 at 03:37 PM*',
      '**Original Query:** *"Give me a graph of bugs opened vs closed today"*',
      '**Scope:** Project (Microservices Migration)',
      '#### 📌 Executive Takeaways',
      '• Identified 9 total logged defects in project.',
      `<!--fp-chart-start-->\n${JSON.stringify(chartSpec)}\n<!--fp-chart-end-->`,
      `<!--fp-kpis-start-->\n${JSON.stringify(kpiSpec)}\n<!--fp-kpis-end-->`,
      '[WayFinder Dashboard](/projects/P1/project-details/fp-pm-dash)',
    ].join('\n');

    render(<MessageReportRenderer body={messageBody} />);

    expect(screen.getByText('Bug Status Analysis')).toBeInTheDocument();
    expect(screen.getByText(/Identified 9 total logged defects/i)).toBeInTheDocument();
    expect(screen.getByText('Total Defects')).toBeInTheDocument();
    expect(screen.getByText('Open Defects')).toBeInTheDocument();
    expect(screen.getByText('Bugs Opened vs Closed')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('detects defect breakdown in existing legacy reports and renders the visual chart', () => {
    const legacyBody = [
      '### 📊 Scheduled Automated Report: Bug Status & Resolution Analysis - Microservices Architecture Migration',
      '*Triggered via **Manual Run** on Sep 19, 2026 at 03:37 PM*',
      '**Original Query:** *"Give me a graph of bugs opened vs closed today"*',
      '**Scope:** Project (Microservices Architecture Migration (Batch 26-2))',
      '#### 📌 Executive Takeaways',
      '• Identified 46 total logged defect(s) in project.',
      '• Attention: 16 Critical or High priority defect(s) are currently active and unresolved.',
      '#### 📈 Key Metrics',
      '* **Total Defects Logged:** 46 (5 resolved)',
      '* **Open Defects:** 41 (Active attention required)',
      '#### 📊 Defects by Severity & Resolution Status',
      '* **Critical:** 7 (Closed: 1)',
      '* **High:** 9 (Closed: 1)',
      '* **Medium:** 11 (Closed: 1)',
      '* **Low:** 14 (Closed: 2)',
      '---',
      '*Records analyzed: 446 | View full live charts on the [FlowPilot Dashboard](/projects/P2600002/project-details/fp-pm-dash).*',
    ].join('\n');

    render(<MessageReportRenderer body={legacyBody} />);

    expect(screen.getByText(/Bug Status & Resolution Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Defects Logged/i)).toBeInTheDocument();
    expect(screen.getByText('46')).toBeInTheDocument();
    expect(screen.getByText('Defects by Severity & Resolution Status')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
