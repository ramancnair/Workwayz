import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '../dashboard/StatsCard';
import { Activity, DollarSign } from 'lucide-react';

describe('StatsCard Component', () => {
  it('should render title and value correctly', () => {
    render(
      <StatsCard
        title="Active Projects"
        value="12"
        icon={Activity}
      />
    );

    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <StatsCard
        title="Total Revenue"
        value="$125,000"
        icon={DollarSign}
        description="+14% from last quarter"
      />
    );

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$125,000')).toBeInTheDocument();
    expect(screen.getByText('+14% from last quarter')).toBeInTheDocument();
  });
});
