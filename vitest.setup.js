import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-themes', () => ({
  ThemeProvider: function ThemeProvider({ children }) { return children; },
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/lib/firebase', () => ({
  db: null,
  auth: null,
  firebaseConfig: {},
}));

vi.mock('@/lib/supabase', () => ({
  supabase: null,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => children,
  useDndContext: () => ({ active: null, over: null }),
  DragOverlay: ({ children }) => children,
  Droppable: ({ children }) => children,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    active: null,
  }),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    active: null,
  }),
  sortableKeyboardCoordinates: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    active: null,
  }),
  arrayMove: (array, from, to) => {
    const result = [...array];
    result.splice(to, 0, result.splice(from, 1)[0]);
    return result;
  },
  sortableKeyboardCoordinates: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
}));

vi.mock('@xyflow/react', () => ({
  ReactFlow: () => null,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  useReactFlow: () => ({
    fitView: vi.fn(),
    setViewport: vi.fn(),
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
  }),
}));

vi.mock('dagre', () => ({
  graph: vi.fn(() => ({
    nodes: () => [],
    edges: () => [],
    node: () => ({ x: 0, y: 0 }),
    edge: () => ({ sx: 0, sy: 0, tx: 0, ty: 0 }),
  })),
}));

vi.mock('cmdk', () => ({
  Command: ({ children }) => children,
  CommandDialog: ({ children }) => children,
  CommandInput: () => null,
  CommandList: ({ children }) => children,
  CommandEmpty: () => null,
  CommandGroup: ({ children }) => children,
  CommandItem: ({ children }) => children,
  CommandSeparator: () => null,
  CommandShortcut: () => null,
}));

vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    eachDayOfInterval: (opts) => {
      const days = [];
      let current = new Date(opts.start);
      while (current <= opts.end) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return days;
    },
    eachMonthOfInterval: (opts) => {
      const months = [];
      let current = new Date(opts.start);
      while (current <= opts.end) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    },
    isSameDay: (d1, d2) => d1.toDateString() === d2.toDateString(),
    format: (date, fmt) => {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      return fmt.replace('MMMM', months[date.getMonth()])
        .replace('MMM', months[date.getMonth()])
        .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
        .replace('dd', String(date.getDate()).padStart(2, '0'))
        .replace('d', String(date.getDate()))
        .replace('yyyy', String(date.getFullYear()))
        .replace('yy', String(date.getFullYear()).slice(-2))
        .replace('EEEE', days[date.getDay()])
        .replace('EEE', days[date.getDay()]);
    },
    differenceInDays: (d1, d2) => Math.floor((d1.getTime() - d2.getTime()) / 86400000),
    addDays: (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; },
    subDays: (d, n) => { const r = new Date(d); r.setDate(r.getDate() - n); return r; },
    addWeeks: (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n * 7); return r; },
    previousFriday: (d) => { const day = d.getDay(); const diff = (day === 5 ? 0 : (day < 5 ? day - 5 + 7 : day - 5)); const r = new Date(d); r.setDate(r.getDate() - diff); return r; },
    startOfWeek: (d) => { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; },
    endOfWeek: (d) => { const r = new Date(d); r.setDate(r.getDate() + (6 - r.getDay())); return r; },
    startOfMonth: (d) => { const r = new Date(d); r.setDate(1); return r; },
    getDaysInMonth: (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    startOfDay: (d) => { const r = new Date(d); r.setHours(0,0,0,0); return r; },
    parseISO: (s) => new Date(s),
    isWeekend: () => false,
    addMonths: (d, n) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; },
    getMonth: (d) => d.getMonth(),
    getYear: (d) => d.getFullYear(),
    setMonth: (d, m) => { const r = new Date(d); r.setMonth(m); return r; },
    setYear: (d, y) => { const r = new Date(d); r.setFullYear(y); return r; },
    setHours: (d, h) => { const r = new Date(d); r.setHours(h); return r; },
    setMinutes: (d, m) => { const r = new Date(d); r.setMinutes(m); return r; },
    setTime: (d, t) => { const r = new Date(d); r.setTime(t); return r; },
    isBefore: (d1, d2) => d1 < d2,
    isAfter: (d1, d2) => d1 > d2,
    isWithinInterval: (d, e) => d >= e.start && d <= e.end,
    getHours: (d) => d.getHours(),
    getMinutes: (d) => d.getMinutes(),
    max: (dates) => new Date(Math.max(...dates.map(d => d.getTime()))),
    min: (dates) => new Date(Math.min(...dates.map(d => d.getTime()))),
    isToday: (d) => d.toDateString() === new Date().toDateString(),
    isSameMonth: (d1, d2) => d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear(),
  };
});

vi.mock('recharts', () => ({
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => children,
  Cell: () => null,
  PieChart: () => null,
  Pie: () => null,
  AreaChart: () => null,
  Area: () => null,
  LineChart: () => null,
  Line: () => null,
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => fn),
    reset: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(),
    formState: { errors: {} },
    watch: vi.fn(),
    control: {},
  }),
  Controller: ({ children }) => children,
  FormProvider: ({ children }) => children,
}));

vi.mock('zod', () => {
  const z = vi.importActual('zod');
  return { default: z, zod: z, ...z };
});

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(2)),
}));

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => () => ({ data: {} })),
}));

vi.mock('embla-carousel-react', () => ({
  useEmblaCarousel: () => [[], { scrollTo: vi.fn(), scrollNext: vi.fn(), scrollPrev: vi.fn(), canScrollNext: false, canScrollPrev: false, snapList: [], selectedScrollSnap: 0, scrollToSnap: vi.fn(), on: vi.fn(), off: vi.fn() }],
}));

vi.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children }) => children,
  Panel: ({ children }) => children,
  Divider: () => null,
}));

vi.mock('@/ai/genkit', () => ({
  ai: {
    definePrompt: vi.fn(),
    defineFlow: vi.fn((config, fn) => {
      return async (input) => {
        const output = await fn(input);
        return { output };
      };
    }),
  },
  activeModel: 'google:gemini-2.0-flash',
  z: require('zod'),
}));

