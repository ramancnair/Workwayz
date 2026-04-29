const fs = require('fs');

// Read the original file
let code = fs.readFileSync('scratch/modified_step1.tsx', 'utf8');

const useMemoStart = '  const rows = useMemo(() => {';
const useMemoEnd = '  }, [stories, releasesAndMilestones, expandedRows, employees]);';

const startIndex = code.indexOf(useMemoStart);
const endIndex = code.indexOf(useMemoEnd) + useMemoEnd.length;

const beforeUseMemo = code.substring(0, startIndex);
const afterUseMemo = code.substring(endIndex);

const newUseMemo = `  const rows = useMemo(() => {
    const result: GanttRow[] = [];
    
    // Filter out Bugs
    const nonBugStories = stories.filter(s => s.itemType !== 'Bug');
    
    const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');
    const stages = releasesAndMilestones.filter(r => r.itemType === 'Stage');
    const milestones = releasesAndMilestones.filter(r => r.itemType === 'Milestone');
    
    // Sort releases by date
    const sortedReleases = [...releases].sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    // Helper to process subtasks
    const processSubTasks = (req: Story, reqWbs: string) => {
       const subTasks = nonBugStories.filter(s => s.parentStoryId === req.id && s.itemType === 'Sub Task');
       const processedSubTasks: GanttRow[] = [];
       
       let reqStart: Date | null = null;
       let reqEnd: Date | null = null;
       let reqEffort = 0;

       let subWbsCounter = 1;
       subTasks.forEach(st => {
           let stStart = st.startDate ? parseISO(st.startDate) : null;
           let stEnd = st.endDate ? parseISO(st.endDate) : null;
           const stDuration = (stStart && stEnd) ? calculateBusinessDays(stStart, stEnd) : null;
           
           if (stStart && (!reqStart || stStart < reqStart)) reqStart = stStart;
           if (stEnd && (!reqEnd || stEnd > reqEnd)) reqEnd = stEnd;
           reqEffort += (st.estimatedHours || 0);

           const assignee = employees.find(e => e.id === st.assigneeId);

           processedSubTasks.push({
             id: \`sub-\${st.id}\`,
             type: 'SubTask',
             wbs: \`\${reqWbs}.\${subWbsCounter}\`,
             title: st.title,
             startDate: stStart,
             endDate: stEnd,
             duration: stDuration,
             estimatedHours: st.estimatedHours || null,
             status: st.status,
             assigneeName: assignee ? \`\${assignee.firstName} \${assignee.lastName}\` : undefined,
             progress: st.status === 'Done' ? 100 : (st.status === 'In Progress' ? 50 : 0),
             predecessorId: st.predecessorId,
             parentId: \`req-\${req.id}\`,
             isExpanded: false,
             childrenIds: [],
             originalItem: st
           });
           subWbsCounter++;
       });
       return { processedSubTasks, subTaskChildrenIds: subTasks.map(st => \`sub-\${st.id}\`), reqStart, reqEnd, reqEffort };
    };

    let wbsCounter = 1;

    sortedReleases.forEach(release => {
      const releaseRowId = \`release-\${release.id}\`;
      const releaseWBS = \`\${wbsCounter}\`;
      
      let releaseMinStart: Date | null = release.startDate ? parseISO(release.startDate) : null;
      let releaseMaxEnd: Date | null = release.endDate ? parseISO(release.endDate) : null;

      const stagesInRelease = stages.filter(stg => stg.parentReleaseId === release.id);
      const reqsDirectToRelease = nonBugStories.filter(s => s.releaseId === release.id && ['Requirement/Story', 'Feature Change', 'Task'].includes(s.itemType));
      
      const releaseChildrenIds: string[] = [];
      const releaseChildrenRows: GanttRow[] = [];

      let childWbsCounter = 1;

      // 1. Process Stages
      stagesInRelease.forEach(stage => {
          const stageRowId = \`stage-\${stage.id}\`;
          const stageWBS = \`\${releaseWBS}.\${childWbsCounter}\`;
          releaseChildrenIds.push(stageRowId);
          
          const reqsInStage = nonBugStories.filter(s => s.releaseId === stage.id && ['Requirement/Story', 'Feature Change', 'Task'].includes(s.itemType));
          const stageChildrenIds: string[] = [];
          const stageChildrenRows: GanttRow[] = [];
          
          let stageMinStart: Date | null = stage.startDate ? parseISO(stage.startDate) : null;
          let stageMaxEnd: Date | null = stage.endDate ? parseISO(stage.endDate) : null;
          
          let reqWbsCounter = 1;
          reqsInStage.forEach(req => {
              const reqWbs = \`\${stageWBS}.\${reqWbsCounter}\`;
              stageChildrenIds.push(\`req-\${req.id}\`);
              
              const subTaskResult = processSubTasks(req, reqWbs);
              
              let rStart = subTaskResult.reqStart;
              let rEnd = subTaskResult.reqEnd;
              if (!rStart && req.startDate) rStart = parseISO(req.startDate);
              if (!rEnd && req.endDate) rEnd = parseISO(req.endDate);
              let rEffort = subTaskResult.reqEffort || req.estimatedHours || 0;
              
              if (rStart && (!stageMinStart || rStart < stageMinStart)) stageMinStart = rStart;
              if (rEnd && (!stageMaxEnd || rEnd > stageMaxEnd)) stageMaxEnd = rEnd;

              const reqRow: GanttRow = {
                  id: \`req-\${req.id}\`,
                  type: 'Requirement',
                  wbs: reqWbs,
                  title: req.title,
                  startDate: rStart,
                  endDate: rEnd,
                  duration: (rStart && rEnd) ? calculateBusinessDays(rStart, rEnd) : null,
                  estimatedHours: rEffort,
                  status: req.status,
                  progress: req.status === 'Done' ? 100 : (req.status === 'In Progress' ? 50 : 0),
                  predecessorId: req.predecessorId,
                  parentId: stageRowId,
                  isExpanded: expandedRows[\`req-\${req.id}\`] || false,
                  childrenIds: subTaskResult.subTaskChildrenIds,
                  originalItem: req
              };
              
              stageChildrenRows.push(reqRow);
              if (reqRow.isExpanded) {
                  stageChildrenRows.push(...subTaskResult.processedSubTasks);
              }
              reqWbsCounter++;
          });
          
          if (stageMinStart && (!releaseMinStart || stageMinStart < releaseMinStart)) releaseMinStart = stageMinStart;
          if (stageMaxEnd && (!releaseMaxEnd || stageMaxEnd > releaseMaxEnd)) releaseMaxEnd = stageMaxEnd;

          const stageRow: GanttRow = {
              id: stageRowId,
              type: 'Stage',
              wbs: stageWBS,
              title: stage.name,
              startDate: stageMinStart,
              endDate: stageMaxEnd,
              duration: (stageMinStart && stageMaxEnd) ? calculateBusinessDays(stageMinStart, stageMaxEnd) : null,
              estimatedHours: null,
              status: stage.isCompleted ? 'Done' : 'In Progress',
              progress: 0,
              parentId: releaseRowId,
              isExpanded: expandedRows[stageRowId] || false,
              childrenIds: stageChildrenIds,
              originalItem: stage
          };
          
          releaseChildrenRows.push(stageRow);
          if (stageRow.isExpanded) {
              releaseChildrenRows.push(...stageChildrenRows);
          }
          childWbsCounter++;
      });

      // 2. Process Direct Requirements
      reqsDirectToRelease.forEach(req => {
          const reqWbs = \`\${releaseWBS}.\${childWbsCounter}\`;
          releaseChildrenIds.push(\`req-\${req.id}\`);
          
          const subTaskResult = processSubTasks(req, reqWbs);
          
          let rStart = subTaskResult.reqStart;
          let rEnd = subTaskResult.reqEnd;
          if (!rStart && req.startDate) rStart = parseISO(req.startDate);
          if (!rEnd && req.endDate) rEnd = parseISO(req.endDate);
          let rEffort = subTaskResult.reqEffort || req.estimatedHours || 0;
          
          if (rStart && (!releaseMinStart || rStart < releaseMinStart)) releaseMinStart = rStart;
          if (rEnd && (!releaseMaxEnd || rEnd > releaseMaxEnd)) releaseMaxEnd = rEnd;

          const reqRow: GanttRow = {
              id: \`req-\${req.id}\`,
              type: 'Requirement',
              wbs: reqWbs,
              title: req.title,
              startDate: rStart,
              endDate: rEnd,
              duration: (rStart && rEnd) ? calculateBusinessDays(rStart, rEnd) : null,
              estimatedHours: rEffort,
              status: req.status,
              progress: req.status === 'Done' ? 100 : (req.status === 'In Progress' ? 50 : 0),
              predecessorId: req.predecessorId,
              parentId: releaseRowId,
              isExpanded: expandedRows[\`req-\${req.id}\`] || false,
              childrenIds: subTaskResult.subTaskChildrenIds,
              originalItem: req
          };
          
          releaseChildrenRows.push(reqRow);
          if (reqRow.isExpanded) {
              releaseChildrenRows.push(...subTaskResult.processedSubTasks);
          }
          childWbsCounter++;
      });

      // Assembly for Release
      result.push({
          id: releaseRowId,
          type: 'Release',
          wbs: releaseWBS,
          title: release.name,
          startDate: releaseMinStart,
          endDate: releaseMaxEnd,
          duration: (releaseMinStart && releaseMaxEnd) ? calculateBusinessDays(releaseMinStart, releaseMaxEnd) : null,
          estimatedHours: null,
          status: release.isCompleted ? 'Done' : 'In Progress',
          progress: 0,
          parentId: undefined,
          isExpanded: expandedRows[releaseRowId] !== false,
          childrenIds: releaseChildrenIds,
          originalItem: release
      });

      if (expandedRows[releaseRowId] !== false) {
          result.push(...releaseChildrenRows);
      }
      
      wbsCounter++;
    });

    // Add standalone Milestones
    milestones.forEach(milestone => {
        let mStart = milestone.startDate ? parseISO(milestone.startDate) : null;
        if (!mStart && milestone.milestoneDate) mStart = parseISO(milestone.milestoneDate);
        
        if (mStart) {
            result.push({
                id: \`milestone-\${milestone.id}\`,
                type: 'Milestone',
                wbs: \`\${wbsCounter}\`,
                title: milestone.name,
                startDate: mStart,
                endDate: mStart,
                duration: 0,
                estimatedHours: null,
                status: milestone.isCompleted ? 'Done' : 'In Progress',
                progress: 0,
                parentId: undefined,
                isExpanded: false,
                childrenIds: [],
                originalItem: milestone
            });
            wbsCounter++;
        }
    });

    return result;
  }, [stories, releasesAndMilestones, expandedRows, employees]);`;

const finalCode = beforeUseMemo + newUseMemo + afterUseMemo;

// Now apply the UI replacements (step 3) to finalCode
const tableHeaderRegex = /\{\/\* Header \*\/\}[\s\S]*?\{\/\* Body \*\/\}/;
const newTableHeader = `{/* Header */}
            <div className="flex items-center h-12 border-b bg-muted/30 text-xs font-semibold text-muted-foreground w-max min-w-full relative">
              <div style={{ width: colWidths.wbs }} className="relative px-2 flex items-center h-full border-r">
                WBS
              </div>
              <div style={{ width: colWidths.name }} className="relative px-2 flex items-center h-full border-r">
                Task Name
              </div>
              <div style={{ width: colWidths.predecessor }} className="relative px-2 flex items-center h-full border-r">
                Predecessor
              </div>
              <div style={{ width: colWidths.duration }} className="relative px-2 flex items-center h-full border-r">
                Duration
              </div>
              <div style={{ width: colWidths.start }} className="relative px-2 flex items-center h-full border-r">
                Start Date
              </div>
              <div style={{ width: colWidths.end }} className="relative px-2 flex items-center h-full border-r">
                End Date
              </div>
            </div>

            {/* Body */}`;
let modifiedUiCode = finalCode.replace(tableHeaderRegex, newTableHeader);

const bodyRowChildrenRegex = /<div style={{ width: colWidths\.start }}[\s\S]*?(?=\s*<\/div>\s*\{\/\* Timeline Sync \*\/\})/;
const correctBodyChildren = `<div style={{ width: colWidths.predecessor }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="text"
                           className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs text-muted-foreground"
                           defaultValue={row.predecessorId ? (rows.find(r => r.originalItem?.id === row.predecessorId)?.wbs || '') : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'predecessorWbs', e.target.value)}
                        />
                    ) : '-'}
                  </div>
                  <div style={{ width: colWidths.duration }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="number"
                           className="w-16 bg-transparent border-none p-0 focus:ring-0 text-xs text-muted-foreground"
                           defaultValue={row.duration !== null ? row.duration : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'effortDays', e.target.value)}
                        />
                    ) : (row.duration !== null ? \`\${row.duration} d\` : '-')}
                  </div>
                  <div style={{ width: colWidths.start }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="date"
                           className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs text-muted-foreground"
                           defaultValue={row.startDate ? format(row.startDate, 'yyyy-MM-dd') : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'startDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        />
                    ) : (row.startDate ? format(row.startDate, 'MM/dd/yyyy') : '-')}
                  </div>
                  <div style={{ width: colWidths.end }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="date"
                           className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs text-muted-foreground"
                           defaultValue={row.endDate ? format(row.endDate, 'yyyy-MM-dd') : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'endDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        />
                    ) : (row.endDate ? format(row.endDate, 'MM/dd/yyyy') : '-')}
                  </div>`;

modifiedUiCode = modifiedUiCode.replace(bodyRowChildrenRegex, correctBodyChildren);

fs.writeFileSync('src/components/gantt/GanttChart.tsx', modifiedUiCode);
console.log('Fixed GanttChart!');
