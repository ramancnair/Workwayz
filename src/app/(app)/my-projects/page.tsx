'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs, doc, updateDoc } from '@/lib/db-provider';
import { db } from '@/lib/db-provider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageHeader } from '@/components/PageHeader';
import { type User, type Project, type AccessLevel, type RagStatus, type ProjectStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { getProjectLandingPage } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Briefcase, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';


const statusStyles: Record<ProjectStatus, string> = {
  'Initial Estimation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Not Started': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const ragColors: Record<RagStatus, string> = {
  'Green': 'bg-green-500',
  'Amber': 'bg-yellow-500',
  'Red': 'bg-red-500',
};

export default function MyProjectsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { userRole, customPageAccess } = usePermissions();

  const [currentUser, setCurrentUser] = useState<{ empId: string; accessLevel: AccessLevel; name: string; email: string } | null>(null);
  const [currentUserFromDb, setCurrentUserFromDb] = useState<User | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [myProjectIds, setMyProjectIds] = useState<string[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Read current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('projectflow_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser({
          empId: parsed.empId || '',
          accessLevel: (parsed.accessLevel as AccessLevel) || 'Team Member',
          name: parsed.name || '',
          email: parsed.email || '',
        });
      } catch {
        console.error('Failed to parse user from localStorage');
      }
    }
  }, []);

  // Listen to current user only to check isEnabled status
  useEffect(() => {
    if (!db || !currentUser?.empId) {
      if (!currentUser?.empId) {
        setIsLoadingUsers(false);
      }
      return;
    }
    const docRef = doc(db, 'employees', currentUser.empId);
    const unsub = onSnapshot(docRef, (snapshot: any) => {
      if (snapshot.exists()) {
        setCurrentUserFromDb({ ...snapshot.data(), id: snapshot.id } as User);
      } else {
        setCurrentUserFromDb(null);
      }
      setIsLoadingUsers(false);
    }, (error: any) => {
      console.error("Error listening to current user status:", error);
      setIsLoadingUsers(false);
    });
    return () => unsub();
  }, [currentUser?.empId]);

  // Listen to all projects
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'projects'), where('isDeleted', '!=', true));
    const unsub = onSnapshot(q, (snapshot: any) => {
      const projectsData = snapshot.docs
        .map((doc: any) => ({ ...doc.data(), id: doc.id } as Project))
        .filter((p: any) => !p.isArchived);
      setAllProjects(projectsData);
    }, (err: any) => {
      console.warn('[MyProjects] Projects listener error:', err);
    });
    return () => unsub();
  }, []);

  // Find which projects the current user is part of
  useEffect(() => {
    if (!db || !currentUser?.empId || !allProjects.length) {
      if (allProjects.length === 0 && !isLoadingUsers) {
        setIsLoadingProjects(false);
      }
      return;
    }

    const fetchUserProjects = async () => {
      setIsLoadingProjects(true);
      const projectIds: string[] = [];

      for (const project of allProjects) {
        if (project.projectManagerId === currentUser.empId) {
          projectIds.push(project.id);
          continue;
        }

        try {
          const empRef = collection(db!, 'projects', project.id, 'employees');
          const empSnap = await getDocs(empRef);

          const isInProject = empSnap.docs.some((doc: any) => {
            const data = doc.data();
            return doc.id === currentUser.empId || data.empId === currentUser.empId;
          });

          if (isInProject) {
            projectIds.push(project.id);
          }
        } catch {
          // Silently skip projects we can't read
        }
      }

      setMyProjectIds(projectIds);
      setIsLoadingProjects(false);
    };

    fetchUserProjects();
  }, [currentUser?.empId, allProjects]);

  const isUserEnabled = currentUserFromDb ? currentUserFromDb.isEnabled !== false : true;

  const myProjects = useMemo(() => {
    return allProjects.filter(p => myProjectIds.includes(p.id));
  }, [allProjects, myProjectIds]);

  const isLoading = isLoadingUsers || isLoadingProjects;

  const handleProjectClick = (project: Project) => {
    const landingRoute = getProjectLandingPage(project.id, project.status, userRole, customPageAccess);
    if (!landingRoute) {
      toast({
        variant: 'destructive',
        title: 'Access Restricted',
        description: `You do not have permission to access any pages in "${project.name}". Please contact your administrator.`,
      });
      return;
    }
    router.push(landingRoute);
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PageHeader title="My Projects" description="View your assigned projects and quick links." />

      {/* Main content: My Projects list */}
      {!isUserEnabled ? (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/40 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Account Pending Enablement</h3>
            <p className="text-muted-foreground max-w-md">
              Your account has been created but is waiting for enablement by an administrator.
              Once enabled, you will be able to see your assigned projects here.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading your projects...</span>
          </CardContent>
        </Card>
      ) : myProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Projects Found</h3>
            <p className="text-muted-foreground max-w-md">
              You are not currently assigned to any projects. Ask your Project Manager to add you to a project's resource list.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myProjects.map((project) => {
            return (
              <div key={project.id} onClick={() => handleProjectClick(project)}>
                <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 h-full flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base truncate">{project.name}</CardTitle>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    <CardDescription className="text-xs font-mono">{project.id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {project.status && (
                        <Badge className={cn('text-xs', statusStyles[project.status])}>
                          {project.status}
                        </Badge>
                      )}
                      {project.overallStatus && project.status !== 'Not Started' && project.status !== 'Initial Estimation' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Health</span>
                          <div className={cn('h-3 w-3 rounded-full', ragColors[project.overallStatus])} />
                        </div>
                      )}
                    </div>
                    {project.summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{project.summary}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
