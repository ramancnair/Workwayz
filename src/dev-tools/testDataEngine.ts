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
  setDoc,
  writeBatch,
} from '@/lib/db-provider';
import { deleteProjectAndSubcollections } from '@/lib/firebase-helpers';
import { generateFullProjectData } from '@/lib/project-autogen';
import type { User, Portfolio, Project, AccessLevel, PricingModel } from '@/types';

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

const PROJECT_NAME_TEMPLATES = [
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
}

export const PRESET_CONFIGS: Record<'minimal' | 'standard' | 'stress', GeneratorConfig> = {
  minimal: {
    portfolioCount: 1,
    projectCount: 2,
    pricingModel: 'T&M',
    userCount: 8,
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
      batch.set(userRef, newUser);
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
 * Creates or retrieves portfolios.
 */
export async function ensurePortfolios(
  count: number,
  onProgress?: (message: string) => void
): Promise<Portfolio[]> {
  if (!db) throw new Error('Database is not initialized.');

  onProgress?.('Ensuring portfolios...');
  const portSnap = await getDocs(collection(db, 'portfolios'));
  const existingPortfolios: Portfolio[] = [];
  portSnap.forEach((d: any) => {
    const data = d.data();
    if (!data.isDeleted) {
      existingPortfolios.push({ ...data, id: d.id } as Portfolio);
    }
  });

  if (existingPortfolios.length >= count) {
    return existingPortfolios.slice(0, count);
  }

  const needed = count - existingPortfolios.length;
  const created: Portfolio[] = [];

  for (let i = 0; i < needed; i++) {
    const template = PORTFOLIO_TEMPLATES[(existingPortfolios.length + i) % PORTFOLIO_TEMPLATES.length];
    const portfolioId = `PF${String(existingPortfolios.length + i + 1).padStart(3, '0')}`;
    const newPort: Portfolio = {
      id: portfolioId,
      name: `${template.name} ${existingPortfolios.length + i + 1}`,
      description: template.description,
      isDeleted: false,
    };

    await setDoc(doc(db, 'portfolios', portfolioId), newPort);
    created.push(newPort);
  }

  return [...existingPortfolios, ...created];
}

/**
 * Generates projects and populates all subcollections with rich relational data.
 */
export async function generateProjects(
  opts: {
    count: number;
    portfolioIds: string[];
    pricingModel: 'Fixed Bid' | 'T&M' | 'Mixed';
    globalUsers: User[];
    onProgress?: (message: string) => void;
  }
): Promise<Project[]> {
  const { count, portfolioIds, pricingModel, globalUsers, onProgress } = opts;
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

  for (let i = 0; i < count; i++) {
    currentMaxId++;
    const projectId = `P${currentYear}${currentMaxId.toString().padStart(5, '0')}`;
    const projectRef = doc(db, 'projects', projectId);

    const portfolioId = portfolioIds[i % portfolioIds.length];
    const projectName = `${PROJECT_NAME_TEMPLATES[i % PROJECT_NAME_TEMPLATES.length]} (Batch ${currentYear}-${currentMaxId})`;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const model: PricingModel = pricingModel === 'Mixed'
      ? (i % 2 === 0 ? 'Fixed Bid' : 'T&M')
      : pricingModel;

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
    await setDoc(projectRef, projectData);

    onProgress?.(`Populating subcollections for ${projectId} (Kanban, Sprints, Stories, Test Cycles, RAID)...`);
    await generateFullProjectData({
      db,
      projectId,
      startDate,
      endDate,
      globalUsers,
      pricingModel: model,
    });

    generatedProjects.push(projectData);
  }

  return generatedProjects;
}

/**
 * Wipes autogenerated dummy projects and mock test users while preserving Administrator accounts.
 */
export async function wipeWorkspaceTestData(
  opts: {
    wipeProjects: boolean;
    wipeUsers: boolean;
    onProgress?: (message: string) => void;
  }
): Promise<{ deletedProjects: number; deletedUsers: number }> {
  if (!db) throw new Error('Database is not initialized.');
  const { wipeProjects, wipeUsers, onProgress } = opts;

  let deletedProjects = 0;
  let deletedUsers = 0;

  // 1. Wipe Dummy Projects
  if (wipeProjects) {
    onProgress?.('Scanning projects to wipe...');
    const pSnap = await getDocs(collection(db, 'projects'));
    const projectsToDelete: string[] = [];

    pSnap.forEach((d: any) => {
      const data = d.data();
      // Target autogenerated projects or all non-locked projects
      const isAutogen = (data.name && (data.name.includes('Autogen') || data.name.includes('Batch') || data.statusComments?.includes('Autogenerated'))) || d.id.startsWith('P');
      if (isAutogen) {
        projectsToDelete.push(d.id);
      }
    });

    onProgress?.(`Purging ${projectsToDelete.length} dummy projects and their subcollections...`);
    for (let i = 0; i < projectsToDelete.length; i++) {
      const pid = projectsToDelete[i];
      onProgress?.(`Deleting project ${i + 1}/${projectsToDelete.length}: ${pid}...`);
      await deleteProjectAndSubcollections(pid);
      deletedProjects++;
    }
  }

  // 2. Wipe Test Users (Strictly Preserving Administrators)
  if (wipeUsers) {
    onProgress?.('Scanning users to wipe...');
    const uSnap = await getDocs(collection(db, 'employees'));
    const batch = writeBatch(db);
    let batchCount = 0;

    // Get current logged-in user email if available
    let currentAdminEmail = '';
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('projectflow_user');
        if (stored) currentAdminEmail = JSON.parse(stored).email || '';
      } catch { }
    }

    uSnap.forEach((d: any) => {
      const data = d.data();
      const isAdmin = data.accessLevel === 'Administrator' || data.role === 'Administrator' || data.email === currentAdminEmail || data.email?.includes('admin');
      if (!isAdmin) {
        batch.delete(d.ref);
        deletedUsers++;
        batchCount++;
      }
    });

    if (batchCount > 0) {
      onProgress?.(`Purging ${batchCount} mock users (Admins protected)...`);
      await batch.commit();
    }
  }

  return { deletedProjects, deletedUsers };
}

