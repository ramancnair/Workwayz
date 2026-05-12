'use client';

import React, { useMemo, useRef } from 'react';
import { useProject } from '@/context/ProjectContext';
import {
  format, parseISO, differenceInDays, addDays,
  startOfWeek, endOfWeek, eachDayOfInterval, isWeekend,
} from 'date-fns';
import { Story } from '@/types';

// ── Colour palette matching Project Plan SYSTEM_COLORS ────────────────────────
const SYSTEM_COLOR_HEX = [
  { bg: '#3b82f6', shades: ['#93c5fd', '#3b82f6', '#1d4ed8'], text: '#ffffff', label: '#1d4ed8' },
  { bg: '#22c55e', shades: ['#86efac', '#22c55e', '#15803d'], text: '#ffffff', label: '#15803d' },
  { bg: '#a855f7', shades: ['#d8b4fe', '#a855f7', '#7e22ce'], text: '#ffffff', label: '#7e22ce' },
  { bg: '#ec4899', shades: ['#f9a8d4', '#ec4899', '#be185d'], text: '#ffffff', label: '#be185d' },
  { bg: '#eab308', shades: ['#fde047', '#eab308', '#a16207'], text: '#1a1a1a', label: '#92400e' },
  { bg: '#6366f1', shades: ['#a5b4fc', '#6366f1', '#4338ca'], text: '#ffffff', label: '#4338ca' },
  { bg: '#f97316', shades: ['#fdba74', '#f97316', '#c2410c'], text: '#ffffff', label: '#c2410c' },
  { bg: '#14b8a6', shades: ['#5eead4', '#14b8a6', '#0f766e'], text: '#ffffff', label: '#0f766e' },
  { bg: '#06b6d4', shades: ['#67e8f9', '#06b6d4', '#0e7490'], text: '#1a1a1a', label: '#0e7490' },
];

function statusShadeIdx(status: string): number {
  if (status === 'Done') return 2;
  if (status === 'In Progress' || status === 'In Development' || status === 'In QA') return 1;
  return 0;
}

const DAY_W   = 28;
const ROW_H   = 40;
const LEFT_W  = 260;
const HEADER_H = 52;

// ── Types ─────────────────────────────────────────────────────────────────────
/** A task with fully resolved start/end dates (either actual or CPM-computed). */
interface ComputedTask {
  story: Story;
  startDate: Date;
  endDate: Date;
  effort: number;       // days
  isActualDate: boolean;// true = from Firestore, false = CPM-computed
}

interface SubRow {
  systemId: string;
  systemName: string;
  colorIdx: number;
  developerId: string | null;
  developerName: string;
  rawTasks: Story[];
  computedTasks: ComputedTask[];
  totalEffort: number;
}

interface SystemBlock {
  systemId: string;
  systemName: string;
  colorIdx: number;
  subRows: SubRow[];
  maxEffort: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getEffort(s: Story, hoursPerDay: number): number {
  if (s.effortDays != null) return Number(s.effortDays);
  if (s.estimatedHours != null) return Math.ceil(Number(s.estimatedHours) / hoursPerDay);
  return 1; // default 1 day so every task renders
}

function storyNum(s: Story): number {
  return parseInt((s.storyId || '').replace(/\D+/g, '') || '0', 10);
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CpmChart() {
  const {
    stories, employees, impactedSystems, projectSettings,
    releasesAndMilestones, holidays, weeklyOffDays,
  } = useProject();

  const hoursPerDay = projectSettings?.manDayToHours ?? 8;
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef   = useRef<HTMLDivElement>(null);

  const { systemBlocks, minDate, timelineDays, criticalPathDays, totalRows } = useMemo(() => {
    const nonBug   = stories.filter(s => !s.isDeleted && s.itemType !== 'Bug');
    const reqItems = nonBug.filter(s =>
      ['Requirement/Story', 'Feature Change', 'Task'].includes(s.itemType)
    );
    const subItems = nonBug.filter(s => s.itemType === 'Sub Task');

    const sysColorMap = new Map<string, number>();
    (impactedSystems ?? []).forEach((sys, i) => sysColorMap.set(sys.id, i));

    // ── Group sub-tasks by system ──────────────────────────────────────────────
    const bySystem = new Map<string, Story[]>();
    for (const sub of subItems) {
      if (!sub.impactedSystemId) continue;
      if (!bySystem.has(sub.impactedSystemId)) bySystem.set(sub.impactedSystemId, []);
      bySystem.get(sub.impactedSystemId)!.push(sub);
    }

    // ── Find project baseline date ─────────────────────────────────────────────
    // Use the earliest actual date from any sub-task or parent story.
    let baseline: Date | null = null;
    for (const sub of subItems) {
      const check = (d?: string | null) => {
        if (!d) return;
        const parsed = parseISO(d);
        if (!baseline || parsed < baseline) baseline = parsed;
      };
      check(sub.startDate);
      if (sub.parentStoryId) {
        const parent = reqItems.find(r => r.id === sub.parentStoryId);
        check(parent?.startDate);
      }
    }
    const projectStart = baseline ?? new Date();

    // ── Build blocks ───────────────────────────────────────────────────────────
    const blocks: SystemBlock[] = [];

    for (const sys of (impactedSystems ?? [])) {
      const tasks = bySystem.get(sys.id);
      if (!tasks || tasks.length === 0) continue;

      const colorIdx = sysColorMap.get(sys.id) ?? 0;

      // Group by developer
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

      const buildSubRow = (devId: string | null, devTasks: Story[]): SubRow => {
        const emp = devId ? employees?.find(e => e.id === devId) : null;
        const developerName = emp
          ? `${emp.firstName} ${emp.lastName}`
          : devId ? 'Unknown' : '(Unassigned)';

        // Sort tasks by storyId number for consistent CPM ordering
        const sorted = [...devTasks].sort((a, b) => storyNum(a) - storyNum(b));

        // ── CPM date computation ───────────────────────────────────────────────
        // Walk through tasks in order. If a task has actual dates use them;
        // otherwise place it sequentially right after the previous task ends.
        let cursor = projectStart;
        const computedTasks: ComputedTask[] = [];
        let totalEffort = 0;

        for (const t of sorted) {
          const effort = getEffort(t, hoursPerDay);
          totalEffort += effort;

          // Resolve actual dates (own → parent fallback)
          let actualStart: Date | null = t.startDate ? parseISO(t.startDate) : null;
          let actualEnd:   Date | null = t.endDate   ? parseISO(t.endDate)   : null;
          if (!actualStart && t.parentStoryId) {
            const p = reqItems.find(r => r.id === t.parentStoryId);
            if (p?.startDate) actualStart = parseISO(p.startDate);
          }
          if (!actualEnd && t.parentStoryId) {
            const p = reqItems.find(r => r.id === t.parentStoryId);
            if (p?.endDate) actualEnd = parseISO(p.endDate);
          }

          if (actualStart && actualEnd) {
            // Has real dates — snap cursor to day after this task
            computedTasks.push({
              story: t, startDate: actualStart, endDate: actualEnd,
              effort, isActualDate: true,
            });
            const dayAfter = addDays(actualEnd, 1);
            if (dayAfter > cursor) cursor = dayAfter;
          } else if (actualStart) {
            // Has start only — compute end from effort
            const end = addDays(actualStart, effort - 1);
            computedTasks.push({
              story: t, startDate: actualStart, endDate: end,
              effort, isActualDate: false,
            });
            cursor = addDays(end, 1);
          } else {
            // No dates — CPM sequential placement from cursor
            const start = cursor;
            const end   = addDays(cursor, effort - 1);
            computedTasks.push({
              story: t, startDate: start, endDate: end,
              effort, isActualDate: false,
            });
            cursor = addDays(end, 1);
          }
        }

        return {
          systemId: sys.id, systemName: sys.name, colorIdx,
          developerId: devId, developerName,
          rawTasks: sorted, computedTasks, totalEffort,
        };
      };

      const subRows: SubRow[] = [];
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

    // ── Compute timeline bounds from computed task dates ───────────────────────
    let tMin: Date | null = null;
    let tMax: Date | null = null;
    for (const block of blocks) {
      for (const sr of block.subRows) {
        for (const ct of sr.computedTasks) {
          if (!tMin || ct.startDate < tMin) tMin = ct.startDate;
          if (!tMax || ct.endDate   > tMax) tMax = ct.endDate;
        }
      }
    }

    let minD = tMin ?? projectStart;
    let maxD = tMax ?? addDays(minD, 30);
    minD = addDays(startOfWeek(minD), -7);
    maxD = addDays(endOfWeek(maxD), 7);

    return {
      systemBlocks: blocks,
      minDate: minD,
      timelineDays: eachDayOfInterval({ start: minD, end: maxD }),
      criticalPathDays,
      totalRows: blocks.reduce((s, b) => s + b.subRows.length, 0),
    };
  }, [stories, impactedSystems, employees, projectSettings, releasesAndMilestones, holidays, weeklyOffDays, hoursPerDay]);

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
      <div className="flex items-center gap-6 px-4 py-2 border-b bg-muted/30 shrink-0 text-sm flex-wrap">
        <span className="font-semibold">Critical Path Method</span>
        <span className="text-muted-foreground">
          Critical Path Duration:
          <span className="ml-1 font-bold text-foreground">
            {criticalPathDays} day{criticalPathDays !== 1 ? 's' : ''}
          </span>
        </span>
        <span className="text-muted-foreground text-xs hidden md:inline">
          (longest impacted-system row by total sub-task effort)
        </span>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#93c5fd' }} />
            To Do
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#3b82f6' }} />
            In Progress
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#1d4ed8' }} />
            Done
          </span>
          <span className="flex items-center gap-1 ml-2 text-[10px]">
            <span className="inline-block w-3 h-1 border-dashed border border-muted-foreground/50" />
            CPM computed date
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Left label panel ── */}
        <div className="shrink-0 flex flex-col" style={{ width: LEFT_W }}>
          <div
            className="border-b border-r bg-muted shrink-0 flex items-end px-3 pb-2"
            style={{ height: HEADER_H }}
          >
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              System / Developer
            </span>
          </div>

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
                  <div
                    style={{
                      width: 8, background: color.bg, flexShrink: 0,
                      borderRight: isCrit ? `2px solid ${color.label}` : undefined,
                    }}
                  />
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
                          {isFirst && (
                            <span className="text-[11px] font-bold truncate leading-tight" style={{ color: color.label }}>
                              {block.systemName}
                              {isCrit && <span className="ml-1 text-[9px] font-black">★</span>}
                            </span>
                          )}
                          {block.subRows.length > 1 && (
                            <span className="text-[11px] font-medium text-foreground truncate leading-tight">
                              {sr.developerName}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold leading-tight" style={{ color: color.label, opacity: 0.75 }}>
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
          <div ref={headerRef} className="border-b bg-muted shrink-0 overflow-hidden" style={{ height: HEADER_H }}>
            <div style={{ width: chartWidth }} className="h-full flex flex-col">
              <div className="flex border-b" style={{ height: 24 }}>
                {monthGroups.map((mg, i) => (
                  <div
                    key={i}
                    style={{ width: mg.days * DAY_W, minWidth: mg.days * DAY_W }}
                    className="border-r border-border flex items-center px-2 overflow-hidden"
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground truncate">{mg.label}</span>
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
            <div style={{ width: chartWidth, height: Math.max(chartHeight, 1) }} className="relative">

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

              {/* Bars */}
              {(() => {
                const elements: React.ReactNode[] = [];
                let rIdx = 0;

                for (const block of systemBlocks) {
                  const color  = SYSTEM_COLOR_HEX[block.colorIdx % SYSTEM_COLOR_HEX.length];
                  const isCrit = block.maxEffort === criticalPathDays && criticalPathDays > 0;

                  for (const sr of block.subRows) {
                    const y = rIdx * ROW_H;

                    // Critical row tint
                    if (isCrit) {
                      elements.push(
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

                    // Arrows between sequential tasks
                    for (let ti = 1; ti < sr.computedTasks.length; ti++) {
                      const prev = sr.computedTasks[ti - 1];
                      const curr = sr.computedTasks[ti];
                      const px = (differenceInDays(prev.endDate, minDate) + 1) * DAY_W;
                      const cx = differenceInDays(curr.startDate, minDate) * DAY_W;
                      if (px < cx) {
                        elements.push(
                          <svg
                            key={`arr-${prev.story.id}-${curr.story.id}`}
                            className="absolute pointer-events-none overflow-visible"
                            style={{ top: y, height: ROW_H, left: 0, width: chartWidth }}
                          >
                            <defs>
                              <marker id={`arr-${rIdx}`} viewBox="0 0 10 10" refX="8" refY="5"
                                markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                                <path d="M0 0 L10 5 L0 10z" fill="hsl(var(--muted-foreground))" />
                              </marker>
                            </defs>
                            <path
                              d={`M${px} ${ROW_H / 2} L${cx} ${ROW_H / 2}`}
                              fill="none"
                              stroke="hsl(var(--muted-foreground))"
                              strokeWidth="1.2"
                              strokeDasharray="4 2"
                              markerEnd={`url(#arr-${rIdx})`}
                            />
                          </svg>
                        );
                      }
                    }

                    // Task bars
                    for (const ct of sr.computedTasks) {
                      const left  = differenceInDays(ct.startDate, minDate) * DAY_W;
                      const width = Math.max((differenceInDays(ct.endDate, ct.startDate) + 1) * DAY_W, DAY_W);
                      const shade = statusShadeIdx(ct.story.status);
                      const barColor = color.shades[shade];
                      const tooltipBelow = rIdx < 2;

                      elements.push(
                        <div
                          key={`bar-${ct.story.id}`}
                          className="absolute flex items-center group"
                          style={{ top: y, height: ROW_H, left }}
                        >
                          <div
                            className="relative flex items-center rounded overflow-hidden shadow-sm cursor-default"
                            style={{
                              height: ROW_H - 10,
                              width,
                              background: barColor,
                              border: isCrit
                                ? `1.5px solid ${color.label}`
                                : ct.isActualDate
                                  ? `1px solid ${barColor}cc`
                                  : `1.5px dashed ${barColor}99`,
                            }}
                          >
                            <span
                              className="px-1.5 text-[9px] font-semibold truncate z-10 relative"
                              style={{ color: color.text }}
                            >
                              {ct.effort}d · {ct.story.title}
                            </span>
                          </div>

                          {/* Tooltip */}
                          <div
                            className={[
                              'absolute hidden group-hover:flex flex-col',
                              'bg-popover border border-border rounded-md shadow-xl',
                              'px-3 py-2 z-50 text-xs min-w-max max-w-[240px]',
                              tooltipBelow ? 'top-full mt-1' : 'bottom-full mb-1',
                            ].join(' ')}
                          >
                            <span className="font-semibold text-foreground">{ct.story.title}</span>
                            <span className="text-muted-foreground mt-0.5">
                              {format(ct.startDate, 'MMM d')} – {format(ct.endDate, 'MMM d, yyyy')}
                              {!ct.isActualDate && (
                                <span className="ml-1 text-yellow-500 text-[10px]">(computed)</span>
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              Effort: {ct.effort} day{ct.effort !== 1 ? 's' : ''}
                              {ct.story.estimatedHours
                                ? ` (${ct.story.estimatedHours}h)`
                                : ''}
                            </span>
                            <span className="mt-1 font-medium" style={{ color: barColor }}>
                              {ct.story.status}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Row separator
                    elements.push(
                      <div
                        key={`sep-${rIdx}`}
                        className="absolute left-0 right-0 pointer-events-none"
                        style={{ top: y + ROW_H - 1, height: 1, background: 'hsl(var(--border) / 0.35)' }}
                      />
                    );

                    rIdx++;
                  }

                  // Block separator
                  elements.push(
                    <div
                      key={`blksep-${block.systemId}`}
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{ top: rIdx * ROW_H - 1, height: 2, background: color.bg + '55' }}
                    />
                  );
                }
                return elements;
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
                  <span className="ml-1 text-[10px] font-black" style={{ color: color.label }}>
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
