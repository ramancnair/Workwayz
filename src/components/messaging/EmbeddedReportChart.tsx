'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WayFinderChartSpec, FpChartSpec } from '@/types/wayfinder-dashboard';

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

interface EmbeddedReportChartProps {
  chart: WayFinderChartSpec;
}

export function EmbeddedReportChart({ chart }: EmbeddedReportChartProps) {
  if (!chart || chart.type === 'none' || !Array.isArray(chart.data) || chart.data.length === 0) {
    return null;
  }

  const isPie = chart.type === 'pie';
  const colors = chart.colors && chart.colors.length > 0 ? chart.colors : PALETTE;

  return (
    <Card className="bg-card/70 border-border/80 shadow-sm my-4 overflow-hidden">
      <CardHeader className="p-4 pb-2 border-b border-border/50 bg-muted/20">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          {isPie ? (
            <PieChartIcon className="w-4 h-4 text-primary" />
          ) : (
            <BarChart3 className="w-4 h-4 text-primary" />
          )}
          <span>{chart.title || 'Analytics Visualization'}</span>
        </CardTitle>
        {chart.description && (
          <CardDescription className="text-xs text-muted-foreground">
            {chart.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="p-4 flex flex-col justify-center min-h-[280px]">
        {isPie ? (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: '12px',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--popover-foreground))',
                    fontWeight: 600,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Pie
                  data={chart.data}
                  dataKey={chart.dataKey}
                  nameKey={chart.categoryKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {chart.data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart.data}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey={chart.categoryKey}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.25)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: '12px',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--popover-foreground))',
                    fontWeight: 600,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  dataKey={chart.dataKey}
                  name={chart.dataKey}
                  fill={colors[0] || '#6366f1'}
                  radius={[4, 4, 0, 0]}
                />
                {chart.secondaryKey && (
                  <Bar
                    dataKey={chart.secondaryKey}
                    name={chart.secondaryKey}
                    fill={colors[1] || '#10b981'}
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
