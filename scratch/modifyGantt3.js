const fs = require('fs');
let code = fs.readFileSync('scratch/modified_step2.tsx', 'utf8');

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
code = code.replace(tableHeaderRegex, newTableHeader);

// Now for the body mapping...
// Find: `<div key={row.id} className="flex items-center ...` inside the map.
// We will replace the children of this div.
const bodyRowChildrenRegex = /<div style={{ width: colWidths\.start }}[\s\S]*?(?=\s*<\/div>\s*\{\/\* Timeline Sync \*\/\})/;

const newBodyChildren = `<div style={{ width: colWidths.start }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="date"
                           className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs"
                           defaultValue={row.startDate ? format(row.startDate, 'yyyy-MM-dd') : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'startDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        />
                    ) : (row.startDate ? format(row.startDate, 'MM/dd/yyyy') : '-')}
                  </div>
                  <div style={{ width: colWidths.end }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="date"
                           className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs"
                           defaultValue={row.endDate ? format(row.endDate, 'yyyy-MM-dd') : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'endDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        />
                    ) : (row.endDate ? format(row.endDate, 'MM/dd/yyyy') : '-')}
                  </div>
                  <div style={{ width: colWidths.duration }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="number"
                           className="w-16 bg-transparent border-none p-0 focus:ring-0 text-xs"
                           defaultValue={row.duration !== null ? row.duration : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'effortDays', e.target.value)}
                        />
                    ) : (row.duration !== null ? \`\${row.duration} d\` : '-')}
                  </div>`;

// Wait, the structure needs predecessor, duration, start, end
const correctBodyChildren = `<div style={{ width: colWidths.predecessor }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="text"
                           className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs"
                           defaultValue={row.predecessorId ? (rows.find(r => r.originalItem?.id === row.predecessorId)?.wbs || '') : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'predecessorWbs', e.target.value)}
                        />
                    ) : '-'}
                  </div>
                  <div style={{ width: colWidths.duration }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="number"
                           className="w-16 bg-transparent border-none p-0 focus:ring-0 text-xs"
                           defaultValue={row.duration !== null ? row.duration : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'effortDays', e.target.value)}
                        />
                    ) : (row.duration !== null ? \`\${row.duration} d\` : '-')}
                  </div>
                  <div style={{ width: colWidths.start }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="date"
                           className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs"
                           defaultValue={row.startDate ? format(row.startDate, 'yyyy-MM-dd') : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'startDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        />
                    ) : (row.startDate ? format(row.startDate, 'MM/dd/yyyy') : '-')}
                  </div>
                  <div style={{ width: colWidths.end }} className="relative px-2 py-1 flex items-center h-full border-r overflow-hidden text-ellipsis whitespace-nowrap">
                    {row.type !== 'Release' && row.type !== 'Stage' && row.type !== 'Milestone' ? (
                        <input 
                           type="date"
                           className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs"
                           defaultValue={row.endDate ? format(row.endDate, 'yyyy-MM-dd') : ''}
                           onBlur={(e) => handleCellEdit(row.id, 'endDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        />
                    ) : (row.endDate ? format(row.endDate, 'MM/dd/yyyy') : '-')}
                  </div>`;

code = code.replace(bodyRowChildrenRegex, correctBodyChildren);

fs.writeFileSync('src/components/gantt/GanttChart.tsx', code);
console.log('done step 3');
