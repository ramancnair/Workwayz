'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageHeader } from '@/components/PageHeader';
import { type User, type Project, type AccessLevel, type RagStatus, type ProjectStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Briefcase, ChevronRight, Clock, UserCheck, AlertCircle, Loader2 } from 'lucide-react';

const ENABLEMENT_ROLES: AccessLevel[] = ['Administrator', 'Senior Management', 'Project Manager'];

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

  const [currentUser, setCurrentUser] = useState<{ empId: string; accessLevel: AccessLevel; name: string; email: string } | null>(null);
  const [currentUserFromDb, setCurrentUserFromDb] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [myProjectIds, setMyProjectIds] = useState<string[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [enablingUserId, setEnablingUserId] = useState<string | null>(null);

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

  // Listen to all users (for the enablement panel)
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'employees'), where('isDeleted', '!=', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as User));
      setAllUsers(usersData);

      // Find the current user in the DB to check isEnabled
      if (currentUser?.empId) {
        const dbUser = usersData.find(u => u.empId === currentUser.empId);
        if (dbUser) {
          setCurrentUserFromDb(dbUser);
        }
      }
      setIsLoadingUsers(false);
    });
    return () => unsub();
  }, [currentUser?.empId]);

  // Listen to all projects
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'projects'), where('isDeleted', '!=', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Project))
        .filter(p => !p.isArchived);
      setAllProjects(projectsData);
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
        try {
          const empRef = collection(db!, 'projects', project.id, 'employees');
          const empSnap = await getDocs(empRef);

          const isInProject = empSnap.docs.some(doc => {
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
  const canEnableUsers = currentUser && ENABLEMENT_ROLES.includes(currentUser.accessLevel);

  const usersAwaitingEnablement = useMemo(() => {
    return allUsers.filter(u => u.isEnabled === false);
  }, [allUsers]);

  const myProjects = useMemo(() => {
    return allProjects.filter(p => myProjectIds.includes(p.id));
  }, [allProjects, myProjectIds]);

  const handleEnableUser = async (userId: string) => {
    if (!db) return;
    setEnablingUserId(userId);
    try {
      const userRef = doc(db, 'employees', userId);
      await updateDoc(userRef, { isEnabled: true });
      toast({ title: 'User Enabled', description: 'The user has been enabled and can now access their projects.' });
    } catch (error) {
      console.error('Error enabling user:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not enable user.' });
    } finally {
      setEnablingUserId(null);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isLoading = isLoadingUsers || isLoadingProjects;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PageHeader title="My Projects" description="View your assigned projects and quick links." />

      {/* Users Awaiting Enablement — only for authorized roles */}
      {canEnableUsers && usersAwaitingEnablement.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-lg">Users Awaiting Enablement</CardTitle>
            </div>
            <CardDescription>
              These users have signed up but need to be enabled before they can access their projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersAwaitingEnablement.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            {getInitials(`${user.firstName} ${user.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        {user.firstName} {user.lastName}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.accessLevel || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleEnableUser(user.id)}
                        disabled={enablingUserId === user.id}
                      >
                        {enablingUserId === user.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="mr-2 h-4 w-4" />
                        )}
                        Enable
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
          {myProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}/development/dashboard`}>
              <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5">
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
                    {project.overallStatus && (
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
