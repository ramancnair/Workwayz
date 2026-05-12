'use client';

import React, { useMemo, useRef } from 'react';
import { useProject } from '@/context/ProjectContext';
import {
  format, parseISO, differenceInDays, addDays,
  startOfWeek, endOfWeek, eachDayOfInterval, isWeekend,
} from 'date-fns';
import { Story } from '@/types';

// ── Colour palette matching Project Plan SYSTEM_COLORS ────────────────────────
// Each entry: bg=base bar colour, shades=[todo, inprogress, done], text=label colour
const SYSTEM_COLOR_HEX = [
  { bg: '#3b82f6', shades: ['#93c5fd', '#3b82f6', '#1d4ed8'], text: '#ffffff', label: '#1d4ed8' }, // blue
  { bg: '#22c55e', shades: ['#86efac', '#22c55e', '#15803d'], text: '#ffffff', label: '#15803d' }, // green
  { bg: '#a855f7', shades: ['#d8b4fe', '#a855f7', '#7e22ce'], text: '#ffffff', label: '#7e22ce' }, // purple
  { bg: '#ec4899', shades: ['#f9a8d4', '#ec4899', '#be185d'], text: '#ffffff', label: '#be185d' }, // pink
  { bg: '#eab308', shades: ['#fde047', '#eab308', '#a16207'], text: '#1a1a1a', label: '#92400e' }, // yellow
  { bg: '#6366f1', shades: ['#a5b4fc', '#6366f1', '#4338ca'], text: '#ffffff', label: '#4338ca' }, // indigo
  { bg: '#f97316', shades: ['#fdba74', '#f97316', '#c2410c'], text: '#ffffff', label: '#c2410c' }, // orange
  { bg: '#14b8a6', shades: ['#5eead4', '#14b8a6', '#0f766e'], text: '#ffffff', label: '#0f766e' }, // teal
  { bg: '#06b6d4', shades: ['#67e8f9', '#06b6d4', '#0e7490'], text: '#1a1a1a', label: '#0e7490' }, // cyan
];

// Returns shade index: 0=To Do (lightest), 1=In Progress (mid), 2=Done (darkest)
function statusShadeIdx(status: string): number {
  if (status === 'Done') return 2;
  if (status === 'In Progress' || status === 'In Development' || status === 'In QA') return 1;
  return 0; // To Do / default
}

const DAY_W  = 28;   // px per calendar day
const ROW_H  = 40;   // px per sub-row (taller for legibility)
const LEFT_W = 260;  // px for the left label panel
const HEADER_H = 52; // px for the dual-row timeline header

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubRow {
  systemId: string;
  systemName: string;
  colorIdx: number;
  developerId: string | null;
  developerName: string;
  tasks: Story[];
  totalEffort: number;
  startDate: Date | null;
  endDate: Date | null;
}

interface SystemBlock {
  systemId: string;
  systemName: string;
  colorIdx: number;
  subRows: SubRow[];
  maxEffort: number;
}

// ── Helper ────────────────────────────────────────────────────────────────────
function getEffort(s: Story, hoursPerDay: number): number {
  if (s.effortDays != null) return Number(s.effortDays);
  if (s.estimatedHours != null) return Math.ceil(Number(s.estimatedHours) / hoursPerDay);
  return 0;
}

export function CpmChart() {
  const {
    stories, releasesAndMilestones, holidays, weeklyOffDays,
    employees, impactedSystems, projectSettings,
  } = useProject();

  const hoursPerDay = projectSettings?.manDayToHours ?? 8;
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef   = useRef<HTMLDivElement>(null);

  // ── Derive CPM data ──────────────────────────────────────────────────────────
  const { systemBlocks, minDate, timelineDays, criticalPathDays, totalRows } = useMemo(() => {
    const nonBug   = stories.filter(s => !s.isDeleted && s.itemType !== 'Bug');
    const reqItems = nonBug.filter(s =>
      ['Requirement/Story', 'Feature Change', 'Task'].includes(s.itemType)
    );
    const subItems = nonBug.filter(s => s.itemType === 'Sub Task');

    const sysColorMap = new Map<string, number>();
    (impactedSystems ?? []).forEach((sys, i) => sysColorMap.set(sys.id, i));

    const bySystem = new Map<string, Story[]>();
    for (const sub of subItems) {
      if (!sub.impactedSystemId) continue;
      if (!bySystem.has(sub.impactedSystemId)) bySystem.set(sub.impactedSystemId, []);
      bySystem.get(sub.impactedSystemId)!.push(sub);
    }

    const blocks: SystemBlock[] = [];
    let globalMin: Date | null = null;
    let globalMax: Date | null = null;

    for (const sys of (impactedSystems ?? [])) {
      const tasks = bySystem.get(sys.id);
      if (!tasks || tasks.length === 0) continue;

      const colorIdx = sysColorMap.get(sys.id) ?? 0;

      const byDev = new Map<string, Story[]>();
      const unassigned: Story[] = [];
      for (const t of tasks) {
        if (t.assigneeId) {
          if (!byDev.has(t.assigneeId)) byDev.set(t.assigneeId, []);
          byDev.get(t.assigneeId)!.push(t);
        } else {
          unassigned.push(t);
        }
      }

      const subRows: SubRow[] = [];

      const buildSubRow = (devId: string | null, devTasks: Story[]): SubRow => {
        const emp = devId ? employees?.find(e => e.id === devId) : null;
        const developerName = emp
          ? `${emp.firstName} ${emp.lastName}`
          : devId ? 'Unknown' : '(Unassigned)';

        let rowStart: Date | null = null;
        let rowEnd:   Date | null = null;
        let totalEffort = 0;

        for (const t of devTasks) {
          totalEffort = totalEffort + getEffort(t, hoursPerDay);

          let tStart = t.startDate ? parseISO(t.startDate) : null;
          let tEnd   = t.endDate   ? parseISO(t.endDate)   : null;

          if (!tStart && t.parentStoryId) {
            const parent = reqItems.find(r => r.id === t.parentStoryId);
            if (parent?.startDate) tStart = parseISO(parent.startDate);
          }
          if (!tEnd && t.parentStoryId) {
            const parent = reqItems.find(r => r.id === t.parentStoryId);
            if (parent?.endDate) tEnd = parseISO(parent.endDate);
          }

          if (tStart && (!rowStart || tStart < rowStart)) rowStart = tStart;
          if (tEnd   && (!rowEnd   || tEnd   > rowEnd))   rowEnd   = tEnd;
        }

        if (rowStart && (!globalMin || rowStart < globalMin)) globalMin = rowStart;
        if (rowEnd   && (!globalMax || rowEnd   > globalMax)) globalMax = rowEnd;

        return {
          systemId: sys.id, systemName: sys.name, colorIdx,
          developerId: devId, developerName, tasks: devTasks,
          totalEffort, startDate: rowStart, endDate: rowEnd,
        };
      };

      if (byDev.size <= 1 && unassigned.length === 0) {
        const [devId, devTasks] = byDev.size === 1 ? [...byDev.entries()][0] : [null, unassigned];
        subRows.push(buildSubRow(devId ?? null, devTasks));
      } else {
        for (const [devId, devTasks] of byDev.entries()) {
          subRows.push(buildSubRow(devId, devTasks));
        }
        if (unassigned.length > 0) subRows.push(buildSubRow(null, unassigned));
      }

      blocks.push({
        systemId: sys.id, systemName: sys.name, colorIdx,
        subRows,
        maxEffort: Math.max(...subRows.map(r => r.totalEffort), 0),
      });
    }

    const criticalPathDays = Math.max(...blocks.map(b => b.maxEffort), 0);

    let minD = globalMin ?? new Date();
    let maxD = globalMax ?? addDays(minD, 30);
    minD = addDays(startOfWeek(minD), -7);
    maxD = addDays(endOfWeek(maxD), 7);

    return {
      systemBlocks: blocks,
      minDate: minD,
      timelineDays: eachDayOfInterval({ start: minD, end: maxD }),
      criticalPathDays,
      totalRows: blocks.reduce((s, b) => s + b.subRows.length, 0),
    };
  }, [stories, releasesAndMilestones, impactedSystems, employees, holidays, weeklyOffDays, hoursPerDay]);

  // Month groups for header
  const monthGroups = useMemo(() => {
    const groups: { label: string; days: number }[] = [];
    let cur = '', cnt = 0;
    for (const d of timelineDays) {
      const lbl = format(d, 'MMM yyyy');
      if (lbl === cur) { cnt++; }
      else { if (cur) groups.push({ label: cur, days: cnt }); cur = lbl; cnt = 1; }
    }
    if (cur) groups.push({ label: cur, days: cnt });
    return groups;
  }, [timelineDays]);

  const chartWidth  = timelineDays.length * DAY_W;
  const chartHeight = totalRows * ROW_H;

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };

  if (systemBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
        <p className="text-sm">No sub-tasks with impacted systems found.</p>
        <p className="text-xs mt-1">Add sub-tasks with an assigned impacted system to see the CPM chart.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden border rounded-md shadow-sm bg-background">

      {/* ── Summary bar ── */}
      <div className="flex items-center gap-6 px-4 py-2 border-b bg-muted/30 shrink-0 text-sm">
        <span className="font-semibold">Critical Path Method</span>
        <span className="text-muted-foreground">
          Critical Path Duration:
          <span className="ml-1 font-bold text-foreground">
            {criticalPathDays} day{criticalPathDays !== 1 ? 's' : ''}
          </span>
        </span>
        <span className="text-muted-foreground text-xs">
          (longest impacted-system row by total sub-task effort)
        </span>
        {/* Shade legend */}
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm opacity-60 bg-slate-400" />
            To Do
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-500" />
            In Progress
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-700" />
            Done
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Left label panel ── */}
        <div className="shrink-0 flex flex-col" style={{ width: LEFT_W }}>

          {/* Column header */}
          <div
            className="border-b border-r bg-muted shrink-0 flex items-end px-3 pb-2"
            style={{ height: HEADER_H }}
          >
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              System / Developer
            </span>
          </div>

          {/* Row labels — scroll locked to body */}
          <div className="overflow-hidden flex-1 border-r">
            {systemBlocks.map((block) => {
              const color  = SYSTEM_COLOR_HEX[block.colorIdx % SYSTEM_COLOR_HEX.length];
              const isCrit = block.maxEffort === criticalPathDays && criticalPathDays > 0;
              const blockH = block.subRows.length * ROW_H;

              return (
                <div
                  key={block.systemId}
                  style={{ height: blockH }}
                  className="flex border-b last:border-b-0"
                >
                  {/* Bold coloured stripe */}
                  <div
                    style={{
                      width: 8,
                      background: color.bg,
                      flexShrink: 0,
                      borderRight: isCrit ? `2px solid ${color.label}` : undefined,
                    }}
                  />

                  {/* Labels */}
                  <div className="flex flex-col flex-1 overflow-hidden">
                    {block.subRows.map((sr, si) => {
                      const isFirst = si === 0;
                      return (
                        <div
                          key={`${sr.systemId}-${sr.developerId ?? 'u'}-${si}`}
                          className="flex flex-col justify-center px-3 border-b last:border-b-0 overflow-hidden"
                          style={{
                            height: ROW_H,
                            background: isFirst ? color.bg + '18' : 'transparent',
                          }}
                        >
                          {/* System name — only on first sub-row */}
                          {isFirst && (
                            <span
                              className="text-[11px] font-bold truncate leading-tight"
                              style={{ color: color.label }}
                            >
                              {block.systemName}
                              {isCrit && (
                                <span
                                  className="ml-1 text-[9px] font-black"
                                  style={{ color: color.label }}
                                >
                                  ★
                                </span>
                              )}
                            </span>
                          )}
                          {/* Developer name */}
                          {block.subRows.length > 1 && (
                            <span className="text-[11px] font-medium text-foreground truncate leading-tight">
                              {sr.developerName}
                            </span>
                          )}
                          {/* Effort badge */}
                          <span
                            className="text-[10px] font-semibold leading-tight"
                            style={{ color: color.label, opacity: 0.75 }}
                          >
                            {sr.totalEffort} day{sr.totalEffort !== 1 ? 's' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right chart panel ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Timeline header */}
          <div
            ref={headerRef}
            className="border-b bg-muted shrink-0 overflow-hidden"
            style={{ height: HEADER_H }}
          >
            <div style={{ width: chartWidth }} className="h-full flex flex-col">
              <div className="flex border-b" style={{ height: 24 }}>
                {monthGroups.map((mg, i) => (
                  <div
                    key={i}
                    style={{ width: mg.days * DAY_W, minWidth: mg.days * DAY_W }}
                    className="border-r border-border flex items-center px-2 overflow-hidden"
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground truncate">
                      {mg.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex" style={{ height: 28 }}>
                {timelineDays.map((day, i) => (
                  <div
                    key={i}
                    style={{ width: DAY_W, minWidth: DAY_W }}
                    className={`border-r border-border flex items-center justify-center ${isWeekend(day) ? 'bg-muted-foreground/10' : ''}`}
                  >
                    <span className="text-[9px] text-muted-foreground">{format(day, 'd')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart body */}
          <div ref={bodyRef} className="flex-1 overflow-auto" onScroll={handleBodyScroll}>
            <div
              style={{ width: chartWidth, height: Math.max(chartHeight, 1) }}
              className="relative"
            >
              {/* Grid */}
              <div className="absolute inset-0 flex pointer-events-none">
                {timelineDays.map((day, i) => (
                  <div
                    key={i}
                    style={{ width: DAY_W }}
                    className={`h-full border-r border-border/20 ${isWeekend(day) ? 'bg-muted/30' : ''}`}
                  />
                ))}
              </div>

              {/* Arrows SVG */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: chartWidth, height: Math.max(chartHeight, 1) }}
              >
                <defs>
                  <marker id="cpm-arr" viewBox="0 0 10 10" refX="8" refY="5"
                    markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M0 0 L10 5 L0 10z" fill="hsl(var(--muted-foreground))" />
                  </marker>
                </defs>
                {(() => {
                  const arrows: React.ReactNode[] = [];
                  let rIdx = 0;
                  for (const block of systemBlocks) {
                    for (const sr of block.subRows) {
                      const y = rIdx * ROW_H + ROW_H / 2;
                      const sorted = [...sr.tasks]
                        .filter(t => t.startDate && t.endDate)
                        .sort((a, b) => (a.startDate! > b.startDate! ? 1 : -1));
                      for (let ti = 1; ti < sorted.length; ti++) {
                        const prev = sorted[ti - 1];
                        const curr = sorted[ti];
                        const px = (differenceInDays(parseISO(prev.endDate!), minDate) + 1) * DAY_W;
                        const cx = differenceInDays(parseISO(curr.startDate!), minDate) * DAY_W;
                        if (px < cx) {
                          arrows.push(
                            <path
                              key={`arr-${prev.id}-${curr.id}`}
                              d={`M${px} ${y} L${px + 6} ${y} L${px + 6} ${y} L${cx} ${y}`}
                              fill="none"
                              stroke="hsl(var(--muted-foreground))"
                              strokeWidth="1.2"
                              strokeDasharray="4 2"
                              markerEnd="url(#cpm-arr)"
                            />
                          );
                        }
                      }
                      rIdx++;
                    }
                  }
                  return arrows;
                })()}
              </svg>

              {/* Bars */}
              {(() => {
                const bars: React.ReactNode[] = [];
                let rIdx = 0;

                for (const block of systemBlocks) {
                  const color   = SYSTEM_COLOR_HEX[block.colorIdx % SYSTEM_COLOR_HEX.length];
                  const isCrit  = block.maxEffort === criticalPathDays && criticalPathDays > 0;

                  for (const sr of block.subRows) {
                    const y = rIdx * ROW_H;

                    // Critical row tint
                    if (isCrit) {
                      bars.push(
                        <div
                          key={`stripe-${sr.systemId}-${rIdx}`}
                          className="absolute pointer-events-none"
                          style={{
                            top: y, height: ROW_H, left: 0, right: 0,
                            background: color.bg + '14',
                            borderTop: `1px solid ${color.bg}33`,
                          }}
                        />
                      );
                    }

                    // Sub-task bars
                    for (const task of sr.tasks) {
                      if (!task.startDate || !task.endDate) continue;

                      const tStart  = parseISO(task.startDate);
                      const tEnd    = parseISO(task.endDate);
                      const left    = differenceInDays(tStart, minDate) * DAY_W;
                      const width   = Math.max((differenceInDays(tEnd, tStart) + 1) * DAY_W, DAY_W);
                      const effort  = getEffort(task, hoursPerDay);
                      const shade   = statusShadeIdx(task.status);
                      const barColor = color.shades[shade];

                      // Tooltip: show below for the first 2 rows to avoid clipping at top
                      const tooltipBelow = rIdx < 2;

                      bars.push(
                        <div
                          key={`bar-${task.id}`}
                          className="absolute flex items-center group"
                          style={{ top: y, height: ROW_H, left }}
                        >
                          {/* Bar */}
                          <div
                            className="relative flex items-center rounded overflow-hidden shadow-sm cursor-default"
                            style={{
                              height: ROW_H - 10,
                              width,
                              background: barColor,
                              border: isCrit
                                ? `1.5px solid ${color.label}`
                                : `1px solid ${barColor}cc`,
                            }}
                          >
                            <span
                              className="px-1.5 text-[9px] font-semibold truncate z-10 relative"
                              style={{ color: color.text }}
                            >
                              {effort > 0 ? `${effort}d` : ''} {task.title}
                            </span>
                          </div>

                          {/* Tooltip — flips above/below based on row position */}
                          <div
                            className={[
                              'absolute hidden group-hover:flex flex-col',
                              'bg-popover border border-border rounded-md shadow-xl',
                              'px-3 py-2 z-50 text-xs min-w-max max-w-[220px]',
                              tooltipBelow ? 'top-full mt-1' : 'bottom-full mb-1',
                            ].join(' ')}
                          >
                            <span className="font-semibold text-foreground truncate">
                              {task.title}
                            </span>
                            <span className="text-muted-foreground mt-0.5">
                              {format(tStart, 'MMM d')} – {format(tEnd, 'MMM d, yyyy')}
                            </span>
                            <span className="text-muted-foreground">
                              Effort: {effort} day{effort !== 1 ? 's' : ''}
                            </span>
                            <span
                              className="mt-1 font-medium"
                              style={{ color: barColor }}
                            >
                              Status: {task.status}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Row separator
                    bars.push(
                      <div
                        key={`sep-${rIdx}`}
                        className="absolute left-0 right-0 pointer-events-none"
                        style={{
                          top: y + ROW_H - 1,
                          height: 1,
                          background: 'hsl(var(--border) / 0.35)',
                        }}
                      />
                    );

                    rIdx++;
                  }

                  // Block separator
                  bars.push(
                    <div
                      key={`blksep-${block.systemId}`}
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{
                        top: rIdx * ROW_H - 1,
                        height: 2,
                        background: color.bg + '55',
                      }}
                    />
                  );
                }

                return bars;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="border-t px-4 py-2 flex items-center gap-5 flex-wrap shrink-0 bg-muted/20">
        {systemBlocks.map(block => {
          const color  = SYSTEM_COLOR_HEX[block.colorIdx % SYSTEM_COLOR_HEX.length];
          const isCrit = block.maxEffort === criticalPathDays && criticalPathDays > 0;
          return (
            <div key={block.systemId} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{
                  background: color.bg,
                  boxShadow: isCrit ? `0 0 0 2px ${color.label}` : undefined,
                }}
              />
              <span className="text-xs text-foreground/80 font-medium">
                {block.systemName}
                {isCrit && (
                  <span
                    className="ml-1 text-[10px] font-black"
                    style={{ color: color.label }}
                  >
                    ★ Critical
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
