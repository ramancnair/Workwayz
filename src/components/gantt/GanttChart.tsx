'use client';

import React, { useMemo, useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useProject } from '@/context/ProjectContext';
import {
  format, parseISO, differenceInDays, addDays, startOfDay,
  startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, isSameDay,
} from 'date-fns';
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Story, Release } from '@/types';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Plus, Scissors, Copy, ClipboardPaste, Trash2, Wand2, Filter } from 'lucide-react';
import { GanttRow, SYSTEM_COLORS, ColKey, DEFAULT_COL_WIDTHS, DAY_WIDTH, ROW_HEIGHT } from './gantt-types';
import { GanttLeftPanel } from './GanttLeftPanel';
import { GanttContextMenu, ContextMenuAction } from './GanttContextMenu';
import { StoryEditDialog } from '../kanban/StoryEditDialog';

export interface GanttChartRef {
  openAutogenDialog: () => void;
}

export const GanttChart = forwardRef<GanttChartRef, {}>((props, ref) => {
  const {
    stories, releasesAndMilestones, holidays, weeklyOffDays,
    employees, impactedSystems, projectSettings,
    updateStory, updateReleaseOrMilestone,
    addStory, deleteStory, bulkDeleteStories,
    addReleaseOrMilestone, deleteReleaseOrMilestone,
  } = useProject();

  const hoursPerDay = projectSettings?.manDayToHours ?? 8;

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(DEFAULT_COL_WIDTHS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  // Clipboard: holds copied/cut rows (in-memory, not system clipboard)
  const [clipboard, setClipboard] = useState<{ mode: 'copy' | 'cut'; rows: GanttRow[] } | null>(null);
  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const lastClickedIndex = useRef<number>(-1);
  const rightHeaderRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<any>(null);
  const rightPanelRef = useRef<any>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autogenOpen, setAutogenOpen] = useState(false);
  const [autogenStartDate, setAutogenStartDate] = useState('');
  const [autogenLoading, setAutogenLoading] = useState(false);

  const [levelFilter, setLevelFilter] = useState<'Requirement' | 'Sub Tasks'>('Sub Tasks');
  const [entityTypeFilter, setEntityTypeFilter] = useState<'System' | 'Resource'>('System');
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());

  useImperativeHandle(ref, () => ({
    openAutogenDialog: () => setAutogenOpen(true)
  }));

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

    // Sub-task effort in days
    const getSubEffort = (s: Story): number =>
      s.effortDays ?? (s.estimatedHours != null ? Math.ceil(s.estimatedHours / hoursPerDay) : 0);

    // Story is "finalised" (ready for dev) — matches the green-check logic used in
    // grooming/backlog/kanban: must have hours, and every impacted system covered by a sub-task.
    const isFinalised = (req: Story, subTasks: Story[]): boolean => {
      if (!req.estimatedHours || req.estimatedHours <= 0) return false;
      if (!req.impactedSystemIds || req.impactedSystemIds.length === 0) return true;
      const covered = new Set(subTasks.map(s => s.impactedSystemId).filter(Boolean));
      return req.impactedSystemIds.every(id => covered.has(id));
    };

    // Critical path: sub-tasks sharing an assignee or impacted system are sequential.
    // Duration = max(sum-by-assignee, sum-by-system, max-of-ungrouped).
    const computeStoryDuration = (subTasks: Story[]): number => {
      if (subTasks.length === 0) return 0;
      const byAssignee = new Map<string, number>();
      const bySystem = new Map<string, number>();
      let ungroupedMax = 0;
      for (const s of subTasks) {
        const e = getSubEffort(s);
        if (s.assigneeId) byAssignee.set(s.assigneeId, (byAssignee.get(s.assigneeId) ?? 0) + e);
        if (s.impactedSystemId) bySystem.set(s.impactedSystemId, (bySystem.get(s.impactedSystemId) ?? 0) + e);
        if (!s.assigneeId && !s.impactedSystemId) ungroupedMax = Math.max(ungroupedMax, e);
      }
      const maxA = byAssignee.size > 0 ? Math.max(...byAssignee.values()) : 0;
      const maxS = bySystem.size > 0 ? Math.max(...bySystem.values()) : 0;
      return Math.max(maxA, maxS, ungroupedMax);
    };

    let releaseWbsIdx = 0;

    for (const release of releases) {
      releaseWbsIdx++;
      const releaseId = `release-${release.id}`;
      const releaseWbs = `${releaseWbsIdx}`;

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
      let releaseEffortSum = 0;
      let releaseDurationSum = 0;

      for (const req of reqs) {
        // Sub-tasks (Sub Task only — bugs are excluded by the type filter)
        const allSubs = nonBug
          .filter(s => s.parentStoryId === req.id && s.itemType === 'Sub Task')
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        // Only display finalised stories
        if (!isFinalised(req, allSubs)) continue;

        // Apply entity filter
        let reqMatchesEntity = true;
        let matchingSubs = allSubs;

        if (levelFilter === 'Sub Tasks' && selectedEntities.size > 0) {
          reqMatchesEntity = 
            selectedEntities.has(req.assigneeId || '') || 
            selectedEntities.has(req.impactedSystemId || '') || 
            (req.impactedSystemIds && req.impactedSystemIds.some(id => selectedEntities.has(id))) || false;

          matchingSubs = allSubs.filter(sub => 
            selectedEntities.has(sub.assigneeId || '') || 
            selectedEntities.has(sub.impactedSystemId || '') || 
            (sub.impactedSystemIds && sub.impactedSystemIds.some(id => selectedEntities.has(id)))
          );

          if (!reqMatchesEntity && matchingSubs.length === 0) continue;
        }

        const subs = levelFilter === 'Requirement' 
          ? [] 
          : (selectedEntities.size > 0 ? matchingSubs : allSubs);

        reqIdx++;
        const reqId = `req-${req.id}`;
        const reqWbs = `${releaseWbs}.${reqIdx}`;
        reqIds.push(reqId);

        let rStart: Date | null = req.startDate ? parseISO(req.startDate) : null;
        let rEnd: Date | null = req.endDate ? parseISO(req.endDate) : null;
        const subIds: string[] = [];
        const subRows: GanttRow[] = [];
        let subIdx = 0;

        for (const sub of subs) {
          subIdx++;
          const sStart = sub.startDate ? parseISO(sub.startDate) : null;
          const sEnd = sub.endDate ? parseISO(sub.endDate) : null;
          if (sStart && (!rStart || sStart < rStart)) rStart = sStart;
          if (sEnd && (!rEnd || sEnd > rEnd)) rEnd = sEnd;
          const emp = employees.find(e => e.id === sub.assigneeId);
          const subId = `sub-${sub.id}`;
          subIds.push(subId);
          const subEffort = getSubEffort(sub);
          subRows.push({
            id: subId, type: 'SubTask', wbs: `${reqWbs}.${subIdx}`,
            title: sub.title, startDate: sStart, endDate: sEnd,
            duration: subEffort || null,
            scheduleDuration: subEffort || null,
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

        // Effort = sum of sub-task efforts; for childless stories, the story's own effort
        const ownEffort = req.estimatedHours != null ? Math.ceil(req.estimatedHours / hoursPerDay) : 0;
        const reqEffort = subs.length > 0
          ? subs.reduce((sum, s) => sum + getSubEffort(s), 0)
          : ownEffort;

        // Duration = critical path; for childless stories, same as effort
        const reqDuration = subs.length > 0 ? computeStoryDuration(subs) : ownEffort;

        const reqRow: GanttRow = {
          id: reqId, type: 'Requirement', wbs: reqWbs,
          title: req.title, startDate: rStart, endDate: rEnd,
          duration: reqEffort || null,
          scheduleDuration: reqDuration || null,
          estimatedHours: req.estimatedHours ?? 0,
          status: req.status,
          progress: req.status === 'Done' ? 100 : req.status === 'In Progress' ? 50 : 0,
          predecessorId: req.predecessorId,
          parentId: releaseId, isExpanded: expandedRows[reqId] ?? false,
          childrenIds: subIds, originalItem: req,
          sortOrder: req.sortOrder ?? reqIdx, level: 1,
        };
        reqRows.push(reqRow);
        if (reqRow.isExpanded) reqRows.push(...subRows);

        releaseEffortSum += reqEffort;
        releaseDurationSum += reqDuration;
      }

      // Release effort = sum of story efforts; duration = sum of story durations
      // (stories cascade sequentially, so calendar time accumulates)
      const releaseRow: GanttRow = {
        id: releaseId, type: 'Release', wbs: releaseWbs,
        title: release.name,
        startDate: relMinStart, endDate: relMaxEnd,
        duration: releaseEffortSum > 0 ? releaseEffortSum : null,
        scheduleDuration: releaseDurationSum > 0 ? releaseDurationSum : null,
        estimatedHours: null,
        status: release.isCompleted ? 'Done' : 'In Progress',
        progress: 0, parentId: undefined,
        isExpanded: expandedRows[releaseId] !== false,
        childrenIds: reqIds, originalItem: release,
        sortOrder: release.sortOrder ?? releaseWbsIdx, level: 0,
      };

      result.push(releaseRow);
      // If we filtered out all reqs due to Entity Filter, do we hide the release? 
      // If it has no children after filter, we probably shouldn't render the empty release.
      if (reqRows.length > 0 || selectedEntities.size === 0) {
        if (releaseRow.isExpanded) result.push(...reqRows);
      } else {
        result.pop(); // Remove release if empty
      }
    }
    return result;
  }, [stories, releasesAndMilestones, expandedRows, employees, calcBizDays, hoursPerDay, levelFilter, entityTypeFilter, selectedEntities]);

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
      
      const row = rows[index];
      if (row && (row.type === 'Requirement' || row.type === 'SubTask') && row.originalItem?.id) {
        setEditingStoryId(row.originalItem.id);
      }
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

  // ─── Row operations ──────────────────────────────────────────────────────

  // Get the "primary" selected row (first selected, or last right-clicked)
  const getSelectedRows = () => rows.filter(r => selectedIds.has(r.id));

  const handleAddRow = async (below = true) => {
    const sel = getSelectedRows();
    const anchor = below ? sel[sel.length - 1] : sel[0];
    if (!anchor) {
      // No selection: add a blank Requirement under the first release
      const firstRelease = rows.find(r => r.type === 'Release');
      if (firstRelease && addStory) {
        await addStory({
          title: 'New Task',
          itemType: 'Requirement/Story',
          status: 'To Do',
          releaseId: firstRelease.originalItem.id,
          sortOrder: rows.length + 1,
          isDeleted: false, deletedAt: null,
        } as any);
      }
      return;
    }

    if (anchor.type === 'Release') {
      if (addReleaseOrMilestone) {
        await addReleaseOrMilestone({
          title: 'New Release',
          itemType: 'Release',
          sortOrder: (anchor.originalItem as Release).sortOrder ?? 0 + (below ? 1 : 0),
        } as any);
      }
    } else if (anchor.type === 'Requirement') {
      if (addStory) {
        const rel = rows.find(r => r.type === 'Release' && r.childrenIds.some(c => c === anchor.id));
        await addStory({
          title: 'New Task',
          itemType: 'Requirement/Story',
          status: 'To Do',
          releaseId: rel ? rel.originalItem.id : (anchor.originalItem as Story).releaseId,
          sortOrder: (anchor.originalItem as Story).sortOrder ?? 0 + (below ? 1 : 0),
          isDeleted: false, deletedAt: null,
        } as any);
      }
    } else {
      // SubTask
      if (addStory) {
        const parent = anchor.originalItem as Story;
        await addStory({
          title: 'New Sub-Task',
          itemType: 'Sub Task',
          status: 'To Do',
          parentStoryId: parent.parentStoryId ?? parent.id,
          releaseId: parent.releaseId,
          sortOrder: parent.sortOrder ?? 0 + (below ? 1 : 0),
          isDeleted: false, deletedAt: null,
        } as any);
      }
    }
  };

  const handleDeleteRows = async () => {
    if (selectedIds.size === 0) return;
    const sel = getSelectedRows();
    const storyIds = sel.filter(r => r.type !== 'Release').map(r => r.originalItem.id);
    const releaseIds = sel.filter(r => r.type === 'Release').map(r => r.originalItem.id);
    const ops: Promise<any>[] = [];
    if (storyIds.length > 0 && bulkDeleteStories) ops.push(bulkDeleteStories(storyIds));
    releaseIds.forEach(id => { if (deleteReleaseOrMilestone) ops.push(deleteReleaseOrMilestone(id)); });
    await Promise.all(ops);
    setSelectedIds(new Set());
  };

  const handleCopyRows = () => {
    const sel = getSelectedRows();
    if (sel.length === 0) return;
    setClipboard({ mode: 'copy', rows: sel });
  };

  const handleCutRows = () => {
    const sel = getSelectedRows();
    if (sel.length === 0) return;
    setClipboard({ mode: 'cut', rows: sel });
  };

  const handlePasteRows = async () => {
    if (!clipboard || clipboard.rows.length === 0) return;
    const anchor = getSelectedRows()[0] ?? rows[rows.length - 1];
    const targetReleaseId = anchor?.type === 'Release'
      ? anchor.originalItem.id
      : (anchor?.originalItem as Story)?.releaseId ?? rows.find(r => r.type === 'Release')?.originalItem.id;

    const ops: Promise<any>[] = [];
    for (const r of clipboard.rows) {
      if (r.type === 'Release') continue; // don't paste releases
      const src = r.originalItem as Story;
      if (addStory) {
        ops.push(addStory({
          title: clipboard.mode === 'copy' ? `Copy of ${src.title}` : src.title,
          itemType: src.itemType,
          status: 'To Do',
          releaseId: targetReleaseId,
          parentStoryId: src.itemType === 'Sub Task' ? src.parentStoryId : undefined,
          effortDays: src.effortDays,
          isDeleted: false, deletedAt: null,
        } as any));
      }
    }

    if (clipboard.mode === 'cut') {
      // Delete originals after paste
      const storyIds = clipboard.rows.filter(r => r.type !== 'Release').map(r => r.originalItem.id);
      if (storyIds.length > 0 && bulkDeleteStories) ops.push(bulkDeleteStories(storyIds));
      setClipboard(null);
    }
    await Promise.all(ops);
  };

  const handleContextMenu = (e: React.MouseEvent, rowId: string) => {
    // Ensure right-clicked row is selected
    if (!selectedIds.has(rowId)) {
      setSelectedIds(new Set([rowId]));
      lastClickedIndex.current = rows.findIndex(r => r.id === rowId);
    }
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingCell) return; // don't intercept while editing
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'c') { e.preventDefault(); handleCopyRows(); }
      if (ctrl && e.key === 'x') { e.preventDefault(); handleCutRows(); }
      if (ctrl && e.key === 'v') { e.preventDefault(); handlePasteRows(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0 && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault(); handleDeleteRows();
        }
      }
      if (e.key === 'Insert' || (ctrl && e.key === 'Enter')) { e.preventDefault(); handleAddRow(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCell, selectedIds, rows, clipboard]);

  // ─── Context menu actions ─────────────────────────────────────────────────
  const ctxActions: ContextMenuAction[] = [
    { label: 'Add Row Below',  icon: <Plus className="w-3.5 h-3.5" />,            shortcut: 'Insert',  onClick: () => handleAddRow(true) },
    { label: 'Add Row Above',  icon: <Plus className="w-3.5 h-3.5" />,            shortcut: '',        onClick: () => handleAddRow(false) },
    { label: 'Cut',            icon: <Scissors className="w-3.5 h-3.5" />,        shortcut: 'Ctrl+X',  divider: true, disabled: selectedIds.size === 0, onClick: handleCutRows },
    { label: 'Copy',           icon: <Copy className="w-3.5 h-3.5" />,            shortcut: 'Ctrl+C',  disabled: selectedIds.size === 0, onClick: handleCopyRows },
    { label: 'Paste',          icon: <ClipboardPaste className="w-3.5 h-3.5" />,  shortcut: 'Ctrl+V',  disabled: !clipboard, onClick: handlePasteRows },
    { label: 'Delete',         icon: <Trash2 className="w-3.5 h-3.5" />,          shortcut: 'Del',     divider: true, disabled: selectedIds.size === 0, danger: true, onClick: handleDeleteRows },
  ];

  // ─── Autogen Dates ───────────────────────────────────────────────────────
  const handleAutogenDates = useCallback(async () => {
    if (!autogenStartDate || !updateStory) return;
    setAutogenLoading(true);
    try {
      const hdDates = holidays.map(h => parseISO(h.date));

      const nextBizDay = (date: Date): Date => {
        let next = addDays(date, 1);
        while (weeklyOffDays.includes(next.getDay()) || hdDates.some(h => isSameDay(h, next)))
          next = addDays(next, 1);
        return next;
      };

      // Returns the date that is `n` additional business days after `start` (n=0 → same day)
      const endFromStart = (start: Date, n: number): Date => {
        let remaining = Math.max(n, 0);
        let cur = start;
        while (remaining > 0) {
          cur = addDays(cur, 1);
          if (!weeklyOffDays.includes(cur.getDay()) && !hdDates.some(h => isSameDay(h, cur)))
            remaining--;
        }
        return cur;
      };

      // Snap to next valid business day if start falls on weekend/holiday
      let devStart = startOfDay(new Date(autogenStartDate + 'T00:00:00'));
      while (weeklyOffDays.includes(devStart.getDay()) || hdDates.some(h => isSameDay(h, devStart)))
        devStart = addDays(devStart, 1);

      // Sub-task effort in days (mirror of the rows-builder helper)
      const getSubEffort = (s: Story): number =>
        s.effortDays ?? (s.estimatedHours != null ? Math.ceil(s.estimatedHours / hoursPerDay) : 0);

      // Build units from `rows` (already filtered to finalised stories) but pull each
      // story's sub-tasks from RAW data so collapsed stories' children also get scheduled.
      type StoryUnit = { reqRow: GanttRow; subTasks: Story[] };
      const units: StoryUnit[] = [];
      const seenReqIds = new Set<string>();
      for (const row of rows) {
        if (row.type !== 'Requirement') continue;
        if (seenReqIds.has(row.id)) continue;
        seenReqIds.add(row.id);
        const subTasks = stories
          .filter(s =>
            s.parentStoryId === row.originalItem.id &&
            s.itemType === 'Sub Task' &&
            !s.isDeleted
          )
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        units.push({ reqRow: row, subTasks });
      }

      const endByReqId = new Map<string, Date>();
      let prevEnd: Date | null = null;
      let prevReqOriginalId: string | null = null;

      for (const { reqRow, subTasks } of units) {
        let effectivePrevEnd = prevEnd;
        if (reqRow.predecessorId) {
          const predUnit = units.find(u => u.reqRow.originalItem.id === reqRow.predecessorId);
          if (predUnit && endByReqId.has(predUnit.reqRow.id))
            effectivePrevEnd = endByReqId.get(predUnit.reqRow.id)!;
        }

        const storyStart = effectivePrevEnd ? nextBizDay(effectivePrevEnd) : devStart;
        let storyEnd = storyStart;

        if (subTasks.length > 0) {
          // Critical-path scheduling within the story:
          //   sub-tasks sharing an assignee or impacted system are sequential;
          //   independent sub-tasks start in parallel at storyStart.
          const lastEndByAssignee = new Map<string, Date>();
          const lastEndBySystem = new Map<string, Date>();

          for (const sub of subTasks) {
            let subStart = storyStart;
            if (sub.assigneeId && lastEndByAssignee.has(sub.assigneeId)) {
              const candidate = nextBizDay(lastEndByAssignee.get(sub.assigneeId)!);
              if (candidate > subStart) subStart = candidate;
            }
            if (sub.impactedSystemId && lastEndBySystem.has(sub.impactedSystemId)) {
              const candidate = nextBizDay(lastEndBySystem.get(sub.impactedSystemId)!);
              if (candidate > subStart) subStart = candidate;
            }

            const subEffort = getSubEffort(sub);
            const subEnd = endFromStart(subStart, Math.max(0, subEffort - 1));

            if (sub.assigneeId) lastEndByAssignee.set(sub.assigneeId, subEnd);
            if (sub.impactedSystemId) lastEndBySystem.set(sub.impactedSystemId, subEnd);
            if (subEnd > storyEnd) storyEnd = subEnd;

            await updateStory(sub.id, {
              startDate: subStart.toISOString(),
              endDate: subEnd.toISOString(),
            });
          }

          // Update the parent: span its children, set predecessor link
          await updateStory(reqRow.originalItem.id, {
            startDate: storyStart.toISOString(),
            endDate: storyEnd.toISOString(),
            predecessorId: prevReqOriginalId ?? '',
          });
        } else {
          // Leaf story: schedule directly using its own duration
          const duration = reqRow.scheduleDuration ?? reqRow.duration ?? 1;
          storyEnd = endFromStart(storyStart, Math.max(0, duration - 1));
          await updateStory(reqRow.originalItem.id, {
            startDate: storyStart.toISOString(),
            endDate: storyEnd.toISOString(),
            predecessorId: prevReqOriginalId ?? '',
          });
        }

        endByReqId.set(reqRow.id, storyEnd);
        prevEnd = storyEnd;
        prevReqOriginalId = reqRow.originalItem.id;
      }
    } finally {
      setAutogenLoading(false);
      setAutogenOpen(false);
    }
  }, [autogenStartDate, rows, stories, holidays, weeklyOffDays, updateStory, hoursPerDay]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const getSelectedEntitiesLabel = () => {
    if (selectedEntities.size === 0) return 'Select...';
    if (selectedEntities.size === 1) {
      const id = Array.from(selectedEntities)[0];
      if (entityTypeFilter === 'System') {
        const sys = impactedSystems?.find(s => s.id === id);
        if (sys) return sys.name;
      } else {
        const emp = employees?.find(e => e.id === id);
        if (emp) return `${emp.firstName} ${emp.lastName}`;
      }
    }
    return `${selectedEntities.size} selected`;
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-background border rounded-md shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 bg-muted/20 h-10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold">Project Schedule</span>
          {/* Filters */}
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <Select value={levelFilter} onValueChange={(v: any) => {
              setLevelFilter(v);
              if (v === 'Requirement') setSelectedEntities(new Set());
            }}>
              <SelectTrigger className="h-7 text-xs w-[130px]">
                <SelectValue placeholder="Level Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Requirement">Requirements</SelectItem>
                <SelectItem value="Sub Tasks">Sub Tasks</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={entityTypeFilter} 
              onValueChange={(v: any) => { setEntityTypeFilter(v); setSelectedEntities(new Set()); }}
              disabled={levelFilter === 'Requirement'}
            >
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="System">System</SelectItem>
                <SelectItem value="Resource">Resource</SelectItem>
              </SelectContent>
            </Select>

            {levelFilter === 'Sub Tasks' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-7 text-xs px-2 flex gap-1 font-normal" disabled={levelFilter === 'Requirement'}>
                    <Filter className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{getSelectedEntitiesLabel()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto" align="start">
                  {entityTypeFilter === 'System' && impactedSystems?.map(s => {
                    const isChecked = selectedEntities.has(s.id);
                    return (
                      <DropdownMenuItem 
                        key={s.id} 
                        onSelect={(e) => {
                          e.preventDefault();
                          const next = new Set(selectedEntities);
                          if (isChecked) next.delete(s.id); else next.add(s.id);
                          setSelectedEntities(next);
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox checked={isChecked} className="pointer-events-none" />
                        <span>{s.name}</span>
                      </DropdownMenuItem>
                    );
                  })}
                  {entityTypeFilter === 'Resource' && employees?.map(emp => {
                    const isChecked = selectedEntities.has(emp.id);
                    return (
                      <DropdownMenuItem 
                        key={emp.id} 
                        onSelect={(e) => {
                          e.preventDefault();
                          const next = new Set(selectedEntities);
                          if (isChecked) next.delete(emp.id); else next.add(emp.id);
                          setSelectedEntities(next);
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox checked={isChecked} className="pointer-events-none" />
                        <span>{emp.firstName} {emp.lastName}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {/* Row operation buttons */}
          <div className="flex items-center gap-0.5 mr-2 border-r border-border pr-2">
            <button onClick={() => handleAddRow(true)} title="Add Row (Insert)"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground">
              <Plus className="h-4 w-4" />
            </button>
            <button onClick={handleCutRows} disabled={selectedIds.size === 0} title="Cut (Ctrl+X)"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-40">
              <Scissors className="h-4 w-4" />
            </button>
            <button onClick={handleCopyRows} disabled={selectedIds.size === 0} title="Copy (Ctrl+C)"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-40">
              <Copy className="h-4 w-4" />
            </button>
            <button onClick={handlePasteRows} disabled={!clipboard} title="Paste (Ctrl+V)"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-40">
              <ClipboardPaste className="h-4 w-4" />
            </button>
            <button onClick={handleDeleteRows} disabled={selectedIds.size === 0} title="Delete (Del)"
              className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground disabled:opacity-40">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {/* Panel toggles */}
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
                  rows={rows.map(r => ({
                    ...r,
                    // Visual indicator for cut rows
                    title: clipboard?.mode === 'cut' && clipboard.rows.some(c => c.id === r.id)
                      ? `✂ ${r.title}` : r.title,
                  }))}
                  selectedIds={selectedIds} editingCell={editingCell}
                  colWidths={colWidths}
                  onSelect={handleSelect}
                  onContextMenu={handleContextMenu}
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

      {/* Context menu — rendered inside main div so it clips to viewport via fixed positioning in the component */}
      {ctxMenu && (
        <GanttContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          actions={ctxActions}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Autogen Dates Dialog */}
      <Dialog open={autogenOpen} onOpenChange={setAutogenOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Auto-generate Dates</DialogTitle>
            <DialogDescription>
              Stories will be scheduled sequentially starting from the development start date,
              using each item&apos;s estimated effort. Predecessor links are respected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Development Start Date</label>
              <input
                type="date"
                value={autogenStartDate}
                onChange={e => setAutogenStartDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutogenOpen(false)} disabled={autogenLoading}>
              Cancel
            </Button>
            <Button onClick={handleAutogenDates} disabled={!autogenStartDate || autogenLoading}>
              {autogenLoading ? 'Generating…' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StoryEditDialog storyId={editingStoryId} onClose={() => setEditingStoryId(null)} />
    </div>
  );
});
