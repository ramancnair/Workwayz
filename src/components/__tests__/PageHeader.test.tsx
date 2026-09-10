import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';

describe('PageHeader Component', () => {
  it('should render page title and subtitle description', () => {
    render(
      <PageHeader
        title="Portfolio Dashboard"
        description="High-level overview of portfolio health, timelines, and budgets"
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Portfolio Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('High-level overview of portfolio health, timelines, and budgets')).toBeInTheDocument();
  });

  it('should render action buttons and children passed into the header slot', () => {
    render(
      <PageHeader
        title="Project Resources"
        description="Manage assigned team members and skill allocations"
      >
        <button data-testid="add-resource-btn">Add Resource</button>
      </PageHeader>
    );

    expect(screen.getByTestId('add-resource-btn')).toBeInTheDocument();
    expect(screen.getByText('Add Resource')).toBeInTheDocument();
  });
});
