'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { format, parseISO, differenceInDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns';
import { ChevronRight, ChevronDown, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight } from 'lucide-react';
import { Story, Release, StatusHistoryItem } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

// Hierarchical types for Gantt
type GanttRowType = 'Release' | 'Requirement' | 'SubTask' | 'Milestone';

export interface GanttRow {
  id: string;
  type: GanttRowType;
  wbs: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  duration: number | null; // in business days
  estimatedHours: number | null;
  status: string;
  assigneeName?: string;
  progress: number;
  predecessorId?: string;
  
  // Hierarchy
  parentId?: string;
  isExpanded: boolean;
  childrenIds: string[];
  
  // Original Item
  originalItem: Story | Release;
}

export function GanttChart() {
  const { stories, releasesAndMilestones, projectSettings, holidays, weeklyOffDays, employees } = useProject();
  
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  // Column widths state
  const [colWidths, setColWidths] = useState({
    wbs: 60,
    name: 240,
    predecessor: 90,
    duration: 80,
    start: 110,
    end: 110
  });

  const rightPaneRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);

  // Panel refs for collapse/expand
  const leftPanelRef = useRef<any>(null);
  const rightPanelRef = useRef<any>(null);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Sync scrolling between left table and right gantt area
  
  const { updateStory, updateReleaseOrMilestone } = useProject();

  const handleCellEdit = async (rowId: string, field: string, value: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    try {
      if (row.type === 'Release' || row.type === 'Stage' || row.type === 'Milestone') {
         if (!updateReleaseOrMilestone) return;
         await updateReleaseOrMilestone(row.originalItem.id, { [field]: value });
      } else {
         if (!updateStory) return;
         if (field === 'predecessorWbs') {
            const predecessorRow = rows.find(r => r.wbs === value);
            if (predecessorRow && predecessorRow.type !== 'Release' && predecessorRow.type !== 'Stage') {
               await updateStory(row.originalItem.id, { predecessorId: predecessorRow.originalItem.id });
            } else if (value === '') {
               await updateStory(row.originalItem.id, { predecessorId: '' });
            }
         } else {
            await updateStory(row.originalItem.id, { [field]: value });
         }
      }
    } catch (error) {
       console.error("Failed to update cell", error);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>, pane: 'left' | 'right') => {
    if (pane === 'right' && leftPaneRef.current) {
        leftPaneRef.current.scrollTop = e.currentTarget.scrollTop;
    } else if (pane === 'left' && rightPaneRef.current) {
        rightPaneRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to calculate business days
  const calculateBusinessDays = (start: Date, end: Date): number => {
    if(!start || !end) return 0;
    const holidayDates = holidays.map(h => parseISO(h.date));
    const interval = eachDayOfInterval({ start, end });
    
    return interval.filter(day => {
      const dayOfWeek = day.getDay();
      const isWeekEnd = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDates.some(h => isSameDay(day, h));
      return !isWeekEnd && !isHoliday;
    }).length;
  };

  // Process data into flat list of hierarchical rows
  const rows = useMemo(() => {
    const result: GanttRow[] = [];
    
    // Filter out Bugs
    const nonBugStories = stories.filter(s => s.itemType !== 'Bug');
    
    const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');
    const milestones = releasesAndMilestones.filter(r => r.itemType === 'Milestone');
    
    // Sort releases by date
    const sortedReleases = [...releases].sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    let wbsCounter = 1;

    sortedReleases.forEach(release => {
      const releaseRowId = `release-${release.id}`;
      const releaseWBS = `${wbsCounter}`;
      
      const reqsInRelease = nonBugStories.filter(s => s.releaseId === release.id && ['Requirement/Story', 'Feature Change', 'Task'].includes(s.itemType));
      
      const releaseChildrenIds = reqsInRelease.map(r => `req-${r.id}`);
      
      // We will calculate Release start/end based on its children if it doesn't have one, or just use its own.
      // Requirements dates are calculated dynamically from sub-tasks as per user request.

      let releaseMinStart: Date | null = release.startDate ? parseISO(release.startDate) : null;
      let releaseMaxEnd: Date | null = release.endDate ? parseISO(release.endDate) : null;

      const processedReqs: GanttRow[] = [];
      let reqWbsCounter = 1;

      reqsInRelease.forEach(req => {
        const subTasks = nonBugStories.filter(s => s.parentStoryId === req.id && s.itemType === 'Sub Task');
        const subTaskChildrenIds = subTasks.map(st => `sub-${st.id}`);
        
        let reqStart: Date | null = null;
        let reqEnd: Date | null = null;
        let reqEffort = 0;
        
        const processedSubTasks: GanttRow[] = [];
        let subWbsCounter = 1;

        // Process Sub Tasks first to calculate Req dates
        subTasks.forEach(st => {
           let stStart = st.startDate ? parseISO(st.startDate) : null;
           let stEnd = st.endDate ? parseISO(st.endDate) : null;
           
           const stDuration = (stStart && stEnd) ? calculateBusinessDays(stStart, stEnd) : null;
           if (stStart && (!reqStart || stStart < reqStart)) reqStart = stStart;
           if (stEnd && (!reqEnd || stEnd > reqEnd)) reqEnd = stEnd;
           reqEffort += (st.estimatedHours || 0);
           
           const assignee = employees.find(e => e.id === st.assigneeId);
           
           processedSubTasks.push({
             id: `sub-${st.id}`,
             type: 'SubTask',
             wbs: `${releaseWBS}.${reqWbsCounter}.${subWbsCounter}`,
             title: st.title,
             startDate: stStart,
             endDate: stEnd,
             duration: stDuration,
             estimatedHours: st.estimatedHours || null,
             status: st.status,
             assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : undefined,
             progress: st.status === 'Done' ? 100 : (st.status === 'In Progress' ? 50 : 0),
             predecessorId: st.predecessorId,
             parentId: `req-${req.id}`,
             isExpanded: false,
             childrenIds: [],
             originalItem: st
           });
           subWbsCounter++;
        });

        // If subtasks didn't provide dates, fallback to req's own dates if they exist?
        // User said: "if the duration is available and start and end dates are available for the sub tasks, dynamically calculate for the requirement. If not available, dont plot. Just highlight req on the left pane"
        if (!reqStart && req.startDate) reqStart = parseISO(req.startDate);
        if (!reqEnd && req.endDate) reqEnd = parseISO(req.endDate);
        if (reqEffort === 0) reqEffort = req.estimatedHours || 0;

        const reqDuration = (reqStart && reqEnd) ? calculateBusinessDays(reqStart, reqEnd) : null;

        // Determine if we should plot
        // If it lacks start/end, duration is null, Gantt won't draw it.
        
        if (reqStart && (!releaseMinStart || reqStart < releaseMinStart)) releaseMinStart = reqStart;
        if (reqEnd && (!releaseMaxEnd || reqEnd > releaseMaxEnd)) releaseMaxEnd = reqEnd;

        processedReqs.push({
          id: `req-${req.id}`,
          type: 'Requirement',
          wbs: `${releaseWBS}.${reqWbsCounter}`,
          title: req.title,
          startDate: reqStart,
          endDate: reqEnd,
          duration: reqDuration,
          estimatedHours: reqEffort,
          status: req.status,
          progress: req.status === 'Done' ? 100 : (req.status === 'In Progress' ? 50 : 0), // Ideally calculated from subtasks
          predecessorId: req.predecessorId,
          parentId: releaseRowId,
          isExpanded: expandedRows[`req-${req.id}`] || false,
          childrenIds: subTaskChildrenIds,
          originalItem: req
        });
        
        reqWbsCounter++;

        // Add to flat list if release is expanded
        // Wait, flat list construction should happen after all hierarchy is built so we can insert them in order.
      });

      const releaseDuration = (releaseMinStart && releaseMaxEnd) ? calculateBusinessDays(releaseMinStart, releaseMaxEnd) : null;

      // We will assemble the flat list now
              result.push({
                  id: releaseRowId,
                  type: 'Release',
                  wbs: releaseWBS,
                  title: release.name,
                  startDate: releaseMinStart,
                  endDate: releaseMaxEnd,
                  duration: releaseDuration,
                  estimatedHours: null,
                  status: release.isCompleted ? 'Done' : 'In Progress',
                  progress: 0,
                  parentId: undefined,
                  isExpanded: expandedRows[releaseRowId] !== false, // Default true
                  childrenIds: releaseChildrenIds,
                  originalItem: release
              });

      if (expandedRows[releaseRowId] !== false) {
          processedReqs.forEach((reqRow, i) => {
              result.push(reqRow);
              if (reqRow.isExpanded) {
                  // Find its subtasks
                  const reqSubTasks = nonBugStories.filter(s => s.parentStoryId === reqRow.originalItem.id && s.itemType === 'Sub Task');
                  let subWbsC = 1;
                  reqSubTasks.forEach(st => {
                      let stStart = st.startDate ? parseISO(st.startDate) : null;
                      let stEnd = st.endDate ? parseISO(st.endDate) : null;
                      const assignee = employees.find(e => e.id === st.assigneeId);
                      result.push({
                          id: `sub-${st.id}`,
                          type: 'SubTask',
                          wbs: `${reqRow.wbs}.${subWbsC}`,
                          title: st.title,
                          startDate: stStart,
                          endDate: stEnd,
                          duration: (stStart && stEnd) ? calculateBusinessDays(stStart, stEnd) : null,
                          estimatedHours: st.estimatedHours || null,
                          status: st.status,
                          assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : undefined,
                          progress: st.status === 'Done' ? 100 : (st.status === 'In Progress' ? 50 : 0),
                          predecessorId: st.predecessorId,
                          parentId: reqRow.id,
                          isExpanded: false,
                          childrenIds: [],
                          originalItem: st
                      });
                      subWbsC++;
                  });
              }
          });
      }
      
      
      wbsCounter++;
    });

    // Add standalone Milestones
    milestones.forEach(milestone => {
        let mStart = milestone.startDate ? parseISO(milestone.startDate) : null;
        if (!mStart && milestone.milestoneDate) mStart = parseISO(milestone.milestoneDate);
        
        if (mStart) {
            result.push({
                id: `milestone-${milestone.id}`,
                type: 'Milestone',
                wbs: `${wbsCounter}`,
                title: milestone.name,
                startDate: mStart,
                endDate: mStart,
                duration: 0,
                estimatedHours: null,
                status: milestone.isCompleted ? 'Done' : 'Pending',
                progress: milestone.isCompleted ? 100 : 0,
                parentId: undefined,
                isExpanded: false,
                childrenIds: [],
                originalItem: milestone
            });
            wbsCounter++;
        }
    });

    return result;

  }, [stories, releasesAndMilestones, expandedRows, holidays, weeklyOffDays, employees]);

  // Determine Gantt Chart overall timeline
  const { minDate, maxDate, totalDays } = useMemo(() => {
     let min: Date | null = null;
     let max: Date | null = null;

     rows.forEach(r => {
         if (r.startDate) {
             if (!min || r.startDate < min) min = r.startDate;
         }
         if (r.endDate) {
             if (!max || r.endDate > max) max = r.endDate;
         }
     });

     if (!min) min = new Date();
     if (!max) max = addDays(min, 30);

     // Pad by a week on both sides
     min = addDays(startOfWeek(min), -7);
     max = addDays(endOfWeek(max), 7);

     return {
         minDate: min,
         maxDate: max,
         totalDays: differenceInDays(max, min) + 1
     };
  }, [rows]);

  const timelineDays = useMemo(() => {
      return eachDayOfInterval({ start: minDate, end: maxDate });
  }, [minDate, maxDate]);

  const DAY_WIDTH = 24; // pixels per day
  const ROW_HEIGHT = 40; // pixels per row

  // Build coordinate map for predecessor arrows
  const coordinates = useMemo(() => {
    const coords: Record<string, { x: number, y: number, width: number }> = {};
    rows.forEach((row, index) => {
      const eDate = row.endDate || row.startDate;
      if (row.startDate && eDate) {
         const leftOffset = differenceInDays(row.startDate, minDate) * DAY_WIDTH;
         const width = (differenceInDays(eDate, row.startDate) + 1) * DAY_WIDTH;
         coords[row.id] = {
            x: leftOffset,
            y: index * ROW_HEIGHT + ROW_HEIGHT / 2,
            width
         };
      }
    });
    return coords;
  }, [rows, minDate]);

  // Column resizer helper
  const handleColumnResize = (e: React.MouseEvent, colKey: keyof typeof colWidths) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[colKey];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.pageX - startX;
      setColWidths(prev => ({
        ...prev,
        [colKey]: Math.max(30, startWidth + delta) // minimum width 30px
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const totalTableWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0);

  const toggleLeftPanel = () => {
    const panel = leftPanelRef.current;
    if (panel) {
      if (leftCollapsed) {
        panel.expand();
        setLeftCollapsed(false);
      } else {
        panel.collapse();
        setLeftCollapsed(true);
      }
    }
  };

  const toggleRightPanel = () => {
    const panel = rightPanelRef.current;
    if (panel) {
      if (rightCollapsed) {
        panel.expand();
        setRightCollapsed(false);
      } else {
        panel.collapse();
        setRightCollapsed(true);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-md shadow-sm overflow-hidden relative min-w-0">
      
      {/* Header Toolbar */}
      <div className="flex items-center justify-between border-b p-2 bg-muted/10 h-12 shrink-0">
        <div className="text-sm font-medium px-2">Project Schedule</div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={toggleLeftPanel}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title={leftCollapsed ? 'Expand Left Panel' : 'Collapse Left Panel'}
          >
            {leftCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button 
            onClick={toggleRightPanel}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title={rightCollapsed ? 'Expand Right Panel' : 'Collapse Right Panel'}
          >
            {rightCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-w-0">
        <div className="absolute inset-0">
          <ResizablePanelGroup direction="horizontal">
            {/* Left Pane - Table */}
            <ResizablePanel 
              ref={leftPanelRef}
              defaultSize={45} 
              minSize={20} 
              collapsible={true}
              onCollapse={() => setLeftCollapsed(true)}
              onExpand={() => setLeftCollapsed(false)}
            >
              <div className="h-full flex flex-col bg-card relative z-10 overflow-x-auto hide-scrollbar">
            {/* Header */}
            <div className="flex items-center h-12 border-b bg-muted/30 text-xs font-semibold text-muted-foreground w-max min-w-full relative">
              <div style={{ width: colWidths.wbs }} className="relative px-2 flex items-center h-full border-r">
                WBS
                <div className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => handleColumnResize(e, 'wbs')} />
              </div>
              <div style={{ width: colWidths.name }} className="relative px-2 flex items-center h-full border-r">
                Task Name
                <div className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => handleColumnResize(e, 'name')} />
              </div>
              <div style={{ width: colWidths.start }} className="relative px-2 flex items-center h-full border-r">
                Start Date
                <div className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => handleColumnResize(e, 'start')} />
              </div>
              <div style={{ width: colWidths.end }} className="relative px-2 flex items-center h-full border-r">
                End Date
                <div className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => handleColumnResize(e, 'end')} />
              </div>
              <div style={{ width: colWidths.duration }} className="relative px-2 flex items-center h-full">
                Duration
                <div className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/50" onMouseDown={(e) => handleColumnResize(e, 'duration')} />
              </div>
            </div>
            
            {/* Body */}
            <div 
              className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar" 
              ref={leftPaneRef} 
              onScroll={(e) => handleScroll(e, 'left')}
            >
              <div style={{ height: rows.length * ROW_HEIGHT, width: totalTableWidth }} className="relative">
                {rows.map((row, index) => (
                  <div 
                    key={row.id} 
                    className={`absolute flex items-center h-[40px] text-sm border-b hover:bg-muted/50 transition-colors cursor-pointer ${!row.startDate ? 'bg-red-500/5' : ''}`}
                    style={{ top: index * ROW_HEIGHT, width: '100%' }}
                    onClick={() => {
                      if (row.childrenIds.length > 0) {
                        toggleExpand(row.id);
                      }
                    }}
                  >
                    <div style={{ width: colWidths.wbs }} className="px-2 text-xs text-muted-foreground truncate">{row.wbs}</div>
                    <div style={{ width: colWidths.name }} className="px-2 flex items-center truncate">
                      <div style={{ width: row.type === 'Requirement' ? 16 : row.type === 'SubTask' ? 32 : 0 }} className="flex-shrink-0" />
                      {(row.type === 'Release' || row.type === 'Requirement') && row.childrenIds.length > 0 ? (
                        <button 
                          className="mr-1 flex-shrink-0 h-4 w-4 flex items-center justify-center rounded hover:bg-muted"
                        >
                          {row.isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      ) : (
                        <div className="mr-1 w-4 h-4 flex-shrink-0" />
                      )}
                      <span className={`truncate ${row.type === 'Release' ? 'font-semibold' : ''} ${!row.startDate && row.type === 'Requirement' ? 'text-red-500 font-medium' : ''}`}>
                        {row.title}
                      </span>
                    </div>
                    <div style={{ width: colWidths.start }} className="px-2 text-xs text-muted-foreground truncate">
                      {row.startDate ? format(row.startDate, 'MM/dd/yyyy') : '-'}
                    </div>
                    <div style={{ width: colWidths.end }} className="px-2 text-xs text-muted-foreground truncate">
                      {row.endDate ? format(row.endDate, 'MM/dd/yyyy') : '-'}
                    </div>
                    <div style={{ width: colWidths.duration }} className="px-2 text-xs text-muted-foreground truncate">
                      {row.duration !== null ? `${row.duration} d` : '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />

        {/* Right Pane - Gantt Chart */}
        <ResizablePanel 
          ref={rightPanelRef}
          defaultSize={55} 
          minSize={20} 
          collapsible={true}
          onCollapse={() => setRightCollapsed(true)}
          onExpand={() => setRightCollapsed(false)}
        >
          <div className="h-full flex flex-col bg-background overflow-hidden relative">
           {/* Timeline Header */}
           <div className="h-12 border-b bg-muted/30 flex overflow-hidden">
             <div className="relative h-full" style={{ width: totalDays * DAY_WIDTH }}>
                {/* Months */}
                {/* Simplified timeline header for now: just Days */}
                <div className="absolute top-0 w-full h-6 flex border-b">
                   {/* We could group by month here */}
                </div>
                {/* Days */}
                <div className="absolute bottom-0 w-full h-6 flex">
                  {timelineDays.map((day, i) => (
                    <div 
                      key={i} 
                      className="h-full border-r flex items-center justify-center text-[10px] text-muted-foreground"
                      style={{ width: DAY_WIDTH }}
                    >
                      {format(day, 'd')}
                    </div>
                  ))}
                </div>
             </div>
           </div>

           {/* Timeline Body */}
           <div 
             className="flex-1 overflow-auto"
             ref={rightPaneRef}
             onScroll={(e) => handleScroll(e, 'right')}
           >
             <div 
                className="relative" 
                style={{ 
                  width: totalDays * DAY_WIDTH, 
                  height: rows.length * ROW_HEIGHT 
                }}
             >
                {/* Grid Background */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {timelineDays.map((day, i) => (
                    <div 
                      key={i} 
                      className={`h-full border-r ${isWeekend(day) ? 'bg-muted/30' : ''}`}
                      style={{ width: DAY_WIDTH }}
                    />
                  ))}
                </div>

                {/* Predecessor Lines */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                   {rows.map(row => {
                     if (!row.predecessorId) return null;
                     
                     // Predecessor could be a requirement or subtask.
                     // The ID saved in predecessorId is the story ID.
                     // Our gantt IDs are prefixed with req- or sub-.
                     let predId = `req-${row.predecessorId}`;
                     let pCoords = coordinates[predId];
                     if (!pCoords) {
                        predId = `sub-${row.predecessorId}`;
                        pCoords = coordinates[predId];
                     }
                     
                     const cCoords = coordinates[row.id];

                     if (!pCoords || !cCoords) return null;

                     // Draw line from end of predecessor to start of current
                     const startX = pCoords.x + pCoords.width;
                     const startY = pCoords.y;
                     const endX = cCoords.x;
                     const endY = cCoords.y;

                     return (
                       <path 
                         key={`link-${row.id}`}
                         d={`M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}`}
                         fill="none"
                         stroke="hsl(var(--muted-foreground))"
                         strokeWidth="1.5"
                         markerEnd="url(#arrow)"
                       />
                     );
                   })}
                   <defs>
                     <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                       <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
                     </marker>
                   </defs>
                </svg>

                {/* Task Bars */}
                {rows.map((row, index) => {
                  if (!row.startDate) return null;
                  const eDate = row.endDate || row.startDate;

                  const leftOffset = differenceInDays(row.startDate, minDate) * DAY_WIDTH;
                  // +1 to include the end date day fully
                  const width = (differenceInDays(eDate, row.startDate) + 1) * DAY_WIDTH;

                  return (
                    <div 
                      key={row.id}
                      className="absolute group flex items-center"
                      style={{ 
                        top: index * ROW_HEIGHT, 
                        height: ROW_HEIGHT,
                        left: leftOffset,
                      }}
                    >
                       {row.type === 'Milestone' ? (
                         <div className="relative flex items-center justify-center" style={{ width: DAY_WIDTH }}>
                            <div className="w-4 h-4 bg-slate-800 rotate-45 border border-white z-10" />
                         </div>
                       ) : (
                         <div 
                            className={`relative flex items-center h-5 rounded-sm shadow-sm ${
                              row.type === 'Release' ? 'bg-primary' : 
                              row.type === 'Requirement' ? 'bg-blue-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width }}
                         >
                           {/* Progress indicator */}
                           <div 
                              className="absolute top-0 left-0 h-full bg-white/20 rounded-l-sm"
                              style={{ width: `${row.progress}%` }}
                           />
                         </div>
                       )}
                       
                       {/* Right label */}
                       <span className="ml-2 text-xs whitespace-nowrap text-muted-foreground hidden group-hover:block z-20 bg-background/80 px-1 rounded">
                          {row.title} {row.assigneeName ? `(${row.assigneeName})` : ''}
                       </span>
                    </div>
                  )
                })}
             </div>
           </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
