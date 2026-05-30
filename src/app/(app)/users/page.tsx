

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc, Timestamp, query, where, writeBatch } from 'firebase/firestore';
import { db, firebaseConfig } from '@/lib/firebase';
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
import { PlusCircle, Edit, Trash2, ArrowUpDown, X, CheckCircle, Bot, ShieldCheck, ShieldOff } from 'lucide-react';
import { type User, type AccessLevel } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

const accessLevels: AccessLevel[] = ['Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO'];

const userFormSchema = z.object({
  empId: z.string().min(1, 'Emp ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  experience: z.coerce.number().optional(),
  accessLevel: z.enum(['Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO']).optional(),
  costAmount: z.coerce.number().optional(),
  costCurrency: z.string().optional(),
});

const autoGenFormSchema = z.object({
  Administrator: z.coerce.number().min(0).default(0),
  'Senior Management': z.coerce.number().min(0).default(0),
  'Project Manager': z.coerce.number().min(0).default(0),
  Lead: z.coerce.number().min(0).default(0),
  'Team Member': z.coerce.number().min(0).default(0),
  PMO: z.coerce.number().min(0).default(0),
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


export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const [filters, setFilters] = useState({ search: '', accessLevel: 'all' });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'firstName', desc: false });
  
  const [isAutoGenOpen, setIsAutoGenOpen] = useState(false);
  const [isAutoGenSubmitting, setIsAutoGenSubmitting] = useState(false);

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
  });
  
  const autoGenForm = useForm<z.infer<typeof autoGenFormSchema>>({
    resolver: zodResolver(autoGenFormSchema),
    defaultValues: {
        Administrator: 0,
        'Senior Management': 0,
        'Project Manager': 0,
        Lead: 0,
        'Team Member': 0,
        PMO: 0,
    }
  });
  
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'employees'), where('isDeleted', '!=', true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const usersData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                employmentStartDate: data.employmentStartDate?.toDate ? data.employmentStartDate.toDate().toISOString() : data.employmentStartDate,
                employmentEndDate: data.employmentEndDate?.toDate ? data.employmentEndDate.toDate().toISOString() : data.employmentEndDate,
            } as User;
        });
        setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
        if (editingUser) {
        form.reset({
            ...editingUser,
            costAmount: editingUser.costAmount ?? 0,
            costCurrency: editingUser.costCurrency ?? 'USD',
        });
        } else {
        form.reset({
            empId: '',
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            experience: 0,
            accessLevel: undefined,
            costAmount: 0,
            costCurrency: 'USD',
        });
        }
    }
  }, [isDialogOpen, editingUser, form]);

  const handleDialogOpen = (user: User | null) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };
  
  const createIdentityInAuthPool = async (email: string, firstName?: string, lastName?: string, accessLevel?: string) => {
      try {
          const res = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, firstName, lastName, accessLevel })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to create identity');
      } catch (e) {
          console.error("Identity push failed", e);
          toast({ variant: "destructive", title: "Auth Sync Warning", description: "User saved to DB but identity creation failed. See console." });
      }
  };
  
  const onAutoGenSubmit = async (values: z.infer<typeof autoGenFormSchema>) => {
    if(!db) return;
    setIsAutoGenSubmitting(true);
    
    try {
        const batch = writeBatch(db);
        const usersSnapshot = await getDocs(collection(db, 'employees'));
        
        let highestId = 0;
        usersSnapshot.forEach(doc => {
            const empId = doc.id;
            if (empId.startsWith('E')) {
                const numPart = parseInt(empId.substring(1));
                if (!isNaN(numPart) && numPart > highestId) {
                    highestId = numPart;
                }
            }
        });
        
        let currentIdCounter = highestId + 1;
        
        for (const level of accessLevels) {
            const count = values[level];
            for (let i = 0; i < count; i++) {
                const empId = `E${currentIdCounter.toString().padStart(3, '0')}`;
                const firstName = `${level.replace(' ', '')}${i+1}`;
                const lastName = 'User';
                const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@nair.com`;
                
                const newUser: Omit<User, 'id'> = {
                    empId,
                    firstName,
                    lastName,
                    email,
                    phone: '555-555-5555',
                    experience: Math.floor(Math.random() * 10) + 1,
                    accessLevel: level,
                    avatar: 'https://placehold.co/40x40.png',
                    isDeleted: false,
                    isEnabled: true,
                    costCurrency: 'USD',
                    costAmount: (Math.floor(Math.random() * 80) + 40) * 1000,
                };
                
                const userRef = doc(db, 'employees', empId);
                batch.set(userRef, sanitizeForFirestore(newUser));
                
                // Construct shadow identity in the auth pool
                await createIdentityInAuthPool(email, firstName, lastName, level);
                
                currentIdCounter++;
            }
        }
        
        await batch.commit();
        toast({ title: 'Success', description: 'Users generated and pushed to Authentication.' });
        setIsAutoGenOpen(false);
    } catch (e) {
        console.error("Error auto-generating users", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not generate users.' });
    }
    
    setIsAutoGenSubmitting(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser || !db) return;
    try {
      const userRef = doc(db, 'employees', deletingUser.id);
      await updateDoc(userRef, { isDeleted: true, deletedAt: Timestamp.now() });
      toast({ title: "Success", description: "User moved to Trash." });
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({ variant: "destructive", title: "Error", description: "Could not delete user." });
    }
    setDeletingUser(null);
  };
  
  const handleBulkDeleteConfirm = async () => {
    if (selectedUsers.length === 0 || !db) return;
    const batch = writeBatch(db);
    const deletionTime = Timestamp.now();
    selectedUsers.forEach(userId => {
        const userRef = doc(db!, 'employees', userId);
        batch.update(userRef, { isDeleted: true, deletedAt: deletionTime });
    });

    try {
        await batch.commit();
        toast({ title: "Success", description: `${selectedUsers.length} user(s) moved to trash.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not move users to trash." });
    } finally {
        setSelectedUsers([]);
        setShowBulkDeleteConfirm(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof userFormSchema>) => {
    if (!db) return;
    setIsSubmitting(true);
    
    // Check for unique email
    const isEmailTaken = users.some(user => user.email === values.email && user.id !== editingUser?.id);
    if (isEmailTaken) {
        form.setError("email", { type: "manual", message: "This email is already in use." });
        setIsSubmitting(false);
        return;
    }
    
    const valuesWithDates: any = { ...values };
    
    const sanitizedValues = sanitizeForFirestore(valuesWithDates);

    try {
      if (editingUser) {
        await updateDoc(doc(db, 'employees', editingUser.id), sanitizedValues);
        
        // Also push updates to Auth pool to ensure roles are synced
        await createIdentityInAuthPool(values.email, values.firstName, values.lastName, values.accessLevel);
        
        toast({ title: "Success", description: `User updated successfully.` });
      } else {
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
            avatar: 'https://placehold.co/40x40.png',
            isDeleted: false,
            isEnabled: true,
        });
        
        // Push single identity to auth pool
        await createIdentityInAuthPool(values.email, values.firstName, values.lastName, values.accessLevel);
        
        toast({ title: "Success", description: `User added to database and Authentication cache.` });
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

  const SortableHeader = ({ columnId, children, className }: { columnId: string; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

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
          <Dialog open={isAutoGenOpen} onOpenChange={setIsAutoGenOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Bot className="mr-2 h-4 w-4" />
                    User Autogen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Auto-Generate Users</DialogTitle>
                    <DialogDescription>Enter the number of users to create for each access level.</DialogDescription>
                </DialogHeader>
                <Form {...autoGenForm}>
                    <form onSubmit={autoGenForm.handleSubmit(onAutoGenSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {accessLevels.map(level => (
                                <FormField
                                    key={level}
                                    control={autoGenForm.control}
                                    name={level}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{level}</FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="0" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isAutoGenSubmitting}>
                                {isAutoGenSubmitting ? 'Generating...' : 'Generate Users'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
                <Input
                    placeholder="Filter by name, ID, or email..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="max-w-sm"
                />
                <Select value={filters.accessLevel} onValueChange={(v) => handleFilterChange('accessLevel', v)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by access level..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Access Levels</SelectItem>
                        {accessLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
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
                        checked={filteredAndSortedUsers.length > 0 && selectedUsers.length === filteredAndSortedUsers.length}
                        onCheckedChange={(value) =>
                            setSelectedUsers(value ? filteredAndSortedUsers.map(item => item.id) : [])
                        }
                        aria-label="Select all"
                    />
                  </TableHead>
                  <SortableHeader columnId="empId">Emp ID</SortableHeader>
                  <SortableHeader columnId="name">Name</SortableHeader>
                  <SortableHeader columnId="email">Email</SortableHeader>
                  <SortableHeader columnId="accessLevel">Access Level</SortableHeader>
                  <SortableHeader columnId="isEnabled">Enabled</SortableHeader>
                  <SortableHeader columnId="costAmount">Annual Cost</SortableHeader>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedUsers.map((user) => (
                  <TableRow key={user.id} data-state={selectedUsers.includes(user.id) && "selected"}>
                    <TableCell>
                        <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(value) =>
                                setSelectedUsers(
                                    value
                                    ? [...selectedUsers, user.id]
                                    : selectedUsers.filter((id) => id !== user.id)
                                )
                            }
                            aria-label="Select row"
                        />
                    </TableCell>
                    <TableCell className="font-medium">{user.empId}</TableCell>
                    <TableCell>{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.accessLevel || 'N/A'}</TableCell>
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
                    <TableCell>
                      {user.costCurrency && user.costAmount !== undefined ? (
                        <span>
                          {user.costCurrency} {user.costAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingUser(user)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                   <FormField control={form.control} name="accessLevel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Level</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an access level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accessLevels.map(level => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
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
                            type="number"
                            placeholder="0"
                            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none shadow-none h-full bg-transparent px-3"
                            {...field}
                            value={field.value ?? ''}
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
    </>
  );
}


