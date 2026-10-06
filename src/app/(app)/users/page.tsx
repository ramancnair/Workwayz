

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc, Timestamp, query, where, writeBatch, db } from '@/lib/db-provider';
import { firebaseConfig } from '@/lib/firebase';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, ArrowUpDown, X, CheckCircle, ShieldCheck, ShieldOff, Clock, UserCheck, Search, KeyRound } from 'lucide-react';
import { type User, type AccessLevel, ASSIGNABLE_ACCESS_LEVELS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getUserInitials, formatRateInput } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

const accessLevels: AccessLevel[] = ['Super Admin', 'Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO'];

const userFormSchema = z.object({
  empId: z.string().min(1, 'Emp ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  experience: z.coerce.number().optional(),
  employmentStartDate: z.string().optional().nullable(),
  employmentEndDate: z.string().optional().nullable(),
  accessLevel: z.enum(['Super Admin', 'Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO'], {
    required_error: 'Access Level is required',
  }),
  costAmount: z.union([z.string(), z.number()]).optional().nullable(),
  costCurrency: z.string().optional(),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: 'Password must be at least 6 characters',
  }),
});

// Helper to remove undefined values from an object before sending to Firestore
const sanitizeForFirestore = (data: any) => {
  const sanitized: any = {};
  for (const key in data) {
    if (data[key] !== undefined) {
      if (typeof data[key] === 'number' && !Number.isNaN(data[key])) {
        sanitized[key] = data[key];
      } else if (typeof data[key] !== 'number') {
        sanitized[key] = data[key];
      }
    }
  }
  return sanitized;
};

function SortableHeader({
  columnId,
  onSort,
  children,
  className,
}: {
  columnId: string;
  onSort: (columnId: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => onSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const [filters, setFilters] = useState({ search: '', accessLevel: 'all' });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'firstName', desc: false });

  const [currentUser, setCurrentUser] = useState<{ empId: string; accessLevel: AccessLevel; name: string; email: string } | null>(null);

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

  const isAdmin = currentUser?.accessLevel === 'Administrator' || currentUser?.accessLevel === 'Super Admin';

  const usersAwaitingEnablement = useMemo(() => {
    return users.filter(u => u.isEnabled === false);
  }, [users]);

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
  });

  useEffect(() => {
    if (!db) { console.error('DB is null, aborting onSubmit!'); return; }
    const q = query(collection(db, 'employees'), where('isDeleted', '!=', true));
    const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
      const usersData = querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          employmentStartDate: data.employmentStartDate?.toDate ? data.employmentStartDate.toDate().toISOString() : data.employmentStartDate,
          employmentEndDate: data.employmentEndDate?.toDate ? data.employmentEndDate.toDate().toISOString() : data.employmentEndDate,
        } as User;
      });
      setUsers(usersData);
    }, (err: any) => {
      console.warn('[Users] Employees listener error:', err);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
      const formatDateStr = (dStr: any) => {
        if (!dStr) return '';
        try {
          const d = typeof dStr === 'string' ? parseISO(dStr) : new Date(dStr);
          return isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
        } catch {
          return '';
        }
      };

      if (editingUser) {
        let initialCost = '';
        if (editingUser.costAmount !== undefined && editingUser.costAmount !== null) {
          initialCost = formatRateInput(editingUser.costAmount);
        }

        form.reset({
          ...editingUser,
          employmentStartDate: formatDateStr(editingUser.employmentStartDate),
          employmentEndDate: formatDateStr(editingUser.employmentEndDate),
          costAmount: initialCost,
          costCurrency: editingUser.costCurrency ?? 'USD',
          password: '',
        });
      } else {
        form.reset({
          empId: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          experience: 0,
          employmentStartDate: '',
          employmentEndDate: '',
          accessLevel: undefined,
          costAmount: '',
          costCurrency: 'USD',
          password: 'P@ssw0rd',
        });
      }
    }
  }, [isDialogOpen, editingUser, form]);

  useEffect(() => {
    setSelectedUsers(prev => prev.filter(id => users.some(u => u.id === id && !u.isDeleted)));
  }, [users]);

  const handleDialogOpen = (user: User | null) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const createIdentityInAuthPool = async (email: string, firstName?: string, lastName?: string, accessLevel?: string, password?: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName, accessLevel, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create identity');
    } catch (e) {
      console.error("Identity push failed", e);
      toast({ variant: "destructive", title: "Auth Sync Warning", description: "User saved to DB but identity creation failed. See console." });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser || !db) return;
    if (deletingUser.accessLevel === 'Super Admin') {
      toast({
        variant: "destructive",
        title: "Action Prohibited",
        description: "Super Admin accounts cannot be deleted even by administrators. They can only be removed directly via the database.",
      });
      setDeletingUser(null);
      return;
    }
    const idToDelete = deletingUser.id;
    try {
      const userRef = doc(db, 'employees', idToDelete);
      await updateDoc(userRef, { isDeleted: true, deletedAt: Timestamp.now() });
      setSelectedUsers(prev => prev.filter(id => id !== idToDelete));
      toast({ title: "Success", description: "User moved to Trash." });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete user." });
    }
    setDeletingUser(null);
  };

  const handleResetPasswordConfirm = async () => {
    if (!resettingUser || !db) return;
    if (resettingUser.accessLevel === 'Super Admin') {
      toast({
        variant: "destructive",
        title: "Action Prohibited",
        description: "Super Admin accounts cannot have their password reset via this panel.",
      });
      setResettingUser(null);
      return;
    }

    setIsResetSubmitting(true);
    try {
      // 1. Direct authenticated database update from client (works for both Firebase and Supabase client adapter)
      const targetDocId = resettingUser.id || resettingUser.empId;
      const userRef = doc(db, 'employees', targetDocId);
      await updateDoc(userRef, {
        needsPasswordReset: true,
        updatedAt: Timestamp.now(),
      });

      // 2. Also notify backend to handle Supabase Auth pool password update (if Supabase is active)
      try {
        await fetch('/api/users/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: resettingUser.email,
            empId: resettingUser.empId || resettingUser.id,
            accessLevel: resettingUser.accessLevel,
          })
        });
      } catch (apiErr) {
        console.warn('[handleResetPasswordConfirm] Backend sync note:', apiErr);
      }

      toast({
        title: "Password Reset Successful",
        description: `Password for ${resettingUser.firstName} ${resettingUser.lastName} has been reset to temporary (P@ssw0rd). They will be prompted to set a new password on login.`,
      });
    } catch (err: any) {
      console.error("Password reset error:", err);
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: err.message || "Could not reset user password.",
      });
    } finally {
      setIsResetSubmitting(false);
      setResettingUser(null);
    }
  };


  const handleBulkDeleteConfirm = async () => {
    if (selectedUsers.length === 0 || !db) return;
    // Filter out any Super Admin users - cannot be deleted via the application
    const usersToDelete = selectedUsers.filter(userId => {
      const u = users.find(user => user.id === userId);
      return u?.accessLevel !== 'Super Admin';
    });

    if (usersToDelete.length === 0) {
      toast({
        variant: "destructive",
        title: "Action Prohibited",
        description: "Super Admin accounts cannot be deleted. Removal can only be performed directly via the database.",
      });
      setSelectedUsers([]);
      setShowBulkDeleteConfirm(false);
      return;
    }

    const batch = writeBatch(db);
    const deletionTime = Timestamp.now();
    usersToDelete.forEach(userId => {
      const userRef = doc(db!, 'employees', userId);
      batch.update(userRef, { isDeleted: true, deletedAt: deletionTime });
    });

    try {
      await batch.commit();
      toast({ title: "Success", description: `${usersToDelete.length} user(s) moved to trash.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not move users to trash." });
    } finally {
      setSelectedUsers([]);
      setShowBulkDeleteConfirm(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof userFormSchema>) => {
    console.log('onSubmit called', values, 'db is', db);
    if (!db) { console.error('DB is null, aborting onSubmit!'); return; }
    setIsSubmitting(true);

    // Check for unique email
    const isEmailTaken = users.some(user => user.email === values.email && user.id !== editingUser?.id);
    if (isEmailTaken) {
      form.setError("email", { type: "manual", message: "This email is already in use." });
      setIsSubmitting(false);
      return;
    }

    const valuesWithDates: any = { ...values };
    if (values.employmentStartDate && values.employmentStartDate.trim() !== '') {
      valuesWithDates.employmentStartDate = new Date(values.employmentStartDate).toISOString();
    } else {
      valuesWithDates.employmentStartDate = null;
    }
    if (values.employmentEndDate && values.employmentEndDate.trim() !== '') {
      valuesWithDates.employmentEndDate = new Date(values.employmentEndDate).toISOString();
    } else {
      valuesWithDates.employmentEndDate = null;
    }

    if (values.costAmount !== undefined && values.costAmount !== null && String(values.costAmount).trim() !== '') {
      const parsedCost = parseFloat(String(values.costAmount));
      valuesWithDates.costAmount = !isNaN(parsedCost) ? Math.round(parsedCost * 100) / 100 : null;
    } else {
      valuesWithDates.costAmount = null;
    }

    const sanitizedValues = sanitizeForFirestore(valuesWithDates);

    try {
      if (editingUser) {
        const updateData = { ...sanitizedValues };
        delete updateData.password;
        delete updateData.id;
        // Never allow demoting a Super Admin via the UI
        if (editingUser.accessLevel === 'Super Admin') {
          updateData.accessLevel = 'Super Admin';
        } else if (values.accessLevel === 'Super Admin') {
          toast({ variant: "destructive", title: "Action Prohibited", description: "Super Admin can only be created via the Setup Wizard or directly in the database." });
          setIsSubmitting(false);
          return;
        }
        if (editingUser.isEnabled === false) {
          if (!isAdmin) {
            toast({ variant: "destructive", title: "Unauthorized", description: "Only Administrators can enable users." });
            setIsSubmitting(false);
            return;
          }
          updateData.isEnabled = true;
        }
        await updateDoc(doc(db, 'employees', editingUser.id), updateData);

        // Sync role in auth pool asynchronously in background so it does not block the UI
        if (values.accessLevel !== editingUser.accessLevel) {
          createIdentityInAuthPool(values.email, values.firstName, values.lastName, values.accessLevel);
        }

        toast({
          title: editingUser.isEnabled === false ? "User Enabled" : "Success",
          description: editingUser.isEnabled === false
            ? `${values.firstName} ${values.lastName} has been enabled successfully.`
            : "User updated successfully."
        });
      } else {
        if (values.accessLevel === 'Super Admin') {
          toast({ variant: "destructive", title: "Action Prohibited", description: "Super Admin can only be created via the Setup Wizard or directly in the database." });
          setIsSubmitting(false);
          return;
        }

        // Check for unique Emp ID when creating a new user
        const isEmpIdTaken = users.some(user => user.empId === values.empId);
        if (isEmpIdTaken) {
          form.setError("empId", { type: "manual", message: "This Emp ID is already taken." });
          setIsSubmitting(false);
          return;
        }

        // Use empId as the document ID
        const userRef = doc(db, 'employees', values.empId);
        await setDoc(userRef, {
          ...sanitizedValues,
          avatar: '',
          isDeleted: false,
          isEnabled: true,
        });

        // Push single identity to auth pool asynchronously in background
        createIdentityInAuthPool(values.email, values.firstName, values.lastName, values.accessLevel, values.password);

        toast({ title: "Success", description: `User added to database.` });
      }
      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error saving user", error);
      toast({ variant: "destructive", title: "Error", description: `Could not save user.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', accessLevel: 'all' });
  };

  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];
    const searchTerm = filters.search.toLowerCase();

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(searchTerm) ||
        user.lastName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.empId.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.accessLevel !== 'all') {
      filtered = filtered.filter(user => user.accessLevel === filters.accessLevel);
    }

    if (sorting) {
      filtered.sort((a, b) => {
        let valA: any = (a as any)[sorting.id] || '';
        let valB: any = (b as any)[sorting.id] || '';

        if (sorting.id === 'name') {
          valA = `${a.firstName} ${a.lastName}`;
          valB = `${b.firstName} ${b.lastName}`;
        }

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB, undefined, { numeric: true });
        } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
          if (valA === valB) comparison = 0;
          else if (valA) comparison = -1;
          else comparison = 1;
        } else if (valA > valB) {
          comparison = 1;
        } else if (valA < valB) {
          comparison = -1;
        }

        return sorting.desc ? -comparison : comparison;
      });
    }
    return filtered;
  }, [users, filters, sorting]);

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="User List" description="Manage user access">
          {selectedUsers.length > 0 && (
            <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedUsers.length})
            </Button>
          )}
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </PageHeader>

        {/* Users Awaiting Enablement Section */}
        {isAdmin && usersAwaitingEnablement.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-lg">Users Awaiting Enablement</CardTitle>
              </div>
              <CardDescription>
                These users have signed up but need to be enabled and assigned an access level before they can access the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersAwaitingEnablement.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium pl-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                              {getUserInitials(user.firstName, user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          {user.firstName} {user.lastName}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">{user.phone || 'N/A'}</TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          size="sm"
                          onClick={() => handleDialogOpen(user)}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
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

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Filter by name, ID, or email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <Select value={filters.accessLevel} onValueChange={(v) => handleFilterChange('accessLevel', v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by access level..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Access Levels</SelectItem>
                  {[...accessLevels].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" /> Clear Filters
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filteredAndSortedUsers.filter(u => u.accessLevel !== 'Super Admin').length > 0 &&
                        filteredAndSortedUsers
                          .filter(u => u.accessLevel !== 'Super Admin')
                          .every(item => selectedUsers.includes(item.id))
                      }
                      onCheckedChange={(value) =>
                        setSelectedUsers(
                          value
                            ? filteredAndSortedUsers.filter(u => u.accessLevel !== 'Super Admin').map(item => item.id)
                            : []
                        )
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                  <SortableHeader columnId="empId" onSort={handleSort}>Emp ID</SortableHeader>
                  <SortableHeader columnId="name" onSort={handleSort}>Name</SortableHeader>
                  <SortableHeader columnId="email" onSort={handleSort}>Email</SortableHeader>
                  <SortableHeader columnId="accessLevel" onSort={handleSort}>Access Level</SortableHeader>
                  <SortableHeader columnId="isEnabled" onSort={handleSort}>Enabled</SortableHeader>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedUsers.map((user) => (
                  <TableRow key={user.id} data-state={selectedUsers.includes(user.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        disabled={user.accessLevel === 'Super Admin'}
                        onCheckedChange={(value) =>
                          setSelectedUsers(
                            value
                              ? [...selectedUsers, user.id]
                              : selectedUsers.filter((id) => id !== user.id)
                          )
                        }
                        aria-label={`Select row for ${user.firstName}`}
                        title={user.accessLevel === 'Super Admin' ? "Super Admin cannot be selected for deletion" : undefined}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.empId}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={`${user.firstName} ${user.lastName}`}>{user.firstName} {user.lastName}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={user.email}>{user.email}</TableCell>
                    <TableCell>
                      {user.accessLevel === 'Super Admin' ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-semibold gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          Super Admin
                        </Badge>
                      ) : user.accessLevel === 'Administrator' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-medium">
                          Administrator
                        </Badge>
                      ) : (
                        <span>{user.accessLevel || 'N/A'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isEnabled === false ? (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-300 dark:border-amber-700 dark:bg-amber-900/30">
                          <ShieldOff className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:border-green-700 dark:bg-green-900/30">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Enabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDialogOpen(user)}
                          disabled={user.isEnabled === false && !isAdmin}
                          title={user.isEnabled === false && !isAdmin ? "Only Administrators can enable users" : undefined}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setResettingUser(user)}
                          disabled={user.accessLevel === 'Super Admin' || !isAdmin}
                          className={cn(user.accessLevel === 'Super Admin' && "opacity-40 cursor-not-allowed")}
                          title={user.accessLevel === 'Super Admin' ? "Super Admin password cannot be reset via this panel." : !isAdmin ? "Only Administrators can reset passwords" : "Reset user password to default (P@ssw0rd)"}
                        >
                          <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setDeletingUser(user)}
                          disabled={user.accessLevel === 'Super Admin'}
                          className={cn(user.accessLevel === 'Super Admin' && "opacity-40 cursor-not-allowed")}
                          title={user.accessLevel === 'Super Admin' ? "Super Admin cannot be deleted via the application. Removal can only be performed directly via the database." : "Delete user"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl><Input placeholder="John" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="empId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emp ID *</FormLabel>
                      <FormControl><Input placeholder="E.g., E001" {...field} readOnly={!!editingUser} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl><Input placeholder="123-456-7890" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="experience" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience (years)</FormLabel>
                      <FormControl><Input type="number" placeholder="5" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="employmentStartDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date</FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="employmentEndDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leaving Date</FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="accessLevel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Level *</FormLabel>
                      {editingUser?.accessLevel === 'Super Admin' ? (
                        <div>
                          <Input
                            value="Super Admin"
                            disabled
                            className="bg-muted text-muted-foreground cursor-not-allowed font-medium"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Super Admin role cannot be changed via the UI. It can only be modified directly in the database.
                          </p>
                        </div>
                      ) : (
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an access level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[...ASSIGNABLE_ACCESS_LEVELS].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(level => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                  {!editingUser && (
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <div className="space-y-2">
                    <FormLabel>Cost</FormLabel>
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
                      <FormField control={form.control} name="costCurrency" render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || 'USD'}>
                          <FormControl>
                            <SelectTrigger className="w-[125px] border-0 focus:ring-0 focus:ring-offset-0 rounded-r-none shadow-none h-full bg-transparent pr-2 pl-3">
                              <SelectValue placeholder="USD" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="INR">INR (₹)</SelectItem>
                            <SelectItem value="CAD">CAD ($)</SelectItem>
                            <SelectItem value="AUD">AUD ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                      <div className="h-6 w-px bg-input shrink-0" />
                      <FormField control={form.control} name="costAmount" render={({ field }) => (
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none shadow-none h-full bg-transparent px-3 font-mono"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.length > 1 && /^0[0-9]/.test(val)) {
                                val = val.replace(/^0+/, '');
                              }
                              if (/^(0|[1-9]\d{0,7})?(\.\d{0,2})?$/.test(val)) {
                                field.onChange(val);
                              }
                            }}
                            onBlur={() => {
                              if (field.value !== undefined && field.value !== null && String(field.value).trim() !== '') {
                                field.onChange(formatRateInput(field.value));
                              }
                            }}
                          />
                        </FormControl>
                      )} />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingUser ? 'Saving...' : 'Creating...') : (editingUser ? 'Save Changes' : 'Create User')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUser} onOpenChange={(isOpen) => !isOpen && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the user record for {deletingUser?.firstName} {deletingUser?.lastName} to the Trash. It will be permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the selected {selectedUsers.length} user(s) to the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resettingUser} onOpenChange={(isOpen) => { if (!isOpen && !isResetSubmitting) setResettingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset User Password?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-1 text-left">
              <span>
                Are you sure you want to reset the password for{' '}
                <strong className="text-foreground">{resettingUser?.firstName} {resettingUser?.lastName}</strong> ({resettingUser?.email})?
              </span>
              <span className="block p-3 rounded-md bg-muted text-xs text-muted-foreground border leading-relaxed">
                Their credentials will be reset to the default temporary password: <code className="font-mono font-bold text-foreground bg-background px-1.5 py-0.5 rounded border">P@ssw0rd</code>.<br />
                Upon their next login, they will be required to change it to a private password before accessing the system.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleResetPasswordConfirm();
              }}
              disabled={isResetSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isResetSubmitting ? 'Resetting...' : 'Reset Password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


