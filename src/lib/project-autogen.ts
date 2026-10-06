
/**
 * project-autogen.ts
 * Standalone utility to generate a complete set of Firestore subcollection data
 * for a dummy project so that every dashboard is populated without manual data entry.
 */

import type { Firestore } from '@/lib/db-provider';
import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  getDocs,
  query,
  where,
} from '@/lib/db-provider';
import type {
  User,
} from '@/types';
import {
  addDays,
  subDays,
  differenceInDays,
  format,
  eachDayOfInterval,
  eachMonthOfInterval,
  previousFriday,
  isSameDay,
  isWeekend,
  addWeeks,
  startOfWeek,
} from 'date-fns';

// ── helpers ──────────────────────────────────────────────────────────────────

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Commit batches safely, splitting at 490 ops per batch. */
class AutoBatch {
  private db: Firestore;
  private batches: ReturnType<typeof writeBatch>[] = [];
  private current: ReturnType<typeof writeBatch>;
  private count = 0;
  private readonly LIMIT = 490;

  constructor(db: Firestore) {
    this.db = db;
    this.current = writeBatch(db);
    this.batches.push(this.current);
  }

  private next() {
    if (this.count >= this.LIMIT) {
      this.current = writeBatch(this.db);
      this.batches.push(this.current);
      this.count = 0;
    }
  }

  set(ref: any, data: any) {
    this.next();
    this.current.set(ref, data);
    this.count++;
  }

  update(ref: any, data: any) {
    this.next();
    this.current.update(ref, data);
    this.count++;
  }

  async commit() {
    if (this.batches.length > 0) {
      await this.batches[0].commit();
    }
    if (this.batches.length > 1) {
      await Promise.all(this.batches.slice(1).map(b => b.commit()));
    }
  }
}

/** Strip undefined fields (Firestore requirement) and truncate strings to max lengths. */
const clean = (obj: any): any => {
  const out: any = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) {
      let val = obj[k];
      if (typeof val === 'string') {
        if ((k === 'title' || k === 'name') && val.length > 60) {
          val = val.slice(0, 60);
        } else if (k === 'description' && val.length > 300) {
          val = val.slice(0, 300);
        }
      }
      out[k] = val;
    }
  }
  return out;
};

// ── Main export ───────────────────────────────────────────────────────────────

export interface AutogenOptions {
  db: Firestore;
  projectId: string;
  startDate: Date;
  endDate: Date;
  globalUsers: User[];
  pricingModel?: string;
  autoRunSimulation?: boolean;
  simulationProgress?: number; // 25 | 50 | 75 | 100
}

export async function generateFullProjectData(opts: AutogenOptions): Promise<void> {
  const { db, projectId, startDate, endDate, globalUsers, pricingModel } = opts;

  const pRef = doc(db, 'projects', projectId);
  const col = (name: string) => collection(pRef, name);
  const batch = new AutoBatch(db);

  // ── 0. Pre-calculate Key Dates & Simulated Timeline ─────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSimulated = opts.autoRunSimulation !== false;
  const simProgress = opts.simulationProgress ?? 75;
  const sprintDuration = 14; // 2-week sprints

  let effStartDate = startDate;
  let sprint1Start: Date;
  let sprint1End: Date;
  let sprint2Start: Date;
  let sprint2End: Date;
  let sprint3Start: Date;
  let sprint3End: Date;

  if (!isSimulated) {
    sprint1Start = startOfWeek(startDate, { weekStartsOn: 1 });
    if (sprint1Start < startDate) sprint1Start = addDays(sprint1Start, 7);
    sprint1End = addDays(sprint1Start, 13);
    sprint2Start = addDays(sprint1End, 1);
    sprint2End = addDays(sprint2Start, 13);
    sprint3Start = addDays(sprint2End, 1);
    sprint3End = addDays(sprint3Start, 13);
  } else {
    // Calibrate historical timeline relative to today so burndown, burnup,
    // and Kanban boards reflect a live, realistic agile project.
    if (simProgress <= 25) {
      sprint1Start = startOfWeek(subDays(today, 6), { weekStartsOn: 1 });
    } else if (simProgress <= 50) {
      sprint1Start = startOfWeek(subDays(today, 18), { weekStartsOn: 1 });
    } else if (simProgress <= 75) {
      // Sprint 1 completed 2 weeks ago, Sprint 2 active on Day 10-12
      sprint1Start = startOfWeek(subDays(today, 26), { weekStartsOn: 1 });
    } else {
      sprint1Start = startOfWeek(subDays(today, 45), { weekStartsOn: 1 });
    }
    sprint1End = addDays(sprint1Start, 13);
    sprint2Start = addDays(sprint1End, 1);
    sprint2End = addDays(sprint2Start, 13);
    sprint3Start = addDays(sprint2End, 1);
    sprint3End = addDays(sprint3Start, 13);
    effStartDate = sprint1Start;
  }

  const effEndDate = isSimulated ? addDays(sprint3End, 30) : endDate;
  const releaseFriday = previousFriday(subDays(effEndDate, 7));
  const designEnd = sprint1End;
  const devEnd = sprint2End;
  const testingStart = addDays(sprint1Start, 4);

  // ── 1. Settings ─────────────────────────────────────────────────────────────
  const settingsRef = doc(pRef, 'settings', 'main');
  batch.set(settingsRef, {
    sprintDurationInWeeks: 2,
    sprintStartDay: 1,
    overrideGlobalHolidays: false,
    manMonthToDays: 22,
    manDayToHours: 8,
    storyPointToHours: 8,
  });

  // ── 2. Kanban Columns ────────────────────────────────────────────────────────
  const kanbanCols = ['To Do', 'In Progress', 'In QA', 'Done'];
  const kanbanColIds: Record<string, string> = {};
  kanbanCols.forEach((name, i) => {
    const docId = name.toLowerCase().replace(/\s+/g, '-');
    const ref = doc(col('kanbanColumns'), docId);
    kanbanColIds[name] = ref.id;
    batch.set(ref, {
      name,
      order: i,
      isDefault: true,
      isDoneColumn: name === 'Done',
    });
  });

  // ── 3. Impacted Systems (both initial and live) ──────────────────────────────
  const systemDefs = [
    { name: 'Front End', category: 'Technology', description: 'UI layer – web / mobile client' },
    { name: 'Middleware', category: 'Technology', description: 'API / Service layer' },
    { name: 'DB', category: 'Technology', description: 'Database and data storage layer' },
  ];

  const systemIdsInit: string[] = [];
  const systemIdsLive: string[] = [];

  systemDefs.forEach(s => {
    const estimateDays = randInt(30, 60);
    const data = {
      name: s.name,
      category: s.category,
      description: s.description,
      estimate: estimateDays,
      dailyBillingRate: randInt(8000, 15000),
    };
    const initRef = doc(col('initialImpactedSystems'));
    const liveRef = doc(col('impactedSystems'));
    batch.set(initRef, data);
    batch.set(liveRef, data);
    systemIdsInit.push(initRef.id);
    systemIdsLive.push(liveRef.id);
  });

  // ── 4. Horizontals (both initial and live) ───────────────────────────────────
  const horizontalDefs = [
    { name: 'Project Management', weightage: 10 },
    { name: 'Business Analysis', weightage: 10 },
    { name: 'Testing', weightage: 15 },
    { name: 'Architecture', weightage: 10 },
    { name: 'UI/UX', weightage: 5 },
  ];

  const horizontalIdsLive: string[] = [];

  horizontalDefs.forEach(h => {
    const data = { name: h.name, weightage: h.weightage, isEnabled: true, dailyBillingRate: randInt(6000, 12000) };
    const initRef = doc(col('initialHorizontals'));
    const liveRef = doc(col('horizontals'));
    batch.set(initRef, data);
    batch.set(liveRef, data);
    horizontalIdsLive.push(liveRef.id);
  });

  // ── 5. Update project with objective / summary ──────────────────────────────
  batch.update(pRef, {
    startDate: effStartDate.toISOString(),
    endDate: effEndDate.toISOString(),
    description: 'Autogenerated dummy project for cross-dashboard UI testing.',
    summary: 'This project covers the end-to-end delivery of a new product feature across Front End, Middleware, and DB layers, following agile delivery principles.',
    overallStatus: 'Green',
    scopeStatus: 'Green',
    costStatus: 'Amber',
    timeStatus: 'Green',
    statusComments: 'Project is on track. Minor cost variance being monitored.',
  });

  // ── 6. Environments ──────────────────────────────────────────────────────────
  const envDefs = [
    { name: 'SIT', order: 0 },
    { name: 'UAT', order: 1 },
    { name: 'Prod', order: 2 },
  ];
  const envData: { id: string; name: string; url: string; renewalDate: string }[] = [];
  envDefs.forEach(e => {
    const ref = doc(col('environments'));
    const expiryDate = addDays(endDate, randInt(30, 180));
    const envUrl = `https://${e.name.toLowerCase()}.autogen-${projectId.toLowerCase()}.io`;
    batch.set(ref, {
      name: e.name,
      order: e.order,
      url: envUrl,
      renewalDate: Timestamp.fromDate(expiryDate),
    });
    envData.push({ id: ref.id, name: e.name, url: envUrl, renewalDate: expiryDate.toISOString() });
  });

  // ── 7. Assign employees from global users ────────────────────────────────────
  // Requested: 1 PM, 1 lead (Architect), 2 developers, 1 QA (Tester) = 5 users
  const rolePool = [
    'PM',
    'Architect',
    'Developer',
    'Developer',
    'Tester',
  ];

  // Filter out Super Admin, Administrator, and PMO users so they are never assigned to projects
  let eligibleUsers = globalUsers.filter(u => u.accessLevel !== 'Super Admin' && u.accessLevel !== 'Administrator' && u.accessLevel !== 'PMO');
  if (eligibleUsers.length === 0) {
    eligibleUsers = globalUsers.filter(u => u.accessLevel !== 'Super Admin' && u.accessLevel !== 'Administrator');
  }

  // Shuffle eligible users to choose at random
  const shuffledUsers = [...eligibleUsers].sort(() => 0.5 - Math.random());
  const pickedUsers = shuffledUsers.slice(0, Math.min(shuffledUsers.length, rolePool.length));
  const employeeIds: string[] = [];

  // Find specific roles if available, fallback to first eligible user
  const pmUserIdx = pickedUsers.findIndex((_, idx) => rolePool[idx] === 'PM');
  const testerUserIdx = pickedUsers.findIndex((_, idx) => rolePool[idx] === 'Tester');
  const pmUserId = pickedUsers[pmUserIdx !== -1 ? pmUserIdx : 0]?.id || eligibleUsers[0]?.id || '';
  const testerUserId = pickedUsers[testerUserIdx !== -1 ? testerUserIdx : 0]?.id || eligibleUsers[0]?.id || '';

  const devUserIds: string[] = [];
  pickedUsers.forEach((user, idx) => {
    const assignedRole = rolePool[idx] || 'Developer';
    const projOnboarding = Timestamp.fromDate(startDate);
    const projOffloading = Timestamp.fromDate(endDate);
    const empRef = doc(pRef, 'employees', user.id);
    const isBcpSupport =
      assignedRole === 'PM' ||
      assignedRole === 'BA' ||
      assignedRole === 'Architect';

    // Developers get 1 or 2 random system IDs
    // Non-developers get all system IDs
    let capabilities: string[] = [];
    if (assignedRole === 'Developer') {
      const numCapabilities = Math.random() > 0.5 ? 2 : 1;
      const shuffled = [...systemIdsLive].sort(() => 0.5 - Math.random());
      capabilities = shuffled.slice(0, numCapabilities);
    } else {
      capabilities = [...systemIdsLive];
    }

    batch.set(empRef, clean({
      ...user,
      role: assignedRole as any,
      onboardingDate: projOnboarding,
      offloadingDate: projOffloading,
      billedRate: randInt(6000, 15000),
      costRate: randInt(4000, 10000),
      availability: 100,
      isBcpSupport,
      capabilities,
      leavePeriods: [],
    }));
    employeeIds.push(user.id);
    if (assignedRole === 'Developer') devUserIds.push(user.id);
  });

  // Ensure devUserIds is not empty if we have picked users
  if (devUserIds.length === 0 && employeeIds.length > 0) {
    devUserIds.push(employeeIds[0]);
  }

  // Add leave periods (one per employee) – stored on employee doc
  employeeIds.forEach(empId => {
    const leaveStart = addDays(startDate, randInt(5, 40));
    const leaveEnd = addDays(leaveStart, randInt(1, 3));
    const leaveId = `${empId}-leave-1`;
    // Patch employee doc with leavePeriods array
    const empRef = doc(pRef, 'employees', empId);
    batch.update(empRef, {
      leavePeriods: [
        {
          id: leaveId,
          startDate: Timestamp.fromDate(leaveStart),
          endDate: Timestamp.fromDate(leaveEnd),
          type: Math.random() > 0.3 ? 'Paid Leave' : 'Loss of Pay',
        },
      ],
    });
  });

  // ── 8. Sprints (Sprint 1 Completed, Sprint 2 Current/Active, Sprint 3 Planned) ─────────────
  const sprintDefs = [
    { title: 'Sprint 1', start: sprint1Start, end: sprint1End },
    { title: 'Sprint 2', start: sprint2Start, end: sprint2End },
    { title: 'Sprint 3', start: sprint3Start, end: sprint3End },
  ];

  const sprintRefs: { id: string; title: string; start: Date; end: Date; status: string; isCurrent: boolean }[] = [];

  sprintDefs.forEach(s => {
    const sRef = doc(col('sprints'));
    let status = 'Planned';
    let isCurrent = false;

    if (simProgress >= 100) {
      status = 'Completed';
      isCurrent = false;
    } else if (s.end < today) {
      status = 'Completed';
      isCurrent = false;
    } else if (s.start <= today && s.end >= today) {
      status = 'Current';
      isCurrent = true;
    } else {
      status = 'Planned';
      isCurrent = false;
    }

    batch.set(sRef, {
      title: s.title,
      isCurrent,
      status,
      startDate: Timestamp.fromDate(s.start),
      endDate: Timestamp.fromDate(s.end),
    });

    sprintRefs.push({
      id: sRef.id,
      title: s.title,
      start: s.start,
      end: s.end,
      status,
      isCurrent,
    });
  });

  const sprint1Ref = sprintRefs[0];
  const sprint2Ref = sprintRefs[1];
  const sprint3Ref = sprintRefs[2];
  const sprintIds = [sprint1Ref.id, sprint2Ref.id, sprint3Ref.id];

  // ── 9. Epics (1-2) ───────────────────────────────────────────────────────────
  const epicDefs = [
    { title: 'Core Platform Features', description: 'Foundational capabilities for the platform.' },
    { title: 'User Experience Enhancements', description: 'Improvements to user interfaces and flows.' },
  ];
  const epicIds: string[] = [];
  epicDefs.forEach(e => {
    const ref = doc(col('epics'));
    batch.set(ref, e);
    epicIds.push(ref.id);
  });

  // ── 10. Stories, Sub-Tasks, Test Cases ─────────────────────────────────────
  const storyTitles = [
    'User Authentication & Login',
    'Dashboard Overview Widget',
    'Profile Management',
    'Data Export to CSV/Excel',
    'Notification System',
    'Search & Filter Functionality',
    'Role-Based Access Control',
    'Audit Logging',
    'Report Generation',
    'Settings & Configuration Page',
  ];
  const fcTitles = ['Change payment flow', 'Update email template design'];
  const taskTitles = ['Upgrade Node.js runtime', 'Configure CI/CD pipeline'];

  let storyCounter = 1;
  const now = new Date().toISOString();

  // Helper: build a realistic statusHistory that transitions through statuses
  // with dates spread across working days. Ensures completed items finish on or before effectiveCutoff.
  const buildStatusHistory = (
    finalStatus: string,
    sprintStartDate: Date,
    sprintEndDate: Date,
    staggerIndex: number = 0,
    totalStagger: number = 10
  ) => {
    const history: { fromStatus: string | null; toStatus: string; date: string }[] = [];
    const effectiveCutoff = sprintEndDate < today ? sprintEndDate : today;
    const availableDays = Math.max(1, differenceInDays(effectiveCutoff, sprintStartDate));
    const staggerRatio = totalStagger > 1 ? (staggerIndex % totalStagger) / totalStagger : 0.5;

    // Everyone starts at 'To Do' on sprint start
    history.push({ fromStatus: null, toStatus: 'To Do', date: sprintStartDate.toISOString() });

    if (finalStatus === 'To Do') return history;

    // Move to 'In Progress' roughly 10-30% through available period
    const inProgOffset = Math.max(1, Math.min(availableDays - 1, Math.floor(1 + staggerRatio * 2)));
    const inProgDate = addDays(sprintStartDate, inProgOffset);
    history.push({ fromStatus: 'To Do', toStatus: 'In Progress', date: inProgDate.toISOString() });

    if (finalStatus === 'In Progress') return history;

    // Move to 'In QA'
    const qaOffset = Math.max(inProgOffset + 1, Math.min(availableDays - 1, Math.floor(inProgOffset + 2 + staggerRatio * 2)));
    const qaDate = addDays(sprintStartDate, qaOffset);
    history.push({ fromStatus: 'In Progress', toStatus: 'In QA', date: qaDate.toISOString() });

    if (finalStatus === 'In QA') return history;

    // Move to 'Done' smoothly distributed up to effectiveCutoff
    const doneOffset = Math.max(qaOffset + 1, Math.min(availableDays, Math.floor(qaOffset + 1 + staggerRatio * 4)));
    const doneDate = addDays(sprintStartDate, doneOffset);
    history.push({ fromStatus: 'In QA', toStatus: 'Done', date: doneDate.toISOString() });

    return history;
  };

  const storyRefObjs: { id: string; storyId: string; sprintId: string }[] = [];
  const releaseRef = doc(col('releases'));

  // 10a. Stories & Subtasks
  storyTitles.forEach((title, i) => {
    const stRef = doc(col('stories'));
    const storyId = `ST-${storyCounter++}`;
    const epicId = epicIds[i % epicIds.length];
    const assigneeId = devUserIds[i % Math.max(devUserIds.length, 1)];
    const impactedSystemIds = systemIdsLive;

    // Sprint & Status Distribution:
    // Stories 0-3: Sprint 1 (Completed) -> 100% Done
    // Stories 4-7: Sprint 2 (Current) -> Realistic WIP mix
    // Stories 8-9: Sprint 3 (Planned) -> To Do
    let assignedSprint = sprint1Ref;
    let finalStatus = 'Done';

    if (i < 4) {
      assignedSprint = sprint1Ref;
      finalStatus = 'Done';
    } else if (i < 8) {
      assignedSprint = sprint2Ref;
      if (i === 4) finalStatus = 'Done';
      else if (i === 5) finalStatus = 'In QA';
      else if (i === 6) finalStatus = 'In Progress';
      else finalStatus = 'In Progress';
    } else {
      assignedSprint = sprint3Ref;
      finalStatus = 'To Do';
    }

    const storyHistory = buildStatusHistory(finalStatus, assignedSprint.start, assignedSprint.end, i, storyTitles.length);
    const inProgEntry = storyHistory.find(h => h.toStatus === 'In Progress');
    const doneEntry = storyHistory.find(h => h.toStatus === 'Done');

    batch.set(stRef, clean({
      storyId,
      title,
      description: `User story: As a user I want to ${title.toLowerCase()} so that productivity improves.`,
      itemType: 'Story',
      status: finalStatus,
      statusHistory: storyHistory,
      developmentStartDate: inProgEntry?.date,
      completionDate: doneEntry?.date,
      epicId,
      sprintId: assignedSprint.id,
      releaseId: releaseRef.id,
      estimatedHours: randInt(8, 40),
      impactedSystemIds,
      assigneeId,
      priority: rand(['High', 'Medium', 'Low', 'Critical']),
      isDeleted: false,
      deletedAt: null,
      createdAt: assignedSprint.start.toISOString(),
    }));
    storyRefObjs.push({ id: stRef.id, storyId, sprintId: assignedSprint.id });

    // Sub-tasks: 3 subtasks per story (one per impacted system)
    systemIdsLive.forEach((sysId, sIdx) => {
      const subRef = doc(col('stories'));
      const subId = `SUB-${storyCounter++}`;
      const subStagger = i * 3 + sIdx;

      let subFinalStatus = 'To Do';
      if (assignedSprint.status === 'Completed' || finalStatus === 'Done') {
        // Sprint 1 or completed parent -> sub-tasks must also be Done
        subFinalStatus = 'Done';
      } else if (assignedSprint.status === 'Current') {
        // Sprint 2 WIP subtasks
        if (i === 4) subFinalStatus = 'Done';
        else if (i === 5) subFinalStatus = sIdx < 2 ? 'Done' : 'In QA';
        else if (i === 6) subFinalStatus = sIdx === 0 ? 'Done' : (sIdx === 1 ? 'In QA' : 'In Progress');
        else subFinalStatus = sIdx === 0 ? 'In Progress' : (sIdx === 1 ? 'In Progress' : 'To Do');
      } else {
        subFinalStatus = 'To Do';
      }

      const subHistory = buildStatusHistory(subFinalStatus, assignedSprint.start, assignedSprint.end, subStagger, 24);
      const subInProg = subHistory.find(h => h.toStatus === 'In Progress');
      const subDone = subHistory.find(h => h.toStatus === 'Done');

      batch.set(subRef, clean({
        storyId: subId,
        title: `${systemDefs[sIdx].name} – ${title} implementation`,
        description: `Sub-task for ${systemDefs[sIdx].name} work on: ${title}`,
        itemType: 'Sub Task',
        status: subFinalStatus,
        statusHistory: subHistory,
        developmentStartDate: subInProg?.date,
        completionDate: subDone?.date,
        parentStoryId: stRef.id,
        epicId,
        sprintId: assignedSprint.id,
        releaseId: releaseRef.id,
        estimatedHours: randInt(4, 16),
        impactedSystemId: sysId,
        assigneeId: devUserIds[sIdx % Math.max(devUserIds.length, 1)],
        isDeleted: false,
        deletedAt: null,
        createdAt: assignedSprint.start.toISOString(),
      }));
    });
  });

  // 10b. Feature Changes (1 in Sprint 1 Done, 1 in Sprint 2 In Progress)
  fcTitles.forEach((title, fcIdx) => {
    const fcRef = doc(col('stories'));
    const fcId = `FC-${storyCounter++}`;
    const assignedSprint = fcIdx === 0 ? sprint1Ref : sprint2Ref;
    const fcStatus = fcIdx === 0 ? 'Done' : 'In Progress';
    const fcHistory = buildStatusHistory(fcStatus, assignedSprint.start, assignedSprint.end, fcIdx * 5, 10);
    const fcInProg = fcHistory.find(h => h.toStatus === 'In Progress');
    const fcDone = fcHistory.find(h => h.toStatus === 'Done');

    batch.set(fcRef, clean({
      storyId: fcId,
      title,
      description: `Feature change request: ${title}`,
      itemType: 'Feature Change',
      status: fcStatus,
      statusHistory: fcHistory,
      developmentStartDate: fcInProg?.date,
      completionDate: fcDone?.date,
      epicId: epicIds[0],
      sprintId: assignedSprint.id,
      releaseId: releaseRef.id,
      estimatedHours: randInt(8, 20),
      impactedSystemIds: systemIdsLive,
      assigneeId: devUserIds[0],
      priority: 'Medium',
      isDeleted: false,
      deletedAt: null,
      createdAt: assignedSprint.start.toISOString(),
    }));
    storyRefObjs.push({ id: fcRef.id, storyId: fcId, sprintId: assignedSprint.id });
  });

  // 10c. Tasks (1 in Sprint 2 In QA, 1 in Sprint 3 To Do)
  taskTitles.forEach((title, tIdx) => {
    const taskRef = doc(col('stories'));
    const taskId = `TASK-${storyCounter++}`;
    const assignedSprint = tIdx === 0 ? sprint2Ref : sprint3Ref;
    const taskStatus = tIdx === 0 ? 'In QA' : 'To Do';
    const taskHistory = buildStatusHistory(taskStatus, assignedSprint.start, assignedSprint.end, tIdx * 4, 10);
    const taskInProg = taskHistory.find(h => h.toStatus === 'In Progress');
    const taskDone = taskHistory.find(h => h.toStatus === 'Done');

    batch.set(taskRef, clean({
      storyId: taskId,
      title,
      description: `Technical task: ${title}`,
      itemType: 'Task',
      status: taskStatus,
      statusHistory: taskHistory,
      developmentStartDate: taskInProg?.date,
      completionDate: taskDone?.date,
      epicId: epicIds[1],
      sprintId: assignedSprint.id,
      releaseId: releaseRef.id,
      estimatedHours: randInt(6, 16),
      impactedSystemIds: systemIdsLive,
      assigneeId: devUserIds[1] ?? devUserIds[0],
      priority: 'Low',
      isDeleted: false,
      deletedAt: null,
      createdAt: assignedSprint.start.toISOString(),
    }));
  });

  // ── 11. Test Plans & Test Cases ─────────────────────────────────────────
  const sitStart = addDays(sprint1Start, 4);
  const sitEnd = sprint1End;
  const uatStart = sprint2Start;
  const uatEnd = addDays(today, 6);
  const prodStart = addDays(sprint2End, 4);
  const prodEnd = addDays(sprint2End, 10);

  const tpRefs: { id: string; name: string; start: Date; end: Date; ref: ReturnType<typeof doc> }[] = [];

  // SIT Cycle (Completed during Sprint 1)
  const sitTpRef = doc(col('testCycles'));
  batch.set(sitTpRef, {
    testCycleId: 'TC-SIT',
    testPlanId: 'TC-SIT',
    name: 'SIT Execution Cycle',
    planType: 'Release',
    environmentId: envData.find(e => e.name === 'SIT')?.id,
    startDate: Timestamp.fromDate(sitStart),
    endDate: Timestamp.fromDate(sitEnd),
  });
  tpRefs.push({ id: sitTpRef.id, name: 'SIT', start: sitStart, end: sitEnd, ref: sitTpRef });

  // UAT Cycle (Active during Sprint 2)
  const uatTpRef = doc(col('testCycles'));
  batch.set(uatTpRef, {
    testCycleId: 'TC-UAT',
    testPlanId: 'TC-UAT',
    name: 'UAT Sign-off Cycle',
    planType: 'Release',
    environmentId: envData.find(e => e.name === 'UAT')?.id,
    startDate: Timestamp.fromDate(uatStart),
    endDate: Timestamp.fromDate(uatEnd),
  });
  tpRefs.push({ id: uatTpRef.id, name: 'UAT', start: uatStart, end: uatEnd, ref: uatTpRef });

  // Prod Cycle (Planned for post-Sprint 2)
  const prodTpRef = doc(col('testCycles'));
  batch.set(prodTpRef, {
    testCycleId: 'TC-PROD',
    testPlanId: 'TC-PROD',
    name: 'Production Sanity Cycle',
    planType: 'Release',
    environmentId: envData.find(e => e.name === 'Prod')?.id,
    startDate: Timestamp.fromDate(prodStart),
    endDate: Timestamp.fromDate(prodEnd),
  });
  tpRefs.push({ id: prodTpRef.id, name: 'Prod', start: prodStart, end: prodEnd, ref: prodTpRef });

  let tcCounter = 1;

  storyRefObjs.forEach(st => {
    const tcRef = doc(col('testCases'));
    const tcId = `TC-${tcCounter++}`;
    const tcTitle = `Test: ${st.storyId} – validate expected behaviour`;
    const tcType = rand(['Functional', 'Non-functional']);
    const tcDesc = `Verify that ${st.storyId} meets all acceptance criteria.`;
    const tcExpectedResult = 'The feature behaves as per requirements without errors.';

    // Create the backlog test case
    batch.set(tcRef, clean({
      testCaseId: tcId,
      title: tcTitle,
      type: tcType,
      description: tcDesc,
      expectedResult: tcExpectedResult,
      storyId: st.id,
      sprintId: st.sprintId,
      isDeleted: false,
      deletedAt: null,
    }));

    // Create copies in test cycles with status aligned to timeline
    tpRefs.forEach(tp => {
      const planTcRef = doc(collection(db, 'projects', projectId, 'testCycles', tp.id, 'testCases'));
      let generatedStatus = 'Not Run';
      let execDateStr: string | undefined = undefined;

      if (tp.name === 'SIT') {
        // SIT ran in past during Sprint 1 -> high pass rate
        generatedStatus = rand(['Passed', 'Passed', 'Passed', 'Failed']);
        const planDays = Math.max(1, differenceInDays(tp.end, tp.start));
        execDateStr = addDays(tp.start, randInt(1, planDays)).toISOString();
      } else if (tp.name === 'UAT') {
        // UAT is currently active -> realistic execution progress
        generatedStatus = rand(['Passed', 'Passed', 'Failed', 'Not Run', 'Not Run']);
        if (generatedStatus !== 'Not Run') {
          const availDays = Math.max(1, differenceInDays(today, tp.start));
          execDateStr = addDays(tp.start, randInt(0, availDays)).toISOString();
        }
      } else {
        // Prod Sanity is in the future
        generatedStatus = 'Not Run';
      }

      batch.set(planTcRef, clean({
        originalTestCaseId: tcRef.id,
        testCaseId: tcId,
        title: tcTitle,
        type: tcType,
        description: tcDesc,
        expectedResult: tcExpectedResult,
        storyId: st.id,
        sprintId: st.sprintId,
        status: generatedStatus,
        assigneeId: testerUserId,
        statusHistory: generatedStatus !== 'Not Run' && execDateStr
          ? [{ fromStatus: 'Not Run', toStatus: generatedStatus, date: execDateStr }]
          : [{ fromStatus: null, toStatus: 'Not Run', date: tp.start.toISOString() }],
        executionDate: execDateStr,
        closeDate: generatedStatus === 'Passed' ? execDateStr : undefined,
      }));
    });
  });

  // ── 12. Bugs (30-40 distributed realistically across SIT, UAT, and Prod) ──
  const totalBugs = 36;
  const sitBugsCount = 18;
  const uatBugsCount = 12;
  const prodBugsCount = 6;

  const sitTemplates = [
    'SIT: Batch import API validation error',
    'SIT: Deadlock when saving story status',
    'SIT: Auth token expires prematurely on refresh',
    'SIT: Memory leak in real-time chart re-rendering',
    'SIT: Layout shift when resizing employee sidebar',
    'SIT: File upload fails for attachments > 2MB',
    'SIT: Incorrect JSON webhook payload signature',
    'SIT: System error on generating utilization reports',
    'SIT: WebSocket disconnects after 5 minutes',
    'SIT: Thread exhaustion on parallel background tasks'
  ];

  const uatTemplates = [
    'UAT: Holiday generator confirmation modal issue',
    'UAT: Utilization heatmaps difficult in light mode',
    'UAT: Payment milestone layout mismatch',
    'UAT: Missing confirmation on archiving project',
    'UAT: Text overlap in resource Gantt headers',
    'UAT: Dashboard counts archived items incorrectly',
    'UAT: Profile editing avatar selection unsaved',
    'UAT: Move to Backlog button wording issue',
    'UAT: Datepicker allows past dates on sprint create',
    'UAT: Export to CSV button hidden on small screens'
  ];

  const prodTemplates = [
    'Production: Concurrent worklog corrupts total hours',
    'Production: Auth rate limit exceeded on high load',
    'Production: Webhook signature verification error',
    'Production: CDN assets slow to load in APAC region',
    'Production: Safari browser crash on grid layout',
    'Production: Billing rounding issue on fixed-bid',
    'Production: Unhandled promise rejection on logout'
  ];

  let bugCounter = storyCounter;

  const createAutogenBug = (title: string, foundInPlanId: string) => {
    const bugRef = doc(col('stories'));
    const severity = rand(['Critical', 'High', 'Medium', 'Low']);

    let bugStatus = 'Open';
    let bugSprint = sprint2Ref;

    if (foundInPlanId === sitTpRef.id) {
      bugSprint = sprint1Ref;
      // SIT was in the past: 70% resolved/closed
      bugStatus = rand(['Resolved', 'Closed', 'Resolved', 'In Progress', 'Open']);
    } else if (foundInPlanId === uatTpRef.id) {
      bugSprint = sprint2Ref;
      // UAT is active: 40% open, 30% in progress, 30% resolved
      bugStatus = rand(['Open', 'Open', 'In Progress', 'Resolved']);
    } else {
      bugSprint = sprint3Ref;
      bugStatus = 'To Triage';
    }

    const bugHistory = buildStatusHistory(bugStatus, bugSprint.start, bugSprint.end, bugCounter, 20);
    const bugDone = bugHistory.find(h => h.toStatus === 'Done' || h.toStatus === 'Resolved' || h.toStatus === 'Closed');

    batch.set(bugRef, clean({
      storyId: `BUG-${bugCounter++}`,
      title,
      description: `Steps to reproduce: Nav to the affected module, perform standard actions, observe the ${severity.toLowerCase()} issue.`,
      itemType: 'Bug',
      status: bugStatus,
      statusHistory: bugHistory,
      closeDate: (bugStatus === 'Resolved' || bugStatus === 'Closed') ? (bugDone?.date || now) : undefined,
      sprintId: bugSprint.id,
      releaseId: releaseRef.id,
      severity,
      priority: severity,
      assigneeId: rand(devUserIds) || null,
      foundInTestPlanId: foundInPlanId,
      foundInTestCycleId: foundInPlanId,
      isDeleted: false,
      deletedAt: null,
      createdAt: bugSprint.start.toISOString(),
    }));
  };

  // Create SIT Bugs
  for (let i = 0; i < sitBugsCount; i++) {
    const title = sitTemplates[i % sitTemplates.length] + ` (#${i + 1})`;
    createAutogenBug(title, sitTpRef.id);
  }

  // Create UAT Bugs
  for (let i = 0; i < uatBugsCount; i++) {
    const title = uatTemplates[i % uatTemplates.length] + ` (#${i + 1})`;
    createAutogenBug(title, uatTpRef.id);
  }

  // Create Production Bugs
  for (let i = 0; i < prodBugsCount; i++) {
    const title = prodTemplates[i % prodTemplates.length] + ` (#${i + 1})`;
    createAutogenBug(title, prodTpRef.id);
  }

  // ── 13. Release + Stages + Milestones ────────────────────────────────────────
  // releaseRef was created earlier (before stories) so stories can reference it.

  // Stage boundaries (using pre-calculated dates)

  batch.set(releaseRef, clean({
    releaseId: 'REL-1',
    name: 'v1.0 Final Release',
    description: 'Initial production release covering all core features.',
    itemType: 'Release',
    startDate: Timestamp.fromDate(effStartDate),
    endDate: Timestamp.fromDate(releaseFriday),
    isCompleted: simProgress >= 100,
  }));

  const stageDefs = [
    { name: 'Design', start: effStartDate, end: designEnd },
    { name: 'Development', start: designEnd, end: devEnd },
    { name: 'Testing', start: devEnd, end: releaseFriday },
  ];
  const stageRefs: { id: string; name: string; start: Date; end: Date }[] = [];
  stageDefs.forEach((s, i) => {
    const sRef = doc(col('releases'));
    batch.set(sRef, clean({
      releaseId: `S-${i + 1}`,
      name: s.name,
      description: `${s.name} phase of the project`,
      itemType: 'Stage',
      parentReleaseId: releaseRef.id,
      startDate: Timestamp.fromDate(s.start),
      endDate: Timestamp.fromDate(s.end),
      isCompleted: false,
    }));
    stageRefs.push({ id: sRef.id, ...s });
  });

  // Milestones
  const milestoneDefs = [
    { name: 'Design Freeze', date: designEnd },
    { name: 'Code Freeze', date: devEnd },
  ];
  milestoneDefs.forEach((m, i) => {
    const mRef = doc(col('releases'));
    batch.set(mRef, clean({
      releaseId: `M-${i + 1}`,
      name: m.name,
      description: `${m.name} – no further changes accepted after this date.`,
      itemType: 'Milestone',
      parentReleaseId: releaseRef.id,
      milestoneDate: Timestamp.fromDate(m.date),
      isCompleted: false,
    }));
  });

  // ── 14. RAID ─────────────────────────────────────────────────────────────────

  // Risks (3)
  const riskSamples = [
    { desc: 'Unexpected third-party API breaking changes', mitigation: 'Maintain API versioning and integration tests.', contingency: 'Switch to fallback service temporarily.' },
    { desc: 'Key team member unavailability due to attrition', mitigation: 'Knowledge sharing and cross-training across team.', contingency: 'Re-assign critical items to next-available senior.' },
    { desc: 'Infrastructure scaling issues under peak load', mitigation: 'Conduct load testing before each release.', contingency: 'Scale cloud resources vertically on demand.' },
  ];
  riskSamples.forEach((r, i) => {
    const rRef = doc(col('risks'));
    batch.set(rRef, clean({
      riskId: `R-${i + 1}`,
      description: r.desc,
      severity: (randInt(1, 3)) as any,
      probability: (randInt(1, 3)) as any,
      mitigationPlan: r.mitigation,
      residualRisk: 'Requires periodic monitoring.',
      contingencyPlan: r.contingency,
      isDeleted: false,
      deletedAt: null,
    }));
  });

  // Assumptions (2)
  const assumptionSamples = [
    { desc: 'All third-party integrations will be available for the duration of the project.', category: 'External' },
    { desc: 'Business stakeholders will be available for weekly review and sign-off sessions.', category: 'Business' },
  ];
  assumptionSamples.forEach((a, i) => {
    const aRef = doc(col('assumptions'));
    batch.set(aRef, clean({
      assumptionId: `A-${i + 1}`,
      description: a.desc,
      category: a.category as any,
      status: 'Active' as any,
      ownerId: pmUserId,
      isDeleted: false,
      deletedAt: null,
    }));
  });

  // Issues (3)
  const issueSamples = [
    { desc: 'Dev environment credentials have not been shared by the client.', priority: 'High' },
    { desc: 'Staging server is periodically unreachable causing test failures.', priority: 'Medium' },
    { desc: 'Requirements document version mismatch between teams.', priority: 'Low' },
  ];
  issueSamples.forEach((iss, i) => {
    const iRef = doc(col('issues'));
    batch.set(iRef, clean({
      issueId: `I-${i + 1}`,
      description: iss.desc,
      priority: iss.priority as any,
      status: rand(['Open', 'In Progress']) as any,
      reportedDate: Timestamp.fromDate(addDays(startDate, randInt(1, 20))),
      assigneeId: pmUserId,
      isDeleted: false,
      deletedAt: null,
    }));
  });

  // Dependencies (2)
  const depSamples = [
    { desc: 'Approval of API contract from external payments vendor.', on: 'External Payments Gateway' },
    { desc: 'Completion of shared authentication microservice by Platform team.', on: 'Platform Team' },
  ];
  depSamples.forEach((d, i) => {
    const dRef = doc(col('dependencies'));
    const expectedDate = addDays(startDate, randInt(15, 45));
    batch.set(dRef, clean({
      dependencyId: `D-${i + 1}`,
      description: d.desc,
      dependencyOn: d.on,
      type: rand(['External', 'Internal']) as any,
      status: rand(['On Track', 'At Risk']) as any,
      expectedByDate: Timestamp.fromDate(expectedDate),
      ownerId: pmUserId,
      isDeleted: false,
      deletedAt: null,
    }));
  });

  // ── 15. Fixed Costs ──────────────────────────────────────────────────────────
  const fixedCostDefs = [
    { name: 'Hosting', cost: 500, type: 'Monthly' as const },
    { name: 'GIT', cost: 100, type: 'Monthly' as const },
    { name: 'Set-up Cost', cost: 1500, type: 'One time' as const },
  ];
  fixedCostDefs.forEach(fc => {
    const fcRef = doc(col('fixedCosts'));
    batch.set(fcRef, fc);
  });

  // ── 16. Payment Milestones ───────────────────────────────────────────────────
  if (pricingModel === 'T&M') {
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    months.forEach((month, i) => {
      const pmRef = doc(col('paymentMilestones'));
      const monthName = format(month, 'MMMM yyyy');
      const amount = randInt(25000, 75000);
      batch.set(pmRef, clean({
        milestoneId: `PM-${i + 1}`,
        name: monthName,
        billingPercentage: 0,
        amount,
        status: 'TBD' as any,
      }));
    });
  } else {
    const pmDefs = [
      { name: 'Project Kick-off', date: startDate, pct: 20 },
      { name: 'Development Complete', date: devEnd, pct: 30 },
      { name: 'Testing Complete', date: releaseFriday, pct: 30 },
      { name: 'Production Go-Live', date: addDays(releaseFriday, 7), pct: 20 },
    ];
    pmDefs.forEach((pm, i) => {
      const pmRef = doc(col('paymentMilestones'));
      const amount = randInt(50000, 200000);
      batch.set(pmRef, clean({
        milestoneId: `PM-${i + 1}`,
        name: pm.name,
        billingPercentage: pm.pct,
        amount,
        status: 'TBD' as any,
      }));
    });
  }

  // ── 17. Code Repository ──────────────────────────────────────────────────────
  const repoRef = doc(col('codeRepositories'));
  batch.set(repoRef, clean({
    name: `${projectId}-source`,
    url: `https://github.com/autogen-org/${projectId.toLowerCase()}-source`,
    expiryDate: Timestamp.fromDate(addWeeks(endDate, 26)),
  }));

  // ── 18. BCP – update environments with url (already set) ────────────────────
  // Mark BCP support resources
  employeeIds.forEach((empId, idx) => {
    const isBcp = idx < 2; // first 2 = PM, Architect
    const empRef = doc(pRef, 'employees', empId);
    batch.update(empRef, { isBcpSupport: isBcp });
  });

  // ── 19. Worklogs (logged on workdays up to today) ───────────────────────────
  const worklogStart = effStartDate;
  const worklogEnd = today >= effStartDate ? today : effStartDate;
  const workdays = eachDayOfInterval({ start: worklogStart, end: worklogEnd }).filter(
    d => !isWeekend(d)
  );

  employeeIds.forEach(empId => {
    workdays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const wlRef = doc(pRef, 'worklogs', `${empId}-${dateStr}`);
      batch.set(wlRef, clean({
        employeeId: empId,
        date: Timestamp.fromDate(day),
        items: [
          {
            itemId: storyRefObjs[Math.floor(Math.random() * storyRefObjs.length)]?.id || 'other',
            itemType: 'WorkItem',
            hours: 8,
          },
        ],
        totalHours: 8,
      }));
    });
  });

  // ── Commit all batches ────────────────────────────────────────────────────────
  await batch.commit();
}
