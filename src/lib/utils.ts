import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSprintDisplayId(sprint: { id: string; sprintId?: string; title?: string }, fallbackIndex?: number): string {
  if (!sprint) return 'SP-1';
  if (sprint.sprintId) return sprint.sprintId;
  if (sprint.id && /^SP-\d+$/i.test(sprint.id)) return sprint.id;
  if (sprint.title) {
    const titleMatch = sprint.title.match(/(?:sprint\s*|sp-?)(\d+)/i);
    if (titleMatch) return `SP-${titleMatch[1]}`;
  }
  const match = sprint.id?.match(/\d+/);
  if (match) return `SP-${match[0]}`;
  if (fallbackIndex !== undefined) return `SP-${fallbackIndex + 1}`;
  return sprint.id || 'SP-1';
}

export function generateNextSprintId(sprints: { id: string; sprintId?: string; title?: string }[]): string {
  let maxNum = 0;
  (sprints || []).forEach((s, idx) => {
    const sid = getSprintDisplayId(s, idx);
    const match = sid.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `SP-${maxNum + 1}`;
}
