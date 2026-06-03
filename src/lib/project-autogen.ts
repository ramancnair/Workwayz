
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
    for (const b of this.batches) {
      await b.commit();
    }
  }
}

/** Strip undefined fields (Firestore requirement). */
const clean = (obj: any): any => {
  const out: any = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
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
}

export async function generateFullProjectData(opts: AutogenOptions): Promise<void> {
  const { db, projectId, startDate, endDate, globalUsers, pricingModel } = opts;

  const pRef = doc(db, 'projects', projectId);
  const col = (name: string) => collection(pRef, name);
  const batch = new AutoBatch(db);

  // ── 0. Pre-calculate Key Dates ──────────────────────────────────────────────
  // Release: startDate → Friday 1 week before endDate
  const releaseFriday = previousFriday(subDays(endDate, 7));
  const totalDuration = releaseFriday.getTime() - startDate.getTime();
  const designEnd = addDays(startDate, Math.floor((totalDuration / 3) / 86400000));
  const devEnd = addDays(designEnd, Math.floor((totalDuration / 3) / 86400000));
  const testingStart = devEnd;

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

  // Filter out Administrator and PMO users so they are never assigned to projects
  const eligibleUsers = globalUsers.filter(u => u.accessLevel !== 'Administrator' && u.accessLevel !== 'PMO');

  // Shuffle eligible users to choose at random
  const shuffledUsers = [...eligibleUsers].sort(() => 0.5 - Math.random());
  const pickedUsers = shuffledUsers.slice(0, Math.min(shuffledUsers.length, rolePool.length));
  const employeeIds: string[] = [];

  // Find specific roles if available, fallback to first user
  const pmUserIdx = pickedUsers.findIndex((_, idx) => rolePool[idx] === 'PM');
  const testerUserIdx = pickedUsers.findIndex((_, idx) => rolePool[idx] === 'Tester');
  const pmUserId = pickedUsers[pmUserIdx !== -1 ? pmUserIdx : 0]?.id;
  const testerUserId = pickedUsers[testerUserIdx !== -1 ? testerUserIdx : 0]?.id;

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

  // ── 8. Sprints (at least 2, clamped to project date boundaries) ─────────────
  const sprintDuration = 14; // 2 weeks
  const projectDurationDays = differenceInDays(endDate, startDate);

  // Sprint 2 = CURRENT active sprint, starts from the project start date.
  // Use the nearest Monday on or after startDate so sprints align to week boundaries,
  // but never go before the project startDate.
  let sprint2Start = startOfWeek(startDate, { weekStartsOn: 1 });
  if (sprint2Start < startDate) {
    // startOfWeek went backwards (e.g. startDate is Wednesday → Monday before it).
    // Advance to the next Monday instead.
    sprint2Start = addDays(sprint2Start, 7);
  }
  // If advancing to next Monday pushed us past endDate, fall back to startDate itself.
  if (sprint2Start > endDate) {
    sprint2Start = startDate;
  }
  let sprint2End = addDays(sprint2Start, sprintDuration - 1);
  // Clamp sprint 2 end to project endDate
  if (sprint2End > endDate) {
    sprint2End = endDate;
  }

  // Sprint 1 = COMPLETED past sprint, runs immediately before Sprint 2.
  // Only create Sprint 1 if there is room within the project date range.
  const canFitTwoSprints = differenceInDays(sprint2Start, startDate) >= 7; // need at least 1 week
  let sprint1Start = startDate;
  let sprint1End = addDays(sprint2Start, -1);
  // Clamp sprint 1 start to project startDate (should already be, but safety check)
  if (sprint1Start < startDate) {
    sprint1Start = startDate;
  }
  // Ensure sprint1End doesn't go before sprint1Start
  if (sprint1End < sprint1Start) {
    sprint1End = sprint1Start;
  }

  const sprintRef2 = doc(col('sprints'));
  batch.set(sprintRef2, {
    title: canFitTwoSprints ? 'Sprint 2' : 'Sprint 1',
    isCurrent: true,
    status: 'Current',
    startDate: Timestamp.fromDate(sprint2Start),
    endDate: Timestamp.fromDate(sprint2End),
  });

  let sprintRef1: ReturnType<typeof doc> | null = null;
  if (canFitTwoSprints) {
    sprintRef1 = doc(col('sprints'));
    batch.set(sprintRef1, {
      title: 'Sprint 1',
      isCurrent: false,
      status: 'Completed',
      startDate: Timestamp.fromDate(sprint1Start),
      endDate: Timestamp.fromDate(sprint1End),
    });
  }

  const sprintIds = canFitTwoSprints
    ? [sprintRef1!.id, sprintRef2.id]
    : [sprintRef2.id];

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
  // with dates spread across the sprint period. This is critical for burndown/burnup charts.
  // IMPORTANT: Status names MUST match actual Kanban column names: 'To Do', 'In Progress', 'In QA', 'Done'.
  const buildStatusHistory = (finalStatus: string, sprintStartDate: Date, sprintEndDate: Date) => {
    const history: { fromStatus: string | null; toStatus: string; date: string }[] = [];
    const sprintDays = differenceInDays(sprintEndDate, sprintStartDate);

    // Everyone starts at 'To Do' on sprint start
    history.push({ fromStatus: null, toStatus: 'To Do', date: sprintStartDate.toISOString() });

    if (finalStatus === 'To Do') return history;

    // Move to 'In Progress' roughly 10-30% into the sprint
    const devStartOffset = Math.max(1, Math.floor(sprintDays * (0.1 + Math.random() * 0.2)));
    const devStartDate = addDays(sprintStartDate, devStartOffset);
    history.push({ fromStatus: 'To Do', toStatus: 'In Progress', date: devStartDate.toISOString() });

    if (finalStatus === 'In Progress') return history;

    // Move to 'In QA' roughly 40-60% into the sprint
    const qaStartOffset = Math.max(devStartOffset + 1, Math.floor(sprintDays * (0.4 + Math.random() * 0.2)));
    const qaStartDate = addDays(sprintStartDate, qaStartOffset);
    history.push({ fromStatus: 'In Progress', toStatus: 'In QA', date: qaStartDate.toISOString() });

    if (finalStatus === 'In QA') return history;

    // Move to 'Done' roughly 60-90% into the sprint
    const doneOffset = Math.max(qaStartOffset + 1, Math.floor(sprintDays * (0.6 + Math.random() * 0.3)));
    const doneDate = addDays(sprintStartDate, doneOffset);
    history.push({ fromStatus: 'In QA', toStatus: 'Done', date: doneDate.toISOString() });

    return history;
  };

  const storyRefObjs: { id: string; storyId: string; sprintId: string }[] = [];

  // We need the release ref early so we can assign releaseId to stories.
  // Create it here but set its data later.
  const releaseRef = doc(col('releases'));

  // 10a. Requirements / Stories
  storyTitles.forEach((title, i) => {
    const stRef = doc(col('stories'));
    const sprintId = sprintIds[i % sprintIds.length];
    const storyId = `ST-${storyCounter++}`;
    const epicId = epicIds[i % epicIds.length];
    const assigneeId = devUserIds[i % Math.max(devUserIds.length, 1)];
    const impactedSystemIds = systemIdsLive; // all 3 systems
    // Sprint 1 is a COMPLETED past sprint → all stories must be 'Done' so the burndown reaches zero.
    // Sprint 2 is the CURRENT active sprint → realistic mix of statuses.
    const finalStatus = sprintRef1 && sprintId === sprintRef1.id
        ? 'Done'
        : rand(['To Do', 'In Progress', 'In QA', 'Done', 'Done']); // Weight Done 2x
    const sprintStart = sprintRef1 && sprintId === sprintRef1.id ? sprint1Start : sprint2Start;
    const sprintEnd = sprintRef1 && sprintId === sprintRef1.id ? sprint1End : sprint2End;

    batch.set(stRef, clean({
      storyId,
      title,
      description: `User story: As a user I want to ${title.toLowerCase()} so that productivity improves.`,
      itemType: 'Requirement/Story',
      status: finalStatus,
      statusHistory: buildStatusHistory(finalStatus, sprintStart, sprintEnd),
      epicId,
      sprintId,
      releaseId: releaseRef.id,
      estimatedHours: randInt(8, 40),
      impactedSystemIds,
      assigneeId,
      priority: rand(['High', 'Medium', 'Low', 'Critical']),
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
    }));
    storyRefObjs.push({ id: stRef.id, storyId, sprintId });

    // Sub-tasks: at least 1 per impacted system
    systemIdsLive.forEach((sysId, sIdx) => {
      const subRef = doc(col('stories'));
      const subId = `SUB-${storyCounter++}`;
      
      let subFinalStatus = 'To Do';
      if (finalStatus === 'Done') {
        // Parent is Done (incl. all Sprint 1 stories) → sub-tasks must also be Done
        subFinalStatus = 'Done';
      } else if (finalStatus === 'In QA') {
        // Parent is in QA → sub-tasks are Done or In QA
        subFinalStatus = rand(['In QA', 'Done']);
      } else if (finalStatus === 'In Progress') {
        // Parent is In Progress → sub-tasks are To Do or In Progress
        subFinalStatus = rand(['To Do', 'In Progress']);
      }
      // 'To Do' parent: subFinalStatus stays 'To Do' (already set above)

      batch.set(subRef, clean({
        storyId: subId,
        title: `${systemDefs[sIdx].name} – ${title} implementation`,
        description: `Sub-task for ${systemDefs[sIdx].name} work on: ${title}`,
        itemType: 'Sub Task',
        status: subFinalStatus,
        statusHistory: buildStatusHistory(subFinalStatus, sprintStart, sprintEnd),
        parentStoryId: stRef.id,
        epicId,
        sprintId,
        releaseId: releaseRef.id,
        estimatedHours: randInt(2, 16),
        impactedSystemId: sysId,
        assigneeId: devUserIds[sIdx % Math.max(devUserIds.length, 1)],
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
      }));
    });
  });

  // 10b. Feature Changes
  // One FC per sprint so both burndowns have scope variety.
  fcTitles.forEach((title, fcIdx) => {
    const fcRef = doc(col('stories'));
    const fcId = `FC-${storyCounter++}`;
    const sprintId = sprintIds[fcIdx % sprintIds.length]; // spread across sprints
    // Sprint 1 is completed → FC must be Done.
    // Sprint 2 is current → FC can be any status.
    const fcStatus = sprintRef1 && sprintId === sprintRef1.id
        ? 'Done'
        : rand(['To Do', 'In Progress', 'In QA', 'Done']);
    const fcSprintStart = sprintRef1 && sprintId === sprintRef1.id ? sprint1Start : sprint2Start;
    const fcSprintEnd = sprintRef1 && sprintId === sprintRef1.id ? sprint1End : sprint2End;
    batch.set(fcRef, clean({
      storyId: fcId,
      title,
      description: `Feature change request: ${title}`,
      itemType: 'Feature Change',
      status: fcStatus,
      statusHistory: buildStatusHistory(fcStatus, fcSprintStart, fcSprintEnd),
      epicId: epicIds[0],
      sprintId,
      releaseId: releaseRef.id,
      estimatedHours: randInt(4, 20),
      impactedSystemIds: systemIdsLive,
      assigneeId: devUserIds[0],
      priority: 'Medium',
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
    }));
    storyRefObjs.push({ id: fcRef.id, storyId: fcId, sprintId });
  });

  // 10c. Tasks
  taskTitles.forEach(title => {
    const taskRef = doc(col('stories'));
    const taskId = `TASK-${storyCounter++}`;
    batch.set(taskRef, clean({
      storyId: taskId,
      title,
      description: `Technical task: ${title}`,
      itemType: 'Task',
      status: 'To Do',
      statusHistory: buildStatusHistory('To Do', sprint2Start, sprint2End),
      epicId: epicIds[1],
      sprintId: sprintIds[1],
      releaseId: releaseRef.id,
      estimatedHours: randInt(4, 16),
      impactedSystemIds: systemIdsLive,
      assigneeId: devUserIds[1] ?? devUserIds[0],
      priority: 'Low',
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
    }));
  });

  // ── 11. Test Plans & Test Cases ─────────────────────────────────────────
  // ── 11. Test Plans & Test Cases ─────────────────────────────────────────
  const sitEnd = addDays(testingStart, 2);
  const uatStart = addDays(sitEnd, 1);
  const uatEnd = addDays(uatStart, 2);
  const prodStart = addDays(uatEnd, 1);
  const prodEnd = addDays(prodStart, 2);

  const tpRefs: { id: string; name: string; start: Date; end: Date; ref: ReturnType<typeof doc> }[] = [];

  // SIT Plan
  const sitTpRef = doc(col('testPlans'));
  batch.set(sitTpRef, {
    testPlanId: 'TP-SIT',
    name: 'SIT Execution Plan',
    planType: 'Release',
    environmentId: envData.find(e => e.name === 'SIT')?.id,
    startDate: Timestamp.fromDate(testingStart),
    endDate: Timestamp.fromDate(sitEnd),
  });
  tpRefs.push({ id: sitTpRef.id, name: 'SIT', start: testingStart, end: sitEnd, ref: sitTpRef });

  // UAT Plan
  const uatTpRef = doc(col('testPlans'));
  batch.set(uatTpRef, {
    testPlanId: 'TP-UAT',
    name: 'UAT Sign-off Plan',
    planType: 'Release',
    environmentId: envData.find(e => e.name === 'UAT')?.id,
    startDate: Timestamp.fromDate(uatStart),
    endDate: Timestamp.fromDate(uatEnd),
  });
  tpRefs.push({ id: uatTpRef.id, name: 'UAT', start: uatStart, end: uatEnd, ref: uatTpRef });

  // Prod Plan
  const prodTpRef = doc(col('testPlans'));
  batch.set(prodTpRef, {
    testPlanId: 'TP-PROD',
    name: 'Production Sanity Plan',
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

    // Create the backlog test case (no executions field)
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

    // Create a copy in each test plan's subcollection
    tpRefs.forEach(tp => {
      const planTcRef = doc(collection(db, 'projects', projectId, 'testPlans', tp.id, 'testCases'));
      const generatedStatus = rand(['Passed', 'Passed', 'Failed', 'Not Run']);
      
      const planDays = differenceInDays(tp.end, tp.start);
      const randomDay = randInt(0, Math.max(0, planDays));
      const execDateStr = addDays(tp.start, randomDay).toISOString();

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
        statusHistory: [{ fromStatus: 'Not Run', toStatus: generatedStatus, date: execDateStr }],
        executionDate: generatedStatus !== 'Not Run' ? execDateStr : undefined,
        closeDate: generatedStatus === 'Passed' ? execDateStr : undefined,
      }));
    });
  });

  // ── 12. Bugs (30-50: 50% SIT, 35% UAT, 15% Prod) ───────────────────────────
  const totalBugs = randInt(30, 50);
  const sitBugsCount = Math.round(totalBugs * 0.50);
  const uatBugsCount = Math.round(totalBugs * 0.35);
  const prodBugsCount = totalBugs - (sitBugsCount + uatBugsCount);

  const sitTemplates = [
    'SIT: API validation error during batch import',
    'SIT: Database lock deadlock when saving story status',
    'SIT: Authentication token expires prematurely on refresh',
    'SIT: Memory leak observed in real-time chart re-rendering',
    'SIT: Component layout shift when resizing employee sidebar',
    'SIT: File upload fails for attachments larger than 2MB',
    'SIT: Incorrect JSON payload signature on webhook payload',
    'SIT: System exception when generating utilization reports',
    'SIT: WebSocket subscription disconnects after 5 minutes',
    'SIT: Thread exhaustion on parallel background sync tasks'
  ];

  const uatTemplates = [
    'UAT: Holiday generator confirmation modal is confusing',
    'UAT: Utilization heatmaps are difficult to read in light mode',
    'UAT: Expected payment milestones format doesn\'t match invoicing layout',
    'UAT: Missing confirmation prompt before archiving a project',
    'UAT: Text overlap in resource Gantt chart headers',
    'UAT: Dashboard stats cards count archived items incorrectly',
    'UAT: User profile editing doesn\'t save avatar selection',
    'UAT: Wording of "Move to Backlog" button is misleading',
    'UAT: Datepicker field allows past dates on sprint creation',
    'UAT: Export to CSV button is hidden on smaller screens'
  ];

  const prodTemplates = [
    'Production: Concurrent worklog submissions corrupt total hours count',
    'Production: Supabase auth rate limit exceeded under high load',
    'Production: Payment gateway callback signature mismatches on webhook',
    'Production: CDN assets take more than 5s to load in APAC region',
    'Production: Browser crash in Safari due to grid layout flex overlap',
    'Production: Billing calculations round cents incorrectly under fixed-bid plans',
    'Production: Sentry reports unhandled promise rejection on logout'
  ];

  let bugCounter = storyCounter;

  const createAutogenBug = (title: string, foundInPlanId: string) => {
    const bugRef = doc(col('stories'));
    const bugStatus = rand(['To Do', 'In Progress', 'Done']);
    const severity = rand(['Critical', 'High', 'Medium', 'Low']);
    const bugSprintId = rand(sprintIds);
    // Use the correct sprint dates for statusHistory based on assigned sprint
    const bugSprintStart = sprintRef1 && bugSprintId === sprintRef1.id ? sprint1Start : sprint2Start;
    const bugSprintEnd = sprintRef1 && bugSprintId === sprintRef1.id ? sprint1End : sprint2End;
    
    batch.set(bugRef, clean({
      storyId: `BUG-${bugCounter++}`,
      title,
      description: `Steps to reproduce: Nav to the affected module, perform standard actions, observe the ${severity.toLowerCase()} issue.`,
      itemType: 'Bug',
      status: bugStatus,
      statusHistory: buildStatusHistory(bugStatus, bugSprintStart, bugSprintEnd),
      sprintId: bugSprintId,
      releaseId: releaseRef.id,
      severity,
      priority: severity,
      assigneeId: rand(devUserIds) || null,
      foundInTestPlanId: foundInPlanId,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
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
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(releaseFriday),
    isCompleted: false,
  }));

  const stageDefs = [
    { name: 'Design', start: startDate, end: designEnd },
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

  // ── 19. Worklogs (full duration of the project for all employees) ───────────
  const worklogStart = startDate;
  const worklogEnd = endDate; // Full project duration
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
