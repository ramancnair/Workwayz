const fs = require('fs');
let code = fs.readFileSync('src/components/gantt/GanttChart.tsx', 'utf8');

// 1. Update col widths and add predecessor
code = code.replace(/const \[colWidths, setColWidths\] = useState\(\{[\s\S]*?duration: 80\s*\}\);/,
`const [colWidths, setColWidths] = useState({
    wbs: 60,
    name: 240,
    predecessor: 90,
    duration: 80,
    start: 110,
    end: 110
  });`);

// 2. Add handleCellEdit into component top level
const handleCellEditSnippet = `
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
`;

code = code.replace("const handleScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>, pane: 'left' | 'right') => {", 
  handleCellEditSnippet + "\n  const handleScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>, pane: 'left' | 'right') => {");

// We need to rewrite the entire rows = useMemo block.
// We will replace everything from `const rows = useMemo(() => {` to `return result;\n  }, [stories, releasesAndMilestones, expandedRows, employees]);`
// But first let's just create a completely new file so I don't mess up replacing.

fs.writeFileSync('scratch/modified_step1.tsx', code);
console.log('done step 1');
