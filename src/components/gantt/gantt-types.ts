import { Story, Release } from '@/types';

export type GanttRowType = 'Release' | 'Requirement' | 'SubTask';

export interface GanttRow {
  id: string;
  type: GanttRowType;
  wbs: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  duration: number | null;
  estimatedHours: number | null;
  status: string;
  assigneeName?: string;
  progress: number;
  predecessorId?: string;
  parentId?: string;
  isExpanded: boolean;
  childrenIds: string[];
  originalItem: Story | Release;
  sortOrder: number;
  level: number; // 0=Release, 1=Requirement, 2=SubTask
}

export const SYSTEM_COLORS = [
  'bg-blue-500','bg-green-500','bg-purple-500','bg-pink-500',
  'bg-yellow-500','bg-indigo-500','bg-orange-500','bg-teal-500','bg-cyan-500',
];

export const COL_KEYS = ['wbs','name','predecessor','duration','start','end'] as const;
export type ColKey = typeof COL_KEYS[number];

export const DEFAULT_COL_WIDTHS: Record<ColKey, number> = {
  wbs: 60, name: 240, predecessor: 80, duration: 70, start: 100, end: 100,
};

export const DAY_WIDTH = 24;
export const ROW_HEIGHT = 36;
