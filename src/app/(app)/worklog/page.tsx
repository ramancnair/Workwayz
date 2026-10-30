'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  format,
  startOfWeek,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
  getMonth,
  getYear,
  setMonth,
  setYear,
} from 'date-fns';
import type { Story, WorklogItem } from '@/types';
import {
  PlusCircle,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { v4 as uuidv4 } from 'uuid';
import {
  db,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  setDoc,
  doc,
} from '@/lib/db-provider';
import {
  getWorkItemOptionsForProject as getWorkItemOptionsHelper,
  isEmployeeAllocatedToProject,
} from '@/lib/worklog-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
}

interface RowWorkItem extends WorklogItem {
  projectId: string;
}

interface EmployeeOption {
  id: string;
  empId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizeDateKey = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    if (dateVal.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
      return dateVal.slice(0, 10);
    }
    try {
      return format(parseISO(dateVal), 'yyyy-MM-dd');
    } catch {
      return dateVal;
    }
  }
  if (dateVal instanceof Date) {
    return format(dateVal, 'yyyy-MM-dd');
  }
  if (dateVal?.toDate) {
    return dateVal.toDate().toISOString().slice(0, 10);
  }
  return '';
};

// ---------------------------------------------------------------------------
// Global Worklog Component
// ---------------------------------------------------------------------------

export default function GlobalWorklogPage() {
  const { userRole } = usePermissions();
  const isAdmin = userRole === 'Administrator' || userRole === 'Super Admin';
  const { toast } = useToast();

  // Current user from local storage
  const currentUser = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('workwayz_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Employee Selection State
  // -------------------------------------------------------------------------
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const u = localStorage.getItem('workwayz_user');
      if (!u) return '';
      const parsed = JSON.parse(u);
      return parsed.empId || parsed.id || '';
    } catch {
      return '';
    }
  });

  const [availableEmployees, setAvailableEmployees] = useState<EmployeeOption[]>([]);

  // -------------------------------------------------------------------------
  // Project list state (Only Active projects where user/employee is a resource)
  // -------------------------------------------------------------------------
  const [myProjects, setMyProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // -------------------------------------------------------------------------
  // Project subcollection stores
  // -------------------------------------------------------------------------
  const [storiesByProject, setStoriesByProject] = useState<Record<string, Story[]>>({});
  const [worklogsByProject, setWorklogsByProject] = useState<Record<string, any[]>>({});
  const [holidays, setHolidays] = useState<any[]>([]);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([0, 6]);

  // 1. Load employees from top-level employees collection for admin selection
  useEffect(() => {
    if (!db) return;

    const loadEmployees = async () => {
      try {
        const empSnap = await getDocs(
          query(collection(db!, 'employees'), where('isDeleted', '!=', true))
        );
        const empList: EmployeeOption[] = [];
        empSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.isEnabled === false) return;
          const empId = (data.empId || d.id || '').trim();
          const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || empId;
          if (empId) {
            empList.push({
              id: empId,
              empId,
              name: fullName,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
            });
          }
        });
        empList.sort((a, b) => a.name.localeCompare(b.name));
        setAvailableEmployees(empList);

        // If current selection is empty, default it
        if (!selectedEmployeeId) {
          if (currentUser?.empId) {
            setSelectedEmployeeId(currentUser.empId);
          } else if (empList.length > 0) {
            setSelectedEmployeeId(empList[0].id);
          }
        }
      } catch (eErr) {
        console.warn('Could not load top-level employees:', eErr);
      }
    };

    loadEmployees();
  }, [currentUser?.empId]);

  // 2. Load projects strictly allocated to the selected employee (or PM)
  useEffect(() => {
    if (!db) {
      setLoadingProjects(false);
      return;
    }

    const loadProjectsForEmployee = async () => {
      try {
        setLoadingProjects(true);

        const effectiveEmpId = (selectedEmployeeId || currentUser?.empId || '').trim();
        const selectedEmp = availableEmployees.find(
          (e) =>
            e.empId.toLowerCase() === effectiveEmpId.toLowerCase() ||
            e.id.toLowerCase() === effectiveEmpId.toLowerCase()
        );
        const targetEmpId = effectiveEmpId.toLowerCase();
        const targetEmail = (
          selectedEmp?.email ||
          (effectiveEmpId.toLowerCase() === currentUser?.empId?.toLowerCase() ? currentUser?.email : '') ||
          ''
        ).trim().toLowerCase();

        const projectsSnap = await getDocs(
          query(collection(db!, 'projects'), where('isDeleted', '!=', true))
        );

        const activeProjects = projectsSnap.docs
          .map((d: any) => ({ ...d.data(), id: d.id }))
          .filter((p: any) => !p.isArchived && (p.status === 'Active' || !p.status) && p.id !== 'other');

        const matchedProjects: ProjectSummary[] = [];

        await Promise.all(
          activeProjects.map(async (p: any) => {
            const name = p.name || p.projectName || p.id;

            let resources: any[] = [];
            try {
              const pEmps = await getDocs(collection(db!, 'projects', p.id, 'employees'));
              resources = pEmps.docs.map((ed: any) => ({ ...ed.data(), id: ed.id }));
            } catch {
              // safe ignore
            }

            if (isEmployeeAllocatedToProject(p, targetEmpId, targetEmail, resources)) {
              matchedProjects.push({ id: p.id, name, status: p.status || 'Active' });
            }
          })
        );

        matchedProjects.sort((a, b) => a.name.localeCompare(b.name));
        setMyProjects(matchedProjects);
      } catch (err) {
        console.warn('Failed to load worklog data:', err);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjectsForEmployee();
  }, [selectedEmployeeId, currentUser?.empId, currentUser?.email, availableEmployees]);

  // Subscribe to stories and worklogs for each active project and 'other'
  useEffect(() => {
    if (!db) return;

    const unsubs: (() => void)[] = [];

    // Always subscribe to 'other' worklogs
    const otherWorklogsUnsub = onSnapshot(
      collection(db!, 'projects', 'other', 'worklogs'),
      (snap: any) => {
        const list: any[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setWorklogsByProject((prev) => ({ ...prev, other: list }));
      },
      (err: any) => console.warn('other worklogs error:', err)
    );
    unsubs.push(otherWorklogsUnsub);

    myProjects.forEach((proj) => {
      // Stories
      const storiesUnsub = onSnapshot(
        collection(db!, 'projects', proj.id, 'stories'),
        (snap: any) => {
          const list: Story[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          setStoriesByProject((prev) => ({ ...prev, [proj.id]: list }));
        },
        (err: any) => console.warn(`stories error ${proj.id}:`, err)
      );
      unsubs.push(storiesUnsub);

      // Worklogs
      const worklogsUnsub = onSnapshot(
        collection(db!, 'projects', proj.id, 'worklogs'),
        (snap: any) => {
          const list: any[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          setWorklogsByProject((prev) => ({ ...prev, [proj.id]: list }));
        },
        (err: any) => console.warn(`worklogs error ${proj.id}:`, err)
      );
      unsubs.push(worklogsUnsub);
    });

    // Global Holidays
    const holUnsub = onSnapshot(
      collection(db!, 'holidays'),
      (snap: any) => {
        setHolidays(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      },
      (err: any) => console.warn('holidays error:', err)
    );
    unsubs.push(holUnsub);

    // Settings for weeklyOffDays
    const settingsUnsub = onSnapshot(
      doc(db!, 'settings', 'main'),
      (snap: any) => {
        if (snap.exists()) {
          const data = snap.data();
          setWeeklyOffDays(data.weeklyOffDays || [0, 6]);
        } else {
          setWeeklyOffDays([0, 6]);
        }
      },
      (err: any) => console.warn('settings error:', err)
    );
    unsubs.push(settingsUnsub);

    return () => unsubs.forEach((u) => u());
  }, [myProjects]);

  // Display employees list ensuring current user is present
  const displayEmployees = useMemo(() => {
    const list = [...availableEmployees];
    if (currentUser?.empId && !list.some((e) => e.empId.toLowerCase() === currentUser.empId.toLowerCase())) {
      list.unshift({
        id: currentUser.empId,
        empId: currentUser.empId,
        name: currentUser.name || currentUser.empId,
        firstName: currentUser.name?.split(' ')[0] || 'User',
      });
    }
    return list;
  }, [availableEmployees, currentUser]);

  // Selected employee display object
  const activeEmployee = useMemo(() => {
    return (
      displayEmployees.find(
        (e) => e.id.toLowerCase() === (selectedEmployeeId || '').toLowerCase()
      ) || {
        id: selectedEmployeeId || currentUser?.empId || 'E100001',
        empId: selectedEmployeeId || currentUser?.empId || 'E100001',
        name: currentUser?.name || 'Current User',
        firstName: currentUser?.name?.split(' ')[0] || 'User',
      }
    );
  }, [displayEmployees, selectedEmployeeId, currentUser]);

  // -------------------------------------------------------------------------
  // Date & Calendar State
  // -------------------------------------------------------------------------
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [optimisticDailyHours, setOptimisticDailyHours] = useState<Record<string, number>>({});

  useEffect(() => {
    const today = new Date();
    setSelectedDate(today);
    setDisplayDate(today);
  }, []);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));
  const currentYear = getYear(new Date());
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const weekStartDate = useMemo(
    () => startOfWeek(displayDate, { weekStartsOn: 0 }),
    [displayDate]
  );
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStartDate);
      day.setDate(day.getDate() + i);
      return day;
    });
  }, [weekStartDate]);

  // -------------------------------------------------------------------------
  // Aggregated Daily Hours across ALL active projects for selected employee
  // -------------------------------------------------------------------------
  const dailyHoursMap = useMemo(() => {
    const targetEmp = (selectedEmployeeId || currentUser?.empId || '').trim().toLowerCase();
    const map: Record<string, number> = {};

    Object.values(worklogsByProject).forEach((pLogs) => {
      pLogs.forEach((log) => {
        const logEmp = (log.employeeId || '').trim().toLowerCase();
        if (targetEmp && logEmp === targetEmp) {
          const dateKey = normalizeDateKey(log.date);
          if (dateKey) {
            map[dateKey] = (map[dateKey] || 0) + (Number(log.totalHours) || 0);
          }
        }
      });
    });

    // Apply optimistic updates
    Object.entries(optimisticDailyHours).forEach(([dateKey, hours]) => {
      map[dateKey] = hours;
    });

    return map;
  }, [worklogsByProject, selectedEmployeeId, currentUser?.empId, optimisticDailyHours]);

  const weeklyTotalHours = useMemo(() => {
    return weekDays.reduce((sum, day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return sum + (dailyHoursMap[dateKey] || 0);
    }, 0);
  }, [weekDays, dailyHoursMap]);

  const weeklyRequiredHours = useMemo(() => {
    const offDays = weeklyOffDays || [0, 6];
    const hList = holidays || [];
    const workingDaysCount = weekDays.filter((day) => {
      const dateString = format(day, 'yyyy-MM-dd');
      const isWeekend = offDays.includes(day.getDay());
      const isHoliday = hList.some((h) => {
        const hKey = normalizeDateKey(h.date);
        return (hKey && hKey === dateString) || (h.date && isSameDay(new Date(h.date), day));
      });
      return !isWeekend && !isHoliday;
    }).length;
    return workingDaysCount * 8;
  }, [weekDays, weeklyOffDays, holidays]);

  // -------------------------------------------------------------------------
  // Work Items on Selected Date
  // -------------------------------------------------------------------------
  const [logItems, setLogItems] = useState<RowWorkItem[]>([]);
  const [workItemInputValues, setWorkItemInputValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load items from all projects for selectedEmployee and selectedDate
  useEffect(() => {
    if (!selectedDate) return;
    const targetEmp = (selectedEmployeeId || currentUser?.empId || '').trim().toLowerCase();
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const combinedRows: RowWorkItem[] = [];
    const inputVals: Record<string, string> = {};

    Object.entries(worklogsByProject).forEach(([projId, pLogs]) => {
      const matchingLog = pLogs.find((log) => {
        const logEmp = (log.employeeId || '').trim().toLowerCase();
        return (
          targetEmp &&
          logEmp === targetEmp &&
          normalizeDateKey(log.date) === dateString
        );
      });

      if (matchingLog && Array.isArray(matchingLog.items)) {
        const pStories = storiesByProject[projId] || [];
        matchingLog.items.forEach((item: any) => {
          const rowId = uuidv4();
          combinedRows.push({
            ...item,
            id: rowId,
            projectId: projId,
          });

          // Match label
          const matchedStory = pStories.find((s) => s.id === item.itemId);
          if (matchedStory) {
            inputVals[rowId] = `[${matchedStory.storyId}] ${matchedStory.title}`;
          } else if (item.itemId === 'meeting') {
            inputVals[rowId] = 'Meeting';
          } else if (item.itemId === 'other') {
            inputVals[rowId] = 'Other';
          } else if (item.itemId === 'training') {
            inputVals[rowId] = 'Training / Skill Development';
          } else if (item.itemId === 'admin') {
            inputVals[rowId] = 'Administrative Tasks';
          } else if (item.itemId === 'bench') {
            inputVals[rowId] = 'Bench / Unallocated';
          } else if (item.itemId === 'holiday') {
            inputVals[rowId] = 'Holiday';
          } else if (item.itemId === 'weekend') {
            inputVals[rowId] = 'Weekend';
          } else {
            inputVals[rowId] = item.itemId || item.description || '';
          }
        });
      }
    });

    if (combinedRows.length > 0) {
      setLogItems(combinedRows);
      setWorkItemInputValues(inputVals);
    } else {
      // Create initial empty item (default to first assigned project or 'other' if no projects)
      const initialProjId = myProjects[0]?.id || 'other';
      const isOther = initialProjId === 'other';
      const initialId = uuidv4();
      setLogItems([
        {
          id: initialId,
          projectId: initialProjId,
          itemId: isOther ? 'other' : '',
          itemType: isOther ? 'Other' : 'WorkItem',
          hours: 0,
          description: '',
        },
      ]);
      setWorkItemInputValues({ [initialId]: isOther ? 'Other' : '' });
    }
  }, [selectedEmployeeId, currentUser?.empId, selectedDate, worklogsByProject, storiesByProject, myProjects]);

  // Helper to get work item options for a specific project
  const getWorkItemOptionsForProject = useCallback(
    (projId: string) => {
      return getWorkItemOptionsHelper(projId, storiesByProject[projId] || []);
    },
    [storiesByProject]
  );

  const currentTotalHours = useMemo(() => {
    return logItems.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  }, [logItems]);

  // Add work item row with project selector
  const handleAddItem = () => {
    if (currentTotalHours >= 24) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Total effort for a single day cannot exceed 24 hours.',
      });
      return;
    }

    const defaultProjId =
      logItems.length > 0
        ? logItems[logItems.length - 1].projectId
        : (myProjects[0]?.id || 'other');
    const isOther = defaultProjId === 'other';
    const newId = uuidv4();
    setLogItems([
      ...logItems,
      {
        id: newId,
        projectId: defaultProjId,
        itemId: isOther ? 'other' : '',
        itemType: isOther ? 'Other' : 'WorkItem',
        hours: 0,
        description: '',
      },
    ]);
    setWorkItemInputValues((prev) => ({ ...prev, [newId]: isOther ? 'Other' : '' }));
  };

  const handleRemoveItem = (id: string) => {
    setLogItems((prev) => prev.filter((item) => item.id !== id));
    setWorkItemInputValues((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleProjectChange = (rowId: string, newProjId: string) => {
    const isOther = newProjId === 'other';
    setLogItems((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? {
              ...item,
              projectId: newProjId,
              itemId: isOther ? 'other' : '',
              itemType: isOther ? 'Other' : 'WorkItem',
            }
          : item
      )
    );
    setWorkItemInputValues((prev) => ({ ...prev, [rowId]: isOther ? 'Other' : '' }));
  };

  const handleWorkItemInputChange = (rowId: string, projId: string, inputValue: string) => {
    setWorkItemInputValues((prev) => ({ ...prev, [rowId]: inputValue }));
    const options = getWorkItemOptionsForProject(projId);
    const match = options.find((opt) => opt.label.toLowerCase() === inputValue.trim().toLowerCase());

    if (match) {
      let itemType: 'WorkItem' | 'Meeting' | 'Other' = 'WorkItem';
      if (match.value === 'meeting') itemType = 'Meeting';
      if (['other', 'holiday', 'weekend', 'training', 'admin', 'bench'].includes(match.value)) {
        itemType = 'Other';
      }
      setLogItems((prev) =>
        prev.map((item) =>
          item.id === rowId ? { ...item, itemId: match.value, itemType } : item
        )
      );
    } else {
      setLogItems((prev) =>
        prev.map((item) =>
          item.id === rowId
            ? {
                ...item,
                itemId: inputValue.trim() || (projId === 'other' ? 'other' : ''),
                itemType: projId === 'other' ? 'Other' : 'WorkItem',
              }
            : item
        )
      );
    }
  };

  const handleItemHoursChange = (rowId: string, value: string) => {
    let num = parseFloat(value);
    if (isNaN(num)) num = 0;
    const otherHours = logItems
      .filter((item) => item.id !== rowId)
      .reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
    const maxAllowed = Math.max(0, 24 - otherHours);

    let finalHours = num;
    if (num > maxAllowed) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: `Total cannot exceed 24 hours. Max allowed for this item is ${maxAllowed.toFixed(1)}h.`,
      });
      finalHours = maxAllowed;
    } else {
      finalHours = Math.max(0, Math.min(24, num));
    }

    setLogItems((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, hours: finalHours } : item))
    );
  };

  const handleDescriptionChange = (rowId: string, description: string) => {
    setLogItems((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, description } : item))
    );
  };

  // -------------------------------------------------------------------------
  // Save log across projects
  // -------------------------------------------------------------------------
  const handleSave = async (showToast = true) => {
    const effectiveEmpId = selectedEmployeeId || currentUser?.empId;
    if (!effectiveEmpId || !selectedDate || !db) return;

    if (
      !isAdmin &&
      currentUser?.empId &&
      effectiveEmpId.toLowerCase() !== currentUser.empId.toLowerCase()
    ) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Only Administrators can log work effort for other resources.',
      });
      return;
    }

    if (currentTotalHours > 24) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: `Total effort for a single day cannot exceed 24 hours (Current: ${currentTotalHours.toFixed(1)}h).`,
      });
      return;
    }

    setIsSaving(true);
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setOptimisticDailyHours((prev) => ({ ...prev, [dateKey]: currentTotalHours }));

    try {
      // Group items by project
      const itemsByProj: Record<string, RowWorkItem[]> = {};
      myProjects.forEach((p) => {
        itemsByProj[p.id] = [];
      });
      itemsByProj['other'] = [];

      // Include any project currently in worklogsByProject for this employee
      Object.keys(worklogsByProject).forEach((projKey) => {
        if (!itemsByProj[projKey]) {
          itemsByProj[projKey] = [];
        }
      });

      logItems.forEach((row) => {
        const pId = row.projectId || 'other';
        if (!itemsByProj[pId]) {
          itemsByProj[pId] = [];
        }
        itemsByProj[pId].push({ ...row, projectId: pId });
      });

      // Save each project's worklog document
      const savePromises = Object.entries(itemsByProj).map(async ([projId, rows]) => {
        const itemMap = new Map<string, WorklogItem>();
        rows.forEach((r) => {
          const key = r.itemId || r.id;
          const existing = itemMap.get(key);
          const numHours = Number(r.hours) || 0;
          if (existing) {
            existing.hours += numHours;
            if (r.description) {
              existing.description = (existing.description || '') + ' ' + r.description;
            }
          } else {
            itemMap.set(key, { ...r, hours: numHours });
          }
        });

        const finalItems = Array.from(itemMap.values()).filter(
          (it) => it.itemId || (Number(it.hours) || 0) > 0
        );
        const projTotalHours = finalItems.reduce(
          (sum, it) => sum + (Number(it.hours) || 0),
          0
        );

        const docId = `${effectiveEmpId}_${dateKey}`;
        const worklogDocRef = doc(db!, 'projects', projId, 'worklogs', docId);

        const hadExistingLog = (worklogsByProject[projId] || []).some(
          (log) =>
            (log.employeeId || '').toLowerCase() === effectiveEmpId.toLowerCase() &&
            normalizeDateKey(log.date) === dateKey
        );

        if (finalItems.length > 0 || projTotalHours > 0) {
          await setDoc(
            worklogDocRef,
            {
              employeeId: effectiveEmpId,
              date: dateKey,
              items: finalItems.map(({ id, ...rest }) => rest),
              totalHours: projTotalHours,
            },
            { merge: true }
          );
        } else if (hadExistingLog) {
          await setDoc(
            worklogDocRef,
            {
              employeeId: effectiveEmpId,
              date: dateKey,
              items: [],
              totalHours: 0,
            },
            { merge: true }
          );
        }
      });

      await Promise.all(savePromises);

      if (showToast) {
        toast({
          title: 'Worklog Saved',
          description: `Saved ${currentTotalHours.toFixed(1)}h for ${format(selectedDate, 'PPP')}.`,
        });
      }
    } catch (err) {
      console.error('Error saving worklog:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save worklog.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader
          title="Worklog"
          description="Log daily work across your assigned active projects."
        />

        {/* Top Control Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Employee &amp; Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Employee selection */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-medium">Employee</label>
                {!isAdmin && (
                  <span className="text-xs text-muted-foreground italic">
                    (Only Administrators can select other resources)
                  </span>
                )}
              </div>
              <Select
                disabled={!isAdmin}
                value={selectedEmployeeId || activeEmployee.id}
                onValueChange={(val) => {
                  setSelectedEmployeeId(val);
                  setOptimisticDailyHours({});
                }}
              >
                <SelectTrigger className="w-full md:w-1/3">
                  <SelectValue placeholder="Select an employee">
                    {activeEmployee.name} ({activeEmployee.empId})
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(isAdmin
                    ? displayEmployees
                    : displayEmployees.filter(
                        (e) => e.empId.toLowerCase() === (currentUser?.empId || '').toLowerCase()
                      )
                  ).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.empId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date selection & Weekly Calendar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Date</label>
                <div className="flex items-center gap-2 bg-muted/40 px-3 py-1 rounded-md border text-sm">
                  <span className="text-muted-foreground text-xs font-medium">Weekly Total:</span>
                  <span className="font-bold text-foreground">{weeklyTotalHours.toFixed(1)} hrs</span>
                </div>
              </div>
              <div className="flex items-center gap-4 my-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setDisplayDate(subWeeks(displayDate, 1));
                    setOptimisticDailyHours({});
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                  <Select
                    value={String(getMonth(displayDate))}
                    onValueChange={(m) => setDisplayDate(setMonth(displayDate, Number(m)))}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(getYear(displayDate))}
                    onValueChange={(y) => setDisplayDate(setYear(displayDate, Number(y)))}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setDisplayDate(addWeeks(displayDate, 1));
                    setOptimisticDailyHours({});
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day Tiles with holiday and weekly off color coding */}
              <div className="grid grid-cols-7 gap-2 rounded-md border p-2">
                {weekDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const hours = dailyHoursMap[dateKey] || 0;
                  const holiday = (holidays || []).find((h) => {
                    const hKey = normalizeDateKey(h.date);
                    return (hKey && hKey === dateKey) || (h.date && isSameDay(new Date(h.date), day));
                  });
                  const isWeeklyOff = (weeklyOffDays || [0, 6]).includes(day.getDay());
                  const isSelected = isSameDay(day, selectedDate);

                  const dayTitle = holiday
                    ? `${holiday.description || 'Public Holiday'}${isWeeklyOff ? ' (Holiday & Weekly Off)' : ' (Holiday)'}`
                    : isWeeklyOff
                    ? 'Weekly Off'
                    : undefined;

                  return (
                    <Button
                      key={day.toISOString()}
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => setSelectedDate(day)}
                      title={dayTitle}
                      className={cn(
                        'flex flex-col h-auto p-2 relative transition-all',
                        holiday &&
                          !isSelected &&
                          'border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500',
                        holiday &&
                          isSelected &&
                          'ring-2 ring-amber-400 border-amber-400 bg-amber-600 text-white hover:bg-amber-700 shadow-md',
                        !holiday &&
                          isWeeklyOff &&
                          !isSelected &&
                          'border-indigo-500/50 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/80',
                        !holiday &&
                          isWeeklyOff &&
                          isSelected &&
                          'ring-2 ring-indigo-400 border-indigo-400 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{format(day, 'EEE')}</span>
                        {holiday ? (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        ) : isWeeklyOff ? (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        ) : null}
                      </div>
                      <span className="text-lg font-bold">{format(day, 'd')}</span>
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          holiday
                            ? isSelected
                              ? 'text-amber-100'
                              : 'text-amber-400'
                            : isWeeklyOff
                            ? isSelected
                              ? 'text-indigo-100'
                              : 'text-indigo-400'
                            : 'text-muted-foreground'
                        )}
                      >
                        {hours.toFixed(1)}h
                      </span>
                      {holiday ? (
                        <span
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded mt-0.5 leading-none',
                            isSelected
                              ? 'bg-amber-950/70 text-amber-200'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          )}
                        >
                          Holiday
                        </span>
                      ) : isWeeklyOff ? (
                        <span
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded mt-0.5 leading-none',
                            isSelected
                              ? 'bg-indigo-950/70 text-indigo-200'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          )}
                        >
                          Weekly Off
                        </span>
                      ) : null}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Items Card for the selected date */}
        {selectedDate && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  Log for {activeEmployee.firstName || activeEmployee.name} on{' '}
                  {format(selectedDate, 'PPP')}
                </CardTitle>
                <CardDescription>
                  Add work items and select the associated project. Click Save Log to update the weekly calendar.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingProjects ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading projects and work items...
                </div>
              ) : (
                <div>
                  {logItems.map((item, index) => {
                    const rowOptions = getWorkItemOptionsForProject(item.projectId);
                    const datalistId = `datalist-${item.id}`;

                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[180px_1fr_110px_1fr_auto] gap-3 items-end mb-3"
                      >
                        {/* Project selector for this work item */}
                        <div className="space-y-1">
                          {index === 0 && <label className="text-sm font-medium">Project</label>}
                          <Select
                            value={item.projectId || 'other'}
                            onValueChange={(val) => handleProjectChange(item.id, val)}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="w-full text-xs">
                              <SelectValue placeholder="Select Project" />
                            </SelectTrigger>
                            <SelectContent>
                              {myProjects.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{p.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              {item.projectId &&
                                item.projectId !== 'other' &&
                                !myProjects.some((p) => p.id === item.projectId) && (
                                  <SelectItem value={item.projectId} className="text-xs">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" />
                                      <span className="truncate">{item.projectId}</span>
                                    </div>
                                  </SelectItem>
                                )}
                              <SelectItem value="other" className="text-xs">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <span className="truncate font-medium">Other</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Work item autocomplete */}
                        <div className="space-y-1">
                          {index === 0 && <label className="text-sm font-medium">Work Item</label>}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              list={datalistId}
                              placeholder="Search work item..."
                              className="pl-9 text-xs"
                              value={workItemInputValues[item.id] || ''}
                              onChange={(e) =>
                                handleWorkItemInputChange(item.id, item.projectId, e.target.value)
                              }
                              disabled={isSaving}
                            />
                            <datalist id={datalistId}>
                              {rowOptions.map((opt) => (
                                <option key={opt.value} value={opt.label} />
                              ))}
                            </datalist>
                          </div>
                        </div>

                        {/* Hours */}
                        <div className="space-y-1">
                          {index === 0 && <label className="text-sm font-medium">Hours</label>}
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={item.hours === 0 ? '' : item.hours}
                            onChange={(e) => handleItemHoursChange(item.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSave(true);
                              }
                            }}
                            min="0"
                            max="24"
                            step="any"
                            className="font-mono text-xs"
                            disabled={isSaving}
                          />
                        </div>

                        {/* Description (for other items or extra note) */}
                        <div className="space-y-1">
                          {index === 0 && <label className="text-sm font-medium">Description</label>}
                          <Input
                            placeholder={item.itemType === 'Other' ? 'Describe work...' : 'Optional notes...'}
                            value={item.description || ''}
                            onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                            className="text-xs"
                            disabled={isSaving}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSave(true)}
                            disabled={isSaving}
                            title="Save hours"
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isSaving}
                            title="Remove item"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add item and Save buttons */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between pt-4 border-t mt-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={handleAddItem}
                        disabled={isSaving || currentTotalHours >= 24}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                      </Button>
                      <Button
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Log
                      </Button>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Hours required for this week
                        </span>
                        <span className="text-base font-bold text-foreground">
                          {weeklyRequiredHours.toFixed(1)} hrs
                        </span>
                      </div>
                      <div className="border-l pl-4 border-border/60">
                        <span className="text-xs text-muted-foreground block">
                          Weekly Total Logged
                        </span>
                        <span className="text-base font-bold text-foreground">
                          {weeklyTotalHours.toFixed(1)} hrs
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentTotalHours > 24 && (
                    <p className="text-xs text-destructive font-medium mt-2 text-right">
                      Total effort for a single day cannot exceed 24 hours.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
