/**
 * testDataEngine.ts
 * Core generator and cleanup engine for the ProjectFlow Test Data Studio.
 * Generates relationally linked mock datasets across Portfolios, Projects (with all subcollections),
 * and Employees/Users with Auth identity provisioning, and cleanly wipes test datasets.
 */

import { db } from '@/lib/db-provider';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
} from '@/lib/db-provider';
import { deleteProjectAndSubcollections } from '@/lib/firebase-helpers';
import { generateFullProjectData } from '@/lib/project-autogen';
import { subDays, addDays, startOfWeek, differenceInDays } from 'date-fns';
import type { User, Portfolio, Project, AccessLevel, PricingModel } from '@/types';

export const STUDIO_LOG_STORAGE_KEY = 'pf_test_data_studio_log';
const INSTANCE_STORAGE_KEY = 'pf_instance_id';

/**
 * Returns a stable, persistent unique identifier for the current local installation / client instance.
 * Ensures test data generation runs in one instance are strictly isolated and never leak to other instances.
 */
export function getInstanceId(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_INSTANCE_ID || 'server_instance';
  }
  try {
    let instId = localStorage.getItem(INSTANCE_STORAGE_KEY);
    if (!instId) {
      instId = process.env.NEXT_PUBLIC_INSTANCE_ID || `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(INSTANCE_STORAGE_KEY, instId);
    }
    return instId;
  } catch {
    return 'browser_instance';
  }
}

/**
 * Returns the storage key partitioned by the active client instance.
 */
export function getStudioLogStorageKey(instanceId = getInstanceId()): string {
  return `pf_test_data_studio_log_${instanceId}`;
}

export interface StudioProjectRef {
  id: string;
  name: string;
  portfolioId: string;
}

export interface StudioPortfolioRef {
  id: string;
  name: string;
}

export interface StudioUserRef {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  accessLevel?: AccessLevel | string;
  role?: string;
}

export interface StudioLogBatch {
  batchId: string;
  instanceId?: string;
  timestamp: string;
  preset?: string;
  projects: StudioProjectRef[];
  portfolios: StudioPortfolioRef[];
  users: StudioUserRef[];
}

export interface StudioLog {
  version: number;
  lastUpdated: string;
  batches: StudioLogBatch[];
}

/**
 * Extracts a consolidated, deduplicated set of all active studio assets across all batches in the log.
 */
export function getActiveStudioItems(log: StudioLog | null | undefined): {
  projectIds: string[];
  portfolioIds: string[];
  userIds: string[];
  projects: StudioProjectRef[];
  portfolios: StudioPortfolioRef[];
  users: StudioUserRef[];
} {
  if (!log || !Array.isArray(log.batches) || log.batches.length === 0) {
    return {
      projectIds: [],
      portfolioIds: [],
      userIds: [],
      projects: [],
      portfolios: [],
      users: [],
    };
  }

  const projectMap = new Map<string, StudioProjectRef>();
  const portfolioMap = new Map<string, StudioPortfolioRef>();
  const userMap = new Map<string, StudioUserRef>();

  for (const batch of log.batches) {
    for (const proj of batch.projects || []) {
      if (proj.id) projectMap.set(proj.id, proj);
    }
    for (const port of batch.portfolios || []) {
      if (port.id) portfolioMap.set(port.id, port);
    }
    for (const usr of batch.users || []) {
      if (usr.id) userMap.set(usr.id, usr);
    }
  }

  return {
    projectIds: Array.from(projectMap.keys()),
    portfolioIds: Array.from(portfolioMap.keys()),
    userIds: Array.from(userMap.keys()),
    projects: Array.from(projectMap.values()),
    portfolios: Array.from(portfolioMap.values()),
    users: Array.from(userMap.values()),
  };
}

/**
 * Retrieves the persistent Studio Log strictly isolated to the current instance.
 * Validates that logged projects/portfolios actually exist in the database and cleans up
 * any legacy unpartitioned logs from other instances.
 */
export async function getStudioLog(): Promise<StudioLog | null> {
  const instanceId = getInstanceId();
  const instanceStorageKey = getStudioLogStorageKey(instanceId);

  // 1. One-time purge of legacy shared global doc if present in DB
  if (db) {
    try {
      const legacyRef = doc(db, 'settings', 'test_data_studio_log');
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap && (typeof legacySnap.exists === 'function' ? legacySnap.exists() : legacySnap.data)) {
        await deleteDoc(legacyRef).catch(() => {});
      }
    } catch {}
  }

  // 2. Clear legacy unpartitioned localStorage cache if present
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STUDIO_LOG_STORAGE_KEY);
    } catch {}
  }

  let logData: StudioLog | null = null;

  // 3. Fetch instance-isolated log from database
  if (db) {
    try {
      const logSnap = await getDoc(doc(db, 'settings', `test_data_studio_log_${instanceId}`));
      if (logSnap && (typeof logSnap.exists === 'function' ? logSnap.exists() : logSnap.data)) {
        const data = (typeof logSnap.data === 'function' ? logSnap.data() : logSnap.data) as StudioLog;
        if (data && Array.isArray(data.batches)) {
          logData = data;
        }
      }
    } catch (err) {
      console.warn('[testDataEngine] Failed to fetch instance studio log from DB:', err);
    }
  }

  // 4. Fallback to instance-isolated localStorage
  if (!logData && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(instanceStorageKey);
      if (cached) {
        const parsed = JSON.parse(cached) as StudioLog;
        if (parsed && Array.isArray(parsed.batches)) {
          logData = parsed;
        }
      }
    } catch (e) {
      console.warn('[testDataEngine] Failed to read cached studio log from localStorage:', e);
    }
  }

  if (!logData || !Array.isArray(logData.batches) || logData.batches.length === 0) {
    return null;
  }

  // 5. Verification: Filter to batches belonging strictly to this instance AND confirm entities exist
  const validBatches: StudioLogBatch[] = [];
  for (const batch of logData.batches) {
    // Exclude batches tagged with a different instance ID
    if (batch.instanceId && batch.instanceId !== instanceId) {
      continue;
    }

    if (process.env.NODE_ENV === 'test') {
      validBatches.push(batch);
      continue;
    }

    if (db) {
      let hasLiveEntity = false;
      const projectsToCheck = (batch.projects || []).slice(0, 3);
      for (const proj of projectsToCheck) {
        try {
          const pDoc = await getDoc(doc(db, 'projects', proj.id));
          if (pDoc && (typeof pDoc.exists === 'function' ? pDoc.exists() : pDoc.data)) {
            hasLiveEntity = true;
            break;
          }
        } catch {}
      }

      if (!hasLiveEntity && (batch.portfolios || []).length > 0) {
        const portsToCheck = (batch.portfolios || []).slice(0, 2);
        for (const port of portsToCheck) {
          try {
            const portDoc = await getDoc(doc(db, 'portfolios', port.id));
            if (portDoc && (typeof portDoc.exists === 'function' ? portDoc.exists() : portDoc.data)) {
              hasLiveEntity = true;
              break;
            }
          } catch {}
        }
      }

      if (hasLiveEntity || (batch.projects?.length === 0 && batch.portfolios?.length === 0)) {
        validBatches.push(batch);
      }
    } else {
      validBatches.push(batch);
    }
  }

  if (validBatches.length === 0) {
    await clearStudioLog();
    return null;
  }

  const cleanedLog: StudioLog = {
    ...logData,
    batches: validBatches,
  };

  // Sync caches
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(instanceStorageKey, JSON.stringify(cleanedLog));
      localStorage.setItem(STUDIO_LOG_STORAGE_KEY, JSON.stringify(cleanedLog));
    } catch {}
  }

  return cleanedLog;
}

/**
 * Records newly generated studio assets into the persistent Studio Log manifest.
 */
export async function recordStudioLog(params: {
  projects?: Project[] | StudioProjectRef[];
  portfolios?: Portfolio[] | StudioPortfolioRef[];
  users?: User[] | StudioUserRef[];
  preset?: string;
}): Promise<StudioLog> {
  const instanceId = getInstanceId();
  const instanceStorageKey = getStudioLogStorageKey(instanceId);

  const existingLog = (await getStudioLog()) || {
    version: 1,
    lastUpdated: new Date().toISOString(),
    batches: [],
  };

  const newBatch: StudioLogBatch = {
    batchId: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    instanceId,
    timestamp: new Date().toISOString(),
    preset: params.preset,
    projects: (params.projects || []).map(p => ({
      id: p.id,
      name: p.name,
      portfolioId: (p as any).portfolioId || '',
    })),
    portfolios: (params.portfolios || []).map(p => ({
      id: p.id,
      name: p.name,
    })),
    users: (params.users || []).map(u => ({
      id: u.id,
      email: u.email,
      firstName: (u as any).firstName,
      lastName: (u as any).lastName,
      accessLevel: u.accessLevel,
      role: (u as any).role,
    })),
  };

  const updatedLog: StudioLog = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    batches: [...(existingLog.batches || []), newBatch],
  };

  // Sync to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(instanceStorageKey, JSON.stringify(updatedLog));
      localStorage.setItem(STUDIO_LOG_STORAGE_KEY, JSON.stringify(updatedLog));
    } catch (e) {
      console.warn('[testDataEngine] Failed to cache studio log in localStorage:', e);
    }
  }

  // Persist to DB scoped by instance
  if (db) {
    try {
      await setDoc(doc(db, 'settings', `test_data_studio_log_${instanceId}`), updatedLog);
    } catch (err) {
      console.error('[testDataEngine] Failed to save studio log to DB:', err);
    }
  }

  return updatedLog;
}

/**
 * Clears and removes the persistent Studio Log after successful deletion.
 */
export async function clearStudioLog(): Promise<void> {
  const instanceId = getInstanceId();
  const instanceStorageKey = getStudioLogStorageKey(instanceId);

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(instanceStorageKey);
      localStorage.removeItem(STUDIO_LOG_STORAGE_KEY);
    } catch (e) {}
  }

  if (db) {
    try {
      await deleteDoc(doc(db, 'settings', `test_data_studio_log_${instanceId}`));
      await deleteDoc(doc(db, 'settings', 'test_data_studio_log'));
    } catch (err) {
      console.warn('[testDataEngine] Failed to delete studio log doc from DB:', err);
    }
  }
}

/**
 * Removes a specific generation run batch from the Studio Log.
 * If no batches remain, clears the log completely.
 */
export async function removeStudioBatch(batchId: string): Promise<StudioLog | null> {
  const instanceId = getInstanceId();
  const instanceStorageKey = getStudioLogStorageKey(instanceId);

  const currentLog = await getStudioLog();
  if (!currentLog || !Array.isArray(currentLog.batches)) {
    await clearStudioLog();
    return null;
  }

  const remainingBatches = currentLog.batches.filter(b => b.batchId !== batchId);
  if (remainingBatches.length === 0) {
    await clearStudioLog();
    return null;
  }

  const updatedLog: StudioLog = {
    version: currentLog.version || 1,
    lastUpdated: new Date().toISOString(),
    batches: remainingBatches,
  };

  // Sync to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(instanceStorageKey, JSON.stringify(updatedLog));
      localStorage.setItem(STUDIO_LOG_STORAGE_KEY, JSON.stringify(updatedLog));
    } catch (e) {
      console.warn('[testDataEngine] Failed to cache updated studio log in localStorage:', e);
    }
  }

  // Persist to DB scoped by instance
  if (db) {
    try {
      await setDoc(doc(db, 'settings', `test_data_studio_log_${instanceId}`), updatedLog);
    } catch (err) {
      console.error('[testDataEngine] Failed to update studio log in DB:', err);
    }
  }

  return updatedLog;
}

// Realistic Name Banks for Generating Portfolios & Projects
const PORTFOLIO_TEMPLATES = [
  {
    name: 'Digital Transformation & Cloud Modernization',
    description: 'Core modernization of enterprise systems, cloud migrations, and microservice architectures.',
  },
  {
    name: 'NextGen Customer Experience & Portals',
    description: 'Omnichannel mobile apps, self-service portals, and AI-assisted customer engagement.',
  },
  {
    name: 'Global Payments, FinTech & Compliance',
    description: 'High-throughput payment rails, PCI compliance, fraud detection pipelines, and settlement.',
  },
  {
    name: 'Enterprise AI & Data Analytics',
    description: 'Predictive intelligence, GenAI workflows, telemetry pipelines, and unified reporting data lake.',
  },
];

export const PROJECT_NAME_TEMPLATES = [
  'Microservices Architecture Migration',
  'AI-Powered Customer Assistance Hub',
  'Real-Time Fraud Detection Engine',
  'Omnichannel Mobile Self-Service',
  'Multi-Region Zero Downtime Database',
  'Automated CI/CD Governance Pipeline',
  'Customer Identity & Access Gateway',
  'Unified Telemetry & Observability Hub',
  'Multi-Currency Settlement Rail',
  'PCI-DSS Compliance Vault Modernization',
  'Kafka Stream Processor Optimization',
  'GraphQL High-Performance Gateway',
];

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Sam', 'Chris', 'Pat', 'Jamie',
  'Riley', 'Avery', 'Dakota', 'Cameron', 'Reese', 'Casey', 'Robin', 'Quinn',
  'Adrian', 'Blake', 'Harper', 'Hayden', 'Jesse', 'Kendall', 'Logan', 'Peyton'
];

const LAST_NAMES = [
  'Vance', 'Sterling', 'Mercer', 'Chen', 'Patel', 'Novak', 'Sinclair', 'Hayes',
  'Thornton', 'Nakamura', 'O\'Connor', 'Kowalski', 'Gupta', 'Silva', 'Lindqvist', 'Dupont'
];

export interface GeneratorConfig {
  portfolioCount: number;
  projectCount: number;
  pricingModel: 'Fixed Bid' | 'T&M' | 'Mixed';
  targetPortfolioId?: string; // If specified, adds projects to this portfolio instead of creating new ones
  userCount: number;
  roleDistribution?: Partial<Record<AccessLevel, number>>;
  autoRunSimulation?: boolean;
  simulationProgress?: number; // 25 | 50 | 75 | 100
  projectSimulationProgress?: number[];
}

export const PRESET_CONFIGS: Record<'minimal' | 'standard' | 'stress', GeneratorConfig> = {
  minimal: {
    portfolioCount: 1,
    projectCount: 2,
    pricingModel: 'T&M',
    userCount: 8,
    autoRunSimulation: true,
    simulationProgress: 75,
    roleDistribution: {
      Administrator: 1,
      'Senior Management': 1,
      'Project Manager': 1,
      Lead: 2,
      'Team Member': 3,
      PMO: 0,
    },
  },
  standard: {
    portfolioCount: 2,
    projectCount: 5,
    pricingModel: 'Mixed',
    userCount: 16,
    autoRunSimulation: true,
    simulationProgress: 75,
    roleDistribution: {
      Administrator: 1,
      'Senior Management': 2,
      'Project Manager': 3,
      Lead: 3,
      'Team Member': 6,
      PMO: 1,
    },
  },
  stress: {
    portfolioCount: 4,
    projectCount: 12,
    pricingModel: 'Mixed',
    userCount: 32,
    autoRunSimulation: true,
    simulationProgress: 75,
    roleDistribution: {
      Administrator: 2,
      'Senior Management': 4,
      'Project Manager': 6,
      Lead: 6,
      'Team Member': 12,
      PMO: 2,
    },
  },
};

/**
 * Provisions user identities in the active Auth pool (Firebase Auth or Supabase).
 */
async function createAuthIdentity(email: string, firstName: string, lastName: string, accessLevel: string) {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName, lastName, accessLevel, password: 'P@ssw0rd' }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[testDataEngine] Identity provision warning for', email, err);
    return false;
  }
}

/**
 * Generates employees and registers them in both Firestore and Auth identity pool.
 * Stamps each record with createdByStudio: true and isTestData: true.
 */
export async function generateEmployees(
  totalCount: number,
  roleDistribution?: Partial<Record<AccessLevel, number>>,
  onProgress?: (message: string) => void
): Promise<User[]> {
  if (!db) throw new Error('Database is not initialized.');

  onProgress?.('Fetching existing employee directory...');
  const usersSnapshot = await getDocs(collection(db, 'employees'));
  let highestId = 0;
  usersSnapshot.forEach((d: any) => {
    const empId = d.id;
    if (empId.startsWith('E')) {
      const num = parseInt(empId.substring(1), 10);
      if (!isNaN(num) && num > highestId) {
        highestId = num;
      }
    }
  });

  const levels: AccessLevel[] = [
    'Administrator',
    'Senior Management',
    'Project Manager',
    'Lead',
    'Team Member',
    'PMO',
  ];

  // Determine distribution
  const counts: Record<AccessLevel, number> = {
    'Super Admin': 0,
    Administrator: 0,
    'Senior Management': 0,
    'Project Manager': 0,
    Lead: 0,
    'Team Member': 0,
    PMO: 0,
  };

  if (roleDistribution) {
    for (const lvl of levels) {
      if (roleDistribution[lvl] !== undefined) {
        counts[lvl] = roleDistribution[lvl]!;
      }
    }
  } else {
    // Default proportional allocation
    const pms = Math.max(1, Math.floor(totalCount * 0.2));
    const leads = Math.max(1, Math.floor(totalCount * 0.2));
    const sm = Math.max(1, Math.floor(totalCount * 0.1));
    const pmo = Math.max(0, Math.floor(totalCount * 0.05));
    const admin = 1;
    const teamMembers = Math.max(1, totalCount - (pms + leads + sm + pmo + admin));

    counts['Administrator'] = admin;
    counts['Senior Management'] = sm;
    counts['Project Manager'] = pms;
    counts['Lead'] = leads;
    counts['Team Member'] = teamMembers;
    counts['PMO'] = pmo;
  }

  let currentIdCounter = highestId + 1;
  const createdUsers: User[] = [];
  const batch = writeBatch(db);

  for (const level of levels) {
    const levelCount = counts[level] || 0;
    for (let i = 0; i < levelCount; i++) {
      const empId = `E${currentIdCounter.toString().padStart(3, '0')}`;
      const fName = FIRST_NAMES[(currentIdCounter + i) % FIRST_NAMES.length];
      const lName = LAST_NAMES[(currentIdCounter + i * 2) % LAST_NAMES.length];
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${currentIdCounter}@projectflow.io`;

      const startDate = new Date(Date.now() - Math.floor(Math.random() * 365 * 2 * 86400000)).toISOString();
      const costAmount = (Math.floor(Math.random() * 60) + 60) * 1000;

      const newUser: User = {
        id: empId,
        empId,
        firstName: fName,
        lastName: lName,
        email,
        phone: `+1-555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        experience: Math.floor(Math.random() * 12) + 2,
        employmentStartDate: startDate,
        accessLevel: level,
        role: level === 'Project Manager' ? 'PM' : level === 'Lead' ? 'Architect' : level === 'Senior Management' ? 'Program Director' : 'Developer',
        isDeleted: false,
        isEnabled: true,
        costCurrency: 'USD',
        costAmount,
      };

      const userRef = doc(db, 'employees', empId);
      batch.set(userRef, {
        ...newUser,
        isTestData: true,
        createdByStudio: true,
        instanceId: getInstanceId(),
        createdAt: new Date().toISOString(),
      });
      createdUsers.push(newUser);

      // Provision identity asynchronously
      createAuthIdentity(email, fName, lName, level);
      currentIdCounter++;
    }
  }

  onProgress?.(`Committing ${createdUsers.length} users to directory...`);
  await batch.commit();
  return createdUsers;
}

/**
 * Creates brand-new dedicated studio portfolios.
 * Test data is strictly isolated into newly created portfolios and never injected into existing ones.
 */
export async function createStudioPortfolios(
  count: number,
  onProgress?: (message: string) => void
): Promise<Portfolio[]> {
  if (!db) throw new Error('Database is not initialized.');

  onProgress?.('Scanning portfolios to allocate new test portfolio IDs...');
  const portSnap = await getDocs(collection(db, 'portfolios'));
  const existingIds = portSnap.docs
    .filter((d: any) => d.id.startsWith('PF'))
    .map((d: any) => parseInt(d.id.replace('PF', ''), 10))
    .filter((n: number) => !isNaN(n));

  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  const created: Portfolio[] = [];

  for (let i = 0; i < count; i++) {
    const nextNum = maxId + i + 1;
    const portfolioId = `PF${String(nextNum).padStart(3, '0')}`;
    const template = PORTFOLIO_TEMPLATES[i % PORTFOLIO_TEMPLATES.length];
    const newPort: Portfolio = {
      id: portfolioId,
      name: `${template.name} (Studio ${nextNum})`,
      description: template.description,
      isDeleted: false,
    };

    onProgress?.(`Provisioning dedicated studio portfolio: ${newPort.name} (${portfolioId})...`);
    await setDoc(doc(db, 'portfolios', portfolioId), {
      ...newPort,
      isTestData: true,
      createdByStudio: true,
      instanceId: getInstanceId(),
      createdAt: new Date().toISOString(),
    });
    created.push(newPort);
  }

  return created;
}

/**
 * Backward compatibility alias: always creates fresh dedicated portfolios.
 */
export const ensurePortfolios = createStudioPortfolios;

/**
 * Generates projects and populates all subcollections with rich relational data.
 * Stamps projects with createdByStudio: true and isTestData: true.
 */
export async function generateProjects(
  opts: {
    count: number;
    portfolioIds: string[];
    pricingModel: 'Fixed Bid' | 'T&M' | 'Mixed';
    globalUsers: User[];
    autoRunSimulation?: boolean;
    simulationProgress?: number;
    projectSimulationProgress?: number[];
    onProgress?: (message: string) => void;
  }
): Promise<Project[]> {
  const { count, portfolioIds, pricingModel, globalUsers, autoRunSimulation, simulationProgress, projectSimulationProgress, onProgress } = opts;
  if (!db) throw new Error('Database is not initialized.');

  onProgress?.('Scanning existing projects for next ID sequence...');
  const projectsSnapshot = await getDocs(collection(db, 'projects'));
  const currentYear = new Date().getFullYear().toString().slice(-2);

  const projectsFromThisYear = projectsSnapshot.docs
    .map((d: any) => d.id)
    .filter((id: string) => id.startsWith(`P${currentYear}`));

  let currentMaxId = projectsFromThisYear.length > 0
    ? Math.max(...projectsFromThisYear.map((id: string) => parseInt(id.substring(3), 10)))
    : 0;

  const generatedProjects: Project[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultProgressPct = simulationProgress ?? 75;

  for (let i = 0; i < count; i++) {
    currentMaxId++;
    const projectId = `P${currentYear}${currentMaxId.toString().padStart(5, '0')}`;
    const projectRef = doc(db, 'projects', projectId);

    const portfolioId = portfolioIds[i % portfolioIds.length];
    const projectName = `${PROJECT_NAME_TEMPLATES[i % PROJECT_NAME_TEMPLATES.length]} (Batch ${currentYear}-${currentMaxId})`;

    // Per-project simulation calculation
    const projProgressPct = projectSimulationProgress && projectSimulationProgress[i] !== undefined
      ? projectSimulationProgress[i]
      : defaultProgressPct;
    const isProjSimulated = autoRunSimulation !== false && projProgressPct > 0;
    const pastDaysOffset = projProgressPct <= 25 ? 6 : (projProgressPct <= 50 ? 18 : (projProgressPct <= 75 ? 26 : 45));

    const startDate = isProjSimulated ? startOfWeek(subDays(today, pastDaysOffset), { weekStartsOn: 1 }) : new Date();
    const endDate = addDays(startDate, 90);

    const model: PricingModel = pricingModel === 'Mixed'
      ? (i % 2 === 0 ? 'Fixed Bid' : 'T&M')
      : pricingModel;

    // Use only newly created studio users
    const pmUsers = globalUsers.filter(u => u.accessLevel === 'Project Manager' || u.accessLevel === 'Lead');
    const assignedPm = pmUsers.length > 0 ? pmUsers[i % pmUsers.length].id : globalUsers[0]?.id;

    const projectData: Project = {
      id: projectId,
      name: projectName,
      portfolioId,
      projectManagerId: assignedPm,
      pricingModel: model,
      status: 'Active',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isDeleted: false,
      overallStatus: 'Green',
      scopeStatus: 'Green',
      costStatus: i % 3 === 0 ? 'Amber' : 'Green',
      timeStatus: 'Green',
      statusComments: 'Autogenerated testing baseline via Test Data Studio.',
    };

    onProgress?.(`Writing root project document (${i + 1}/${count}): ${projectId}...`);
    await setDoc(projectRef, {
      ...projectData,
      isTestData: true,
      createdByStudio: true,
      instanceId: getInstanceId(),
      createdAt: new Date().toISOString(),
    });

    onProgress?.(`Populating subcollections for ${projectId} (Kanban, Sprints, Stories, Test Cycles, RAID)...`);
    await generateFullProjectData({
      db,
      projectId,
      startDate,
      endDate,
      globalUsers,
      pricingModel: model,
      autoRunSimulation: isProjSimulated,
      simulationProgress: projProgressPct,
    });

    generatedProjects.push(projectData);
  }

  return generatedProjects;
}

/**
 * Calibrates and simulates progression of work items and test cycles for any project
 * (or all studio projects) to a specified progress percentage (25%, 50%, 75%, 100%).
 * Updates stories, subtasks, kanban columns, and burndown/burnup telemetry.
 */
export async function simulateProjectProgression(
  projectId: string,
  targetPercentage: number = 75,
  onProgress?: (message: string) => void
): Promise<{ updatedStories: number; updatedTestCases: number }> {
  if (!db) throw new Error('Database is not initialized.');

  onProgress?.(`Loading project data for ${projectId}...`);
  const projectRef = doc(db, 'projects', projectId);
  const pDoc = await getDoc(projectRef);
  if (!pDoc || (typeof pDoc.exists === 'function' ? !pDoc.exists() : !pDoc.data)) {
    throw new Error(`Project ${projectId} not found.`);
  }

  // 1. Fetch Sprints, Columns, Stories, and Test Cycles
  onProgress?.(`Fetching sprints, kanban columns, and work items for ${projectId}...`);
  const sprintsSnap = await getDocs(collection(db, 'projects', projectId, 'sprints'));
  const columnsSnap = await getDocs(collection(db, 'projects', projectId, 'kanbanColumns'));
  const storiesSnap = await getDocs(collection(db, 'projects', projectId, 'stories'));
  const testCyclesSnap = await getDocs(collection(db, 'projects', projectId, 'testCycles'));

  const sprints = sprintsSnap.docs.map((d: any) => {
    const data = typeof d.data === 'function' ? d.data() : d;
    return {
      id: d.id,
      ...data,
      startDate: data.startDate?.toDate?.() ? data.startDate.toDate().toISOString() : data.startDate,
      endDate: data.endDate?.toDate?.() ? data.endDate.toDate().toISOString() : data.endDate,
    };
  });

  const columns = columnsSnap.docs.map((d: any) => ({
    id: d.id,
    ...(typeof d.data === 'function' ? d.data() : d),
  })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const stories = storiesSnap.docs.map((d: any) => ({
    id: d.id,
    ...(typeof d.data === 'function' ? d.data() : d),
  }));

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const doneCol = columns.find((c: any) => c.isDoneColumn)?.name || 'Done';
  const inQaCol = columns.find((c: any) => c.name === 'In QA')?.name || 'In QA';
  const inProgCol = columns.find((c: any) => c.name === 'In Progress')?.name || 'In Progress';
  const todoCol = columns[0]?.name || 'To Do';

  // 2. Sort sprints chronologically
  sprints.sort((a: any, b: any) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());

  // 3. Update sprints status according to target percentage
  const batch = writeBatch(db);
  sprints.forEach((sprint: any, sIdx: number) => {
    const sRef = doc(db, 'projects', projectId, 'sprints', sprint.id);
    let status = sprint.status;
    let isCurrent = sprint.isCurrent;

    if (targetPercentage >= 100) {
      status = 'Completed';
      isCurrent = false;
    } else if (targetPercentage >= 75) {
      if (sIdx === 0) { status = 'Completed'; isCurrent = false; }
      else if (sIdx === 1) { status = 'Current'; isCurrent = true; }
      else { status = 'Planned'; isCurrent = false; }
    } else if (targetPercentage >= 50) {
      if (sIdx === 0) { status = 'Completed'; isCurrent = false; }
      else if (sIdx === 1) { status = 'Current'; isCurrent = true; }
      else { status = 'Planned'; isCurrent = false; }
    } else {
      if (sIdx === 0) { status = 'Current'; isCurrent = true; }
      else { status = 'Planned'; isCurrent = false; }
    }

    batch.update(sRef, { status, isCurrent });
  });

  // 4. Update stories & subtasks
  let updatedStories = 0;
  stories.forEach((item: any, idx: number) => {
    if (item.isDeleted) return;
    const itemSprint = sprints.find((s: any) => s.id === item.sprintId) || sprints[0];
    const sprintIdx = sprints.findIndex((s: any) => s.id === item.sprintId);
    const sprintStart = itemSprint?.startDate ? new Date(itemSprint.startDate) : subDays(today, 14);
    const sprintEnd = itemSprint?.endDate ? new Date(itemSprint.endDate) : addDays(today, 1);

    let targetStatus = todoCol;

    if (targetPercentage >= 100) {
      targetStatus = doneCol;
    } else if (sprintIdx === 0 && targetPercentage >= 50) {
      // Sprint 1 is completed
      targetStatus = doneCol;
    } else if (sprintIdx === 1 || (sprintIdx === 0 && targetPercentage < 50)) {
      // Current active sprint
      if (targetPercentage >= 75) {
        // 60% done, 20% in qa, 10% in prog, 10% to do
        const r = (idx % 10);
        if (r < 6) targetStatus = doneCol;
        else if (r < 8) targetStatus = inQaCol;
        else if (r < 9) targetStatus = inProgCol;
        else targetStatus = todoCol;
      } else if (targetPercentage >= 50) {
        const r = (idx % 10);
        if (r < 3) targetStatus = doneCol;
        else if (r < 6) targetStatus = inQaCol;
        else if (r < 8) targetStatus = inProgCol;
        else targetStatus = todoCol;
      } else {
        const r = (idx % 10);
        if (r < 2) targetStatus = doneCol;
        else if (r < 4) targetStatus = inQaCol;
        else if (r < 7) targetStatus = inProgCol;
        else targetStatus = todoCol;
      }
    } else {
      // Future sprint
      targetStatus = todoCol;
    }

    // Build realistic status history
    const effectiveCutoff = sprintEnd < today ? sprintEnd : today;
    const availableDays = Math.max(1, differenceInDays(effectiveCutoff, sprintStart));
    const staggerRatio = (idx % 10) / 10;

    const history = [{ fromStatus: null, toStatus: todoCol, date: sprintStart.toISOString() }];
    if (targetStatus !== todoCol) {
      const inProgDate = addDays(sprintStart, Math.max(1, Math.min(availableDays - 1, Math.floor(1 + staggerRatio * 2))));
      history.push({ fromStatus: todoCol, toStatus: inProgCol, date: inProgDate.toISOString() });

      if (targetStatus === inQaCol || targetStatus === doneCol) {
        const qaDate = addDays(sprintStart, Math.max(2, Math.min(availableDays - 1, Math.floor(3 + staggerRatio * 2))));
        history.push({ fromStatus: inProgCol, toStatus: inQaCol, date: qaDate.toISOString() });

        if (targetStatus === doneCol) {
          const doneDate = addDays(sprintStart, Math.max(3, Math.min(availableDays, Math.floor(4 + staggerRatio * 4))));
          history.push({ fromStatus: inQaCol, toStatus: doneCol, date: doneDate.toISOString() });
        }
      }
    }

    const inProgEntry = history.find(h => h.toStatus === inProgCol);
    const doneEntry = history.find(h => h.toStatus === doneCol);

    const storyRef = doc(db, 'projects', projectId, 'stories', item.id);
    batch.update(storyRef, {
      status: targetStatus,
      statusHistory: history,
      developmentStartDate: inProgEntry?.date || null,
      completionDate: doneEntry?.date || null,
      closeDate: (item.itemType === 'Bug' && (targetStatus === doneCol || targetStatus === 'Resolved' || targetStatus === 'Closed'))
        ? (doneEntry?.date || now.toISOString())
        : null,
    });
    updatedStories++;
  });

  // 5. Update test cycles test cases
  let updatedTestCases = 0;
  for (const tc of testCyclesSnap.docs) {
    const casesSnap = await getDocs(collection(db, 'projects', projectId, 'testCycles', tc.id, 'testCases'));
    const cycleData: any = typeof tc.data === 'function' ? tc.data() : tc;
    const isSit = cycleData?.name?.includes('SIT');
    const isUat = cycleData?.name?.includes('UAT');

    casesSnap.docs.forEach((cDoc: any, cIdx: number) => {
      let tcStatus = 'Not Run';
      if (isSit) {
        tcStatus = targetPercentage >= 50 ? (cIdx % 5 === 0 ? 'Failed' : 'Passed') : 'Not Run';
      } else if (isUat) {
        if (targetPercentage >= 75) {
          tcStatus = cIdx % 6 === 0 ? 'Failed' : (cIdx % 3 === 0 ? 'Not Run' : 'Passed');
        } else if (targetPercentage >= 50) {
          tcStatus = cIdx % 2 === 0 ? 'Passed' : 'Not Run';
        }
      } else {
        tcStatus = targetPercentage >= 100 ? 'Passed' : 'Not Run';
      }

      const caseRef = doc(db, 'projects', projectId, 'testCycles', tc.id, 'testCases', cDoc.id);
      batch.update(caseRef, {
        status: tcStatus,
        executionDate: tcStatus !== 'Not Run' ? now.toISOString() : null,
        closeDate: tcStatus === 'Passed' ? now.toISOString() : null,
      });
      updatedTestCases++;
    });
  }

  onProgress?.(`Committing simulation telemetry (${updatedStories} stories/tasks, ${updatedTestCases} test executions)...`);
  await batch.commit();

  return { updatedStories, updatedTestCases };
}

/**
 * Wipes only the test data created in a specific Studio generation run/batch.
 * Leaves test data from other studio runs, as well as genuine workspace data, untouched.
 * Removes this batch from the Studio Log after successful deletion.
 */
export async function wipeStudioBatch(
  batchId: string,
  opts?: {
    wipeProjects?: boolean;
    wipeUsers?: boolean;
    wipePortfolios?: boolean;
    onProgress?: (message: string) => void;
  }
): Promise<{ deletedProjects: number; deletedUsers: number; deletedPortfolios: number }> {
  if (!db) throw new Error('Database is not initialized.');
  const { wipeProjects = true, wipeUsers = true, wipePortfolios = true, onProgress } = opts || {};

  onProgress?.(`Locating studio log for run ${batchId}...`);
  const studioLog = await getStudioLog();
  const batch = studioLog?.batches?.find(b => b.batchId === batchId);

  if (!batch) {
    onProgress?.(`No studio log found for run ${batchId}.`);
    return { deletedProjects: 0, deletedUsers: 0, deletedPortfolios: 0 };
  }

  // Cross-check other active batches so we don't accidentally delete an entity shared across batches
  const otherBatches = (studioLog?.batches || []).filter(b => b.batchId !== batchId);
  const otherProjectIds = new Set(otherBatches.flatMap(b => (b.projects || []).map(p => p.id)));
  const otherPortfolioIds = new Set(otherBatches.flatMap(b => (b.portfolios || []).map(p => p.id)));
  const otherUserIds = new Set(otherBatches.flatMap(b => (b.users || []).map(u => u.id)));

  let currentAdminEmail = '';
  let currentAdminId = '';
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('projectflow_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        currentAdminEmail = parsed.email || '';
        currentAdminId = parsed.id || parsed.empId || '';
      }
    } catch {}
  }

  let deletedProjects = 0;
  let deletedPortfolios = 0;
  let deletedUsers = 0;

  // 1. Delete Projects in this batch
  if (wipeProjects) {
    const projectsToDelete = (batch.projects || []).filter(p => !otherProjectIds.has(p.id));
    onProgress?.(`Purging ${projectsToDelete.length} project(s) from run ${batchId}...`);
    for (let i = 0; i < projectsToDelete.length; i++) {
      const pid = projectsToDelete[i].id;
      onProgress?.(`Deleting project ${i + 1}/${projectsToDelete.length}: ${pid}...`);
      await deleteProjectAndSubcollections(pid);
      deletedProjects++;
    }
  }

  // 2. Delete Portfolios in this batch
  if (wipePortfolios) {
    const portfoliosToDelete = (batch.portfolios || []).filter(p => !otherPortfolioIds.has(p.id));
    if (portfoliosToDelete.length > 0) {
      onProgress?.(`Purging ${portfoliosToDelete.length} portfolio(s) from run ${batchId}...`);
      const portBatch = writeBatch(db);
      for (const port of portfoliosToDelete) {
        portBatch.delete(doc(db, 'portfolios', port.id));
        deletedPortfolios++;
      }
      await portBatch.commit();
    }
  }

  // 3. Delete Users in this batch (including studio admins)
  if (wipeUsers) {
    const usersToDelete = (batch.users || []).filter(u => {
      if (otherUserIds.has(u.id)) return false;
      const isCurrentAdmin =
        (currentAdminEmail && u.email?.toLowerCase() === currentAdminEmail.toLowerCase()) ||
        (currentAdminId && u.id === currentAdminId);
      return !isCurrentAdmin;
    });

    if (usersToDelete.length > 0) {
      onProgress?.(`Purging ${usersToDelete.length} user(s) (including studio admins) from run ${batchId}...`);
      const userBatch = writeBatch(db);
      for (const user of usersToDelete) {
        userBatch.delete(doc(db, 'employees', user.id));
        deletedUsers++;
        if (user.email) {
          try {
            fetch(`/api/users?email=${encodeURIComponent(user.email)}`, { method: 'DELETE' }).catch(() => {});
          } catch {}
        }
      }
      await userBatch.commit();
    }
  }

  // 4. Remove this specific run batch from the Studio Log
  onProgress?.(`Updating studio log to remove run ${batchId}...`);
  await removeStudioBatch(batchId);
  onProgress?.(`Run ${batchId} successfully removed.`);

  return { deletedProjects, deletedUsers, deletedPortfolios };
}

/**
 * Wipes only the test data created by Test Data Studio by reading and validating
 * against the Studio Log manifest.
 *
 * Rules:
 * 1. Projects: ONLY projects created by the studio are deleted. Pre-existing projects
 *    in pre-existing portfolios are 100% protected.
 * 2. Portfolios: ONLY portfolios created by the studio are deleted.
 * 3. Users: ONLY users created by the studio are deleted. Even if the studio created
 *    admin accounts, those studio admins are deleted. Original users (whether admins,
 *    PMs, developers, leads, etc.) are strictly left untouched.
 * 4. If batchId is provided, wipes only that specific generation run and removes its entry.
 *    Otherwise, wipes all batches across all runs and clears the log manifest.
 */
export async function wipeWorkspaceTestData(
  opts: {
    batchId?: string;
    wipeProjects?: boolean;
    wipeUsers?: boolean;
    wipePortfolios?: boolean;
    onProgress?: (message: string) => void;
  } = {}
): Promise<{ deletedProjects: number; deletedUsers: number; deletedPortfolios: number }> {
  if (opts?.batchId) {
    return wipeStudioBatch(opts.batchId, opts);
  }

  if (!db) throw new Error('Database is not initialized.');
  const { wipeProjects = true, wipeUsers = true, wipePortfolios = true, onProgress } = opts;

  let deletedProjects = 0;
  let deletedUsers = 0;
  let deletedPortfolios = 0;

  onProgress?.('Reading and validating Studio test data manifest...');
  const studioLog = await getStudioLog();
  const activeItems = getActiveStudioItems(studioLog);

  // Get current logged-in user email and id to protect the active admin session
  let currentAdminEmail = '';
  let currentAdminId = '';
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('projectflow_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        currentAdminEmail = parsed.email || '';
        currentAdminId = parsed.id || parsed.empId || '';
      }
    } catch {}
  }

  // 1. Wipe Test Projects
  if (wipeProjects) {
    let projectsToDelete: string[] = [];

    if (activeItems.projectIds.length > 0) {
      // Validate projects strictly against the studio log
      onProgress?.(`Validating ${activeItems.projectIds.length} logged studio project(s)...`);
      for (const pid of activeItems.projectIds) {
        try {
          const pDoc = await getDoc(doc(db, 'projects', pid));
          if (pDoc && (typeof pDoc.exists === 'function' ? pDoc.exists() : pDoc.data)) {
            projectsToDelete.push(pid);
          }
        } catch {
          // If error checking or already gone, include to ensure cleanup
          projectsToDelete.push(pid);
        }
      }
    } else {
      // Fallback if no log exists: ONLY target projects explicitly tagged by the studio!
      // NEVER use d.id.startsWith('P') which caused deletion of genuine projects.
      onProgress?.('No studio log found. Scanning exclusively for explicit studio-tagged projects...');
      const pSnap = await getDocs(collection(db, 'projects'));
      pSnap.forEach((d: any) => {
        const data = typeof d.data === 'function' ? d.data() : d;
        const isThisInstance = !data.instanceId || data.instanceId === getInstanceId();
        const isStudioProject =
          isThisInstance &&
          (data.createdByStudio === true ||
            (data.isTestData === true &&
              (data.statusComments?.includes('Autogenerated testing baseline via Test Data Studio') ||
               (data.name && (data.name.includes('(Batch ') || data.name.includes('Autogen'))))));
        if (isStudioProject) {
          projectsToDelete.push(d.id);
        }
      });
    }

    onProgress?.(`Purging ${projectsToDelete.length} studio project(s) and subcollections...`);
    for (let i = 0; i < projectsToDelete.length; i++) {
      const pid = projectsToDelete[i];
      onProgress?.(`Deleting studio project ${i + 1}/${projectsToDelete.length}: ${pid}...`);
      await deleteProjectAndSubcollections(pid);
      deletedProjects++;
    }
  }

  // 2. Wipe Test Portfolios created by studio
  if (wipePortfolios) {
    let portfoliosToDelete: string[] = [];

    if (activeItems.portfolioIds.length > 0) {
      onProgress?.(`Validating ${activeItems.portfolioIds.length} logged studio portfolio(s)...`);
      for (const portId of activeItems.portfolioIds) {
        try {
          const portDoc = await getDoc(doc(db, 'portfolios', portId));
          if (portDoc && (typeof portDoc.exists === 'function' ? portDoc.exists() : portDoc.data)) {
            portfoliosToDelete.push(portId);
          }
        } catch {
          portfoliosToDelete.push(portId);
        }
      }
    } else {
      // Fallback: strictly check for explicit studio tags / names
      onProgress?.('No studio log found. Scanning exclusively for dedicated studio test portfolios...');
      const portSnap = await getDocs(collection(db, 'portfolios'));
      portSnap.forEach((d: any) => {
        const data = typeof d.data === 'function' ? d.data() : d;
        const isStudioPort =
          data.createdByStudio === true ||
          data.isTestData === true ||
          (data.name && data.name.includes('(Studio '));
        if (isStudioPort) {
          portfoliosToDelete.push(d.id);
        }
      });
    }

    if (portfoliosToDelete.length > 0) {
      onProgress?.(`Purging ${portfoliosToDelete.length} studio test portfolio(s)...`);
      const portBatch = writeBatch(db);
      for (const portId of portfoliosToDelete) {
        portBatch.delete(doc(db, 'portfolios', portId));
        deletedPortfolios++;
      }
      await portBatch.commit();
    }
  }

  // 3. Wipe Test Users created by studio
  // CRITICAL REQUIREMENT:
  // - Studio-created admin users MUST be deleted.
  // - Original users (whether Admin, PM, Developer, Lead, etc.) MUST be left untouched!
  if (wipeUsers) {
    let usersToDelete: StudioUserRef[] = [];

    if (activeItems.users.length > 0) {
      onProgress?.(`Validating ${activeItems.users.length} logged studio user(s)...`);
      for (const user of activeItems.users) {
        // Protect the active logged-in admin session as a safety safeguard
        if (
          (currentAdminEmail && user.email?.toLowerCase() === currentAdminEmail.toLowerCase()) ||
          (currentAdminId && user.id === currentAdminId)
        ) {
          console.warn(`[testDataEngine] Safeguarding currently logged-in admin from deletion: ${user.email}`);
          continue;
        }
        usersToDelete.push(user);
      }
    } else {
      // Fallback if no log exists: ONLY target users explicitly stamped with createdByStudio
      // OR users with explicit studio test emails: e.g. @projectflow.io AND with isTestData flag.
      // NEVER delete genuine employees who lack studio markers!
      onProgress?.('No studio log found. Scanning exclusively for studio-tagged test users...');
      const uSnap = await getDocs(collection(db, 'employees'));
      uSnap.forEach((d: any) => {
        const data = typeof d.data === 'function' ? d.data() : d;
        const isCurrentAdmin =
          (currentAdminEmail && data.email?.toLowerCase() === currentAdminEmail.toLowerCase()) ||
          (currentAdminId && d.id === currentAdminId);

        if (isCurrentAdmin) return;

        const isStudioUser =
          data.createdByStudio === true ||
          (data.isTestData === true && data.email?.includes('@projectflow.io'));

        if (isStudioUser) {
          usersToDelete.push({
            id: d.id,
            email: data.email,
            accessLevel: data.accessLevel,
            role: data.role,
          });
        }
      });
    }

    if (usersToDelete.length > 0) {
      onProgress?.(`Purging ${usersToDelete.length} studio user(s) (including studio admins)...`);
      const userBatch = writeBatch(db);
      for (const user of usersToDelete) {
        userBatch.delete(doc(db, 'employees', user.id));
        deletedUsers++;

        // Clean up auth pool identity if email is present
        if (user.email) {
          try {
            fetch(`/api/users?email=${encodeURIComponent(user.email)}`, { method: 'DELETE' }).catch(() => {});
          } catch {}
        }
      }
      await userBatch.commit();
    }
  }

  // 4. Remove the Studio Log after successful deletion
  onProgress?.('Cleaning up studio creation log manifest...');
  await clearStudioLog();
  onProgress?.('Test data cleanup complete.');

  return { deletedProjects, deletedUsers, deletedPortfolios };
}


