'use client';

import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useProject } from '@/context/ProjectContext';
import {
  format, parseISO, differenceInDays, addDays,
  startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, isSameDay,
} from 'date-fns';
import { PanelLeftClose, PanelLeft, PanelRightClose, PanelRight } from 'lucide-react';
import { Story, Release } from '@/types';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { GanttRow, SYSTEM_COLORS, ColKey, DEFAULT_COL_WIDTHS, DAY_WIDTH, ROW_HEIGHT } from './gantt-types';
import { GanttLeftPanel } from './GanttLeftPanel';

export function GanttChart() {
  const {
    stories, releasesAndMilestones, holidays, weeklyOffDays,
    employees, impactedSystems, updateStory, updateReleaseOrMilestone,
  } = useProject();

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(DEFAULT_COL_WIDTHS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const lastClickedIndex = useRef<number>(-1);
  const rightHeaderRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<any>(null);
  const rightPanelRef = useRef<any>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // ─── Business days helper ────────────────────────────────────────────────
  const calcBizDays = useCallback((start: Date, end: Date): number => {
    if (!start || !end) return 0;
    const hdDates = holidays.map(h => parseISO(h.date));
    return eachDayOfInterval({ start, end }).filter(d =>
      !weeklyOffDays.includes(d.getDay()) && !hdDates.some(h => isSameDay(d, h))
    ).length;
  }, [holidays, weeklyOffDays]);

  // ─── Build flat row list ─────────────────────────────────────────────────
  const rows = useMemo<GanttRow[]>(() => {
    const result: GanttRow[] = [];
    const nonBug = stories.filter(s => s.itemType !== 'Bug');
    const releases = releasesAndMilestones
      .filter(r => r.itemType === 'Release')
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    let releaseWbsIdx = 0;

    for (const release of releases) {
      releaseWbsIdx++;
      const releaseId = `release-${release.id}`;
      const releaseWbs = `${releaseWbsIdx}`;

      // Requirements that belong to this release (no parentStoryId)
      const reqs = nonBug
        .filter(s =>
          s.releaseId === release.id &&
          ['Requirement/Story', 'Feature Change', 'Task'].includes(s.itemType)
        )
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      let relMinStart: Date | null = release.startDate ? parseISO(release.startDate) : null;
      let relMaxEnd: Date | null = release.endDate ? parseISO(release.endDate) : null;
      const reqIds: string[] = [];
      const reqRows: GanttRow[] = [];
      let reqIdx = 0;

      for (const req of reqs) {
        reqIdx++;
        const reqId = `req-${req.id}`;
        const reqWbs = `${releaseWbs}.${reqIdx}`;
        reqIds.push(reqId);

        // Sub-tasks
        const subs = nonBug
          .filter(s => s.parentStoryId === req.id && s.itemType === 'Sub Task')
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        let rStart: Date | null = req.startDate ? parseISO(req.startDate) : null;
        let rEnd: Date | null = req.endDate ? parseISO(req.endDate) : null;
        let rEffort = req.estimatedHours ?? 0;
        const subIds: string[] = [];
        const subRows: GanttRow[] = [];
        let subIdx = 0;

        for (const sub of subs) {
          subIdx++;
          const sStart = sub.startDate ? parseISO(sub.startDate) : null;
          const sEnd = sub.endDate ? parseISO(sub.endDate) : null;
          if (sStart && (!rStart || sStart < rStart)) rStart = sStart;
          if (sEnd && (!rEnd || sEnd > rEnd)) rEnd = sEnd;
          rEffort += sub.estimatedHours ?? 0;
          const emp = employees.find(e => e.id === sub.assigneeId);
          const subId = `sub-${sub.id}`;
          subIds.push(subId);
          subRows.push({
            id: subId, type: 'SubTask', wbs: `${reqWbs}.${subIdx}`,
            title: sub.title, startDate: sStart, endDate: sEnd,
            duration: sStart && sEnd ? calcBizDays(sStart, sEnd) : null,
            estimatedHours: sub.estimatedHours ?? null,
            status: sub.status,
            assigneeName: emp ? `${emp.firstName} ${emp.lastName}` : undefined,
            progress: sub.status === 'Done' ? 100 : sub.status === 'In Progress' ? 50 : 0,
            predecessorId: sub.predecessorId,
            parentId: reqId, isExpanded: false, childrenIds: [],
            originalItem: sub, sortOrder: sub.sortOrder ?? subIdx, level: 2,
          });
        }

        if (rStart && (!relMinStart || rStart < relMinStart)) relMinStart = rStart;
        if (rEnd && (!relMaxEnd || rEnd > relMaxEnd)) relMaxEnd = rEnd;

        const reqRow: GanttRow = {
          id: reqId, type: 'Requirement', wbs: reqWbs,
          title: req.title, startDate: rStart, endDate: rEnd,
          duration: rStart && rEnd ? calcBizDays(rStart, rEnd) : null,
          estimatedHours: rEffort, status: req.status,
          progress: req.status === 'Done' ? 100 : req.status === 'In Progress' ? 50 : 0,
          predecessorId: req.predecessorId,
          parentId: releaseId, isExpanded: expandedRows[reqId] ?? false,
          childrenIds: subIds, originalItem: req,
          sortOrder: req.sortOrder ?? reqIdx, level: 1,
        };
        reqRows.push(reqRow);
        if (reqRow.isExpanded) reqRows.push(...subRows);
      }

      const releaseRow: GanttRow = {
        id: releaseId, type: 'Release', wbs: releaseWbs,
        title: release.name,
        startDate: relMinStart, endDate: relMaxEnd,
        duration: relMinStart && relMaxEnd ? calcBizDays(relMinStart, relMaxEnd) : null,
        estimatedHours: null,
        status: release.isCompleted ? 'Done' : 'In Progress',
        progress: 0, parentId: undefined,
        isExpanded: expandedRows[releaseId] !== false,
        childrenIds: reqIds, originalItem: release,
        sortOrder: release.sortOrder ?? releaseWbsIdx, level: 0,
      };

      result.push(releaseRow);
      if (releaseRow.isExpanded) result.push(...reqRows);
    }
    return result;
  }, [stories, releasesAndMilestones, expandedRows, employees, calcBizDays]);

  // ─── Timeline bounds ─────────────────────────────────────────────────────
  const { minDate, maxDate, totalDays, timelineDays } = useMemo(() => {
    let min: Date | null = null, max: Date | null = null;
    rows.forEach(r => {
      if (r.startDate && (!min || r.startDate < min)) min = r.startDate;
      if (r.endDate && (!max || r.endDate > max)) max = r.endDate;
    });
    if (!min) min = new Date();
    if (!max) max = addDays(min, 30);
    min = addDays(startOfWeek(min), -7);
    max = addDays(endOfWeek(max), 7);
    return {
      minDate: min, maxDate: max,
      totalDays: differenceInDays(max, min) + 1,
      timelineDays: eachDayOfInterval({ start: min, end: max }),
    };
  }, [rows]);

  // ─── Coordinates for predecessor arrows ─────────────────────────────────
  const coords = useMemo(() => {
    const m: Record<string, { x: number; y: number; width: number }> = {};
    rows.forEach((row, i) => {
      const eDate = row.endDate || row.startDate;
      if (row.startDate && eDate) {
        m[row.id] = {
          x: differenceInDays(row.startDate, minDate) * DAY_WIDTH,
          y: i * ROW_HEIGHT + ROW_HEIGHT / 2,
          width: (differenceInDays(eDate, row.startDate) + 1) * DAY_WIDTH,
        };
      }
    });
    return m;
  }, [rows, minDate]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, pane: 'left' | 'right') => {
    const other = pane === 'left' ? rightPaneRef.current : leftPaneRef.current;
    if (other) other.scrollTop = e.currentTarget.scrollTop;
    // sync right panel header horizontal scroll
    if (pane === 'right' && rightHeaderRef.current) {
      rightHeaderRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleSelect = (id: string, e: React.MouseEvent, index: number) => {
    if (editingCell) return;
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    } else if (e.shiftKey && lastClickedIndex.current >= 0) {
      const lo = Math.min(lastClickedIndex.current, index);
      const hi = Math.max(lastClickedIndex.current, index);
      setSelectedIds(new Set(rows.slice(lo, hi + 1).map(r => r.id)));
    } else {
      setSelectedIds(new Set([id]));
    }
    lastClickedIndex.current = index;
  };

  const handleDoubleClick = (rowId: string, field: string) => {
    setEditingCell({ rowId, field });
  };

  const handleCellBlur = async (rowId: string, field: string, value: string) => {
    setEditingCell(null);
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    try {
      if (row.type === 'Release') {
        if (updateReleaseOrMilestone) await updateReleaseOrMilestone(row.originalItem.id, { [field]: value });
      } else {
        if (!updateStory) return;
        if (field === 'predecessorWbs') {
          const predRow = rows.find(r => r.wbs === value);
          await updateStory(row.originalItem.id, { predecessorId: predRow?.originalItem.id ?? '' });
        } else {
          await updateStory(row.originalItem.id, { [field]: value });
        }
      }
    } catch (err) { console.error('Cell update failed', err); }
  };

  const handleColResize = (e: React.MouseEvent, col: ColKey) => {
    e.preventDefault();
    const startX = e.pageX, startW = colWidths[col];
    const onMove = (mv: MouseEvent) =>
      setColWidths(p => ({ ...p, [col]: Math.max(40, startW + mv.pageX - startX) }));
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  function getAllDescendantIds(parentId: string, allRows: GanttRow[]): string[] {
    const parent = allRows.find(r => r.id === parentId);
    if (!parent) return [];
    const ids: string[] = [...parent.childrenIds];
    for (const cid of parent.childrenIds) {
      ids.push(...getAllDescendantIds(cid, allRows));
    }
    return ids;
  }

  const toggleExpand = (id: string) =>
    setExpandedRows(p => ({ ...p, [id]: !p[id] }));

  const toggleLeftPanel = () => {
    const p = leftPanelRef.current;
    if (!p) return;
    if (leftCollapsed) { p.expand(); setLeftCollapsed(false); }
    else { p.collapse(); setLeftCollapsed(true); }
  };
  const toggleRightPanel = () => {
    const p = rightPanelRef.current;
    if (!p) return;
    if (rightCollapsed) { p.expand(); setRightCollapsed(false); }
    else { p.collapse(); setRightCollapsed(true); }
  };

  // ─── Month grouping for header ────────────────────────────────────────────
  const monthGroups = useMemo(() => {
    const groups: { label: string; days: number }[] = [];
    let cur = '';
    let cnt = 0;
    for (const d of timelineDays) {
      const lbl = format(d, 'MMM yyyy');
      if (lbl === cur) { cnt++; }
      else { if (cur) groups.push({ label: cur, days: cnt }); cur = lbl; cnt = 1; }
    }
    if (cur) groups.push({ label: cur, days: cnt });
    return groups;
  }, [timelineDays]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background border rounded-md shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 bg-muted/20 h-10 shrink-0">
        <span className="text-sm font-semibold">Project Schedule</span>
        <div className="flex items-center gap-1">
          <button onClick={toggleLeftPanel} className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            title={leftCollapsed ? 'Show Table' : 'Hide Table'}>
            {leftCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button onClick={toggleRightPanel} className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            title={rightCollapsed ? 'Show Chart' : 'Hide Chart'}>
            {rightCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Absolute container: fills space below toolbar, clips all overflow */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* LEFT */}
            <ResizablePanel ref={leftPanelRef} defaultSize={45} minSize={15} collapsible
              onCollapse={() => setLeftCollapsed(true)} onExpand={() => setLeftCollapsed(false)}>
              <div className="h-full overflow-hidden">
                <GanttLeftPanel
                  rows={rows} selectedIds={selectedIds} editingCell={editingCell}
                  colWidths={colWidths}
                  onSelect={handleSelect}
                  onDoubleClick={handleDoubleClick}
                  onCellBlur={handleCellBlur}
                  onToggleExpand={toggleExpand}
                  onColResize={handleColResize}
                  scrollRef={leftPaneRef}
                  onScroll={(e) => handleScroll(e, 'left')}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* RIGHT – Gantt bars */}
            <ResizablePanel ref={rightPanelRef} defaultSize={55} minSize={15} collapsible
              onCollapse={() => setRightCollapsed(true)} onExpand={() => setRightCollapsed(false)}>
              <div className="h-full w-full flex flex-col overflow-hidden">
              {/* Timeline header — overflow hidden, scroll position synced via ref */}
              <div ref={rightHeaderRef} className="h-9 border-b bg-muted shrink-0 overflow-hidden">
                <div style={{ width: totalDays * DAY_WIDTH }} className="h-full flex flex-col">
                  {/* Month row */}
                  <div className="flex h-4 border-b border-border">
                    {monthGroups.map((mg, i) => (
                      <div key={i} style={{ width: mg.days * DAY_WIDTH }}
                        className="border-r border-border flex items-center px-1 overflow-hidden">
                        <span className="text-[10px] font-semibold text-muted-foreground truncate">{mg.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Day row */}
                  <div className="flex h-5">
                    {timelineDays.map((day, i) => (
                      <div key={i} style={{ width: DAY_WIDTH }}
                        className="border-r border-border flex items-center justify-center">
                        <span className="text-[9px] text-muted-foreground">{format(day, 'd')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart body */}
              <div ref={rightPaneRef} onScroll={(e) => handleScroll(e, 'right')}
                className="flex-1 overflow-auto">
                <div style={{ width: totalDays * DAY_WIDTH, height: rows.length * ROW_HEIGHT }} className="relative">
                  {/* Grid */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timelineDays.map((day, i) => (
                      <div key={i} style={{ width: DAY_WIDTH }}
                        className={`h-full border-r border-border/30 ${isWeekend(day) ? 'bg-muted/40' : ''}`} />
                    ))}
                  </div>

                  {/* Predecessor arrows */}
                  <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M0 0 L10 5 L0 10z" fill="hsl(var(--muted-foreground))" />
                      </marker>
                    </defs>
                    {rows.map(row => {
                      if (!row.predecessorId) return null;
                      const pId = coords[`req-${row.predecessorId}`] ? `req-${row.predecessorId}` : `sub-${row.predecessorId}`;
                      const pc = coords[pId], cc = coords[row.id];
                      if (!pc || !cc) return null;
                      const sx = pc.x + pc.width, sy = pc.y, ex = cc.x, ey = cc.y;
                      return (
                        <path key={`lnk-${row.id}`}
                          d={`M${sx} ${sy} L${sx + 10} ${sy} L${sx + 10} ${ey} L${ex} ${ey}`}
                          fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" markerEnd="url(#arr)" />
                      );
                    })}
                  </svg>

                  {/* Bars */}
                  {rows.map((row, index) => {
                    if (!row.startDate) return null;
                    const eDate = row.endDate || row.startDate;
                    const left = differenceInDays(row.startDate, minDate) * DAY_WIDTH;
                    const width = (differenceInDays(eDate, row.startDate) + 1) * DAY_WIDTH;

                    let barColor = 'bg-slate-500';
                    if (row.type === 'Release') {
                      barColor = 'bg-primary';
                    } else {
                      const item = row.originalItem as Story;
                      const sysId = item.impactedSystemId || item.impactedSystemIds?.[0];
                      if (sysId && impactedSystems) {
                        const idx = impactedSystems.findIndex(s => s.id === sysId);
                        barColor = idx >= 0 ? SYSTEM_COLORS[idx % SYSTEM_COLORS.length]
                          : (row.type === 'Requirement' ? 'bg-blue-500' : 'bg-green-500');
                      } else {
                        barColor = row.type === 'Requirement' ? 'bg-blue-500' : 'bg-green-500';
                      }
                    }

                    return (
                      <div key={row.id} className="absolute flex items-center group"
                        style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT, left }}>
                        <div className={`relative flex items-center h-5 rounded-sm shadow-sm ${barColor}`} style={{ width }}>
                          <div className="absolute top-0 left-0 h-full bg-white/20 rounded-l-sm"
                            style={{ width: `${row.progress}%` }} />
                        </div>
                        <span className="ml-2 text-[10px] whitespace-nowrap text-muted-foreground hidden group-hover:block bg-background/80 px-1 rounded z-20">
                          {row.title}{row.assigneeName ? ` (${row.assigneeName})` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        </div>{/* end absolute inset-0 */}
      </div>{/* end flex-1 relative */}
    </div>
  );
}
