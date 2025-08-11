

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { type User, type OnshoreOffshore, type UserRole } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buttonVariants } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

const resourceSchema = z.object({
  employeeId: z.string().min(1, 'Please select a user.'),
  role: z.string().optional(),
  availability: z.coerce.number().min(0).max(100).optional(),
  onshoreOrOffshore: z.enum(['Onshore', 'Offshore']).optional(),
  onboardingDate: z.string().optional(),
  offloadingDate: z.string().optional(),
});

const roles: UserRole[] = ['Developer', 'Tester', 'Architect', 'BA', 'PM'];
const onshoreOffshoreOptions: OnshoreOffshore[] = ['Onshore', 'Offshore'];

export default function ResourcesPage() {
  const { 
    project,
    employees: projectUsers, 
    addEmployee: addUserToProject, 
    updateEmployee: updateProjectUser,
    deleteEmployee: removeUserFromProject 
  } = useProject();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userInputText, setUserInputText] = useState('');
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const form = useForm<z.infer<typeof resourceSchema>>({
    resolver: zodResolver(resourceSchema),
  });

  useEffect(() => {
    if (!db) return;
    const q = collection(db, 'employees');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const usersData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as User));
        setAllUsers(usersData);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if(isDialogOpen) {
      if (editingUser) {
        form.reset({
          employeeId: editingUser.id,
          role: editingUser.role,
          availability: editingUser.availability,
          onshoreOrOffshore: editingUser.onshoreOrOffshore,
          onboardingDate: editingUser.onboardingDate ? format(new Date(editingUser.onboardingDate), 'yyyy-MM-dd') : '',
          offloadingDate: editingUser.offloadingDate ? format(new Date(editingUser.offloadingDate), 'yyyy-MM-dd') : '',
        });
      } else {
        form.reset({
          employeeId: '',
          role: undefined,
          availability: 100,
          onshoreOrOffshore: undefined,
          onboardingDate: format(new Date(), 'yyyy-MM-dd'),
          offloadingDate: project?.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : '',
        });
        setUserInputText('');
      }
    }
  }, [isDialogOpen, editingUser, form, project]);

  const handleFormSubmit = async (values: z.infer<typeof resourceSchema>) => {
    if (editingUser) {
      // Update existing user
      const success = await updateProjectUser(editingUser.id, {
        role: values.role as UserRole,
        availability: values.availability,
        onshoreOrOffshore: values.onshoreOrOffshore,
        onboardingDate: values.onboardingDate ? new Date(values.onboardingDate).toISOString() : undefined,
        offloadingDate: values.offloadingDate ? new Date(values.offloadingDate).toISOString() : undefined,
      });

      if (success) {
        toast({ title: "Success", description: `${editingUser.firstName}'s details updated.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Could not update user.` });
      }
    } else {
      // Add new user
      const userToAdd = allUsers.find(emp => emp.id === values.employeeId);
      if (!userToAdd) {
          toast({ variant: "destructive", title: "Error", description: "Selected user not found." });
          return;
      }
      
      const projectUserData: User = {
        ...userToAdd,
        role: values.role as UserRole,
        availability: values.availability,
        onshoreOrOffshore: values.onshoreOrOffshore,
        onboardingDate: values.onboardingDate ? new Date(values.onboardingDate).toISOString() : undefined,
        offloadingDate: values.offloadingDate ? new Date(values.offloadingDate).toISOString() : undefined,
      };
      
      const success = await addUserToProject(projectUserData);

      if (success) {
        toast({ title: "Success", description: `${userToAdd.firstName} added to the project.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Could not add user to project. They may already be on the team.` });
      }
    }
    
    setIsDialogOpen(false);
    setEditingUser(null);
  };
  
  const handleOpenDialog = (user: User | null) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  }

  const availableUsers = allUsers.filter(emp => !projectUsers.some(pe => pe.id === emp.id));
  const availableUserOptions = availableUsers.map(emp => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.empId})`
  }));

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Resources" description="Manage users assigned to this project.">
           <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setEditingUser(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit Resource' : 'Add User to Project'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                         <FormControl>
                           <Input 
                              list="user-options"
                              placeholder="Search for a user..."
                              value={editingUser ? `${editingUser.firstName} ${editingUser.lastName}` : userInputText}
                              readOnly={!!editingUser}
                              onChange={(e) => {
                                  if (editingUser) return;
                                  const inputText = e.target.value;
                                  setUserInputText(inputText);

                                  const matchingOption = availableUserOptions.find(opt => opt.label === inputText);
                                  field.onChange(matchingOption ? matchingOption.value : '');
                              }}
                              onBlur={(e) => {
                                  if (editingUser) return;
                                  const matchingOption = availableUserOptions.find(opt => opt.label === e.target.value);
                                  if(!matchingOption) {
                                      setUserInputText('');
                                      field.onChange('');
                                  }
                              }}
                           />
                          </FormControl>
                          <datalist id="user-options">
                              {availableUserOptions.map(emp => (
                                  <option key={emp.value} value={emp.label} />
                              ))}
                          </datalist>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="availability" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Availability (%)</FormLabel>
                        <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="onshoreOrOffshore" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select location type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {onshoreOffshoreOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="onboardingDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Onboarding Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  
                  <FormField control={form.control} name="offloadingDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offloading Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <DialogFooter>
                    <Button type="submit">
                      {editingUser ? 'Save Changes' : 'Add to Project'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Onboarding Date</TableHead>
                <TableHead>Offloading Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.empId}</TableCell>
                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.role || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.availability ? `${user.availability}%` : 'N/A'}</TableCell>
                  <TableCell>
                    {user.onshoreOrOffshore && <Badge variant={user.onshoreOrOffshore === 'Onshore' ? 'default' : 'secondary'}>{user.onshoreOrOffshore}</Badge>}
                  </TableCell>
                  <TableCell>{user.onboardingDate ? format(parseISO(user.onboardingDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>{user.offloadingDate ? format(parseISO(user.offloadingDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
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
        </Card>
      </div>
      
      <AlertDialog open={!!deletingUser} onOpenChange={(isOpen) => !isOpen && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deletingUser?.firstName} {deletingUser?.lastName} from this project. It will not delete their global user record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if(deletingUser) {
                  removeUserFromProject(deletingUser.id).then(success => {
                    if (success) {
                      toast({ title: "Success", description: "User removed from project." });
                    } else {
                      toast({ variant: "destructive", title: "Error", description: "Could not remove user." });
                    }
                    setDeletingUser(null);
                  })
                }
              }}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
