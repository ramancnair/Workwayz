
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
import { type Employee, type OnshoreOffshore, type EmployeeRole } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buttonVariants } from '@/components/ui/button';
import { format } from 'date-fns';

const resourceSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee.'),
  role: z.string().optional(),
  availability: z.coerce.number().min(0).max(100).optional(),
  onshoreOrOffshore: z.enum(['Onshore', 'Offshore']).optional(),
  onboardingDate: z.string().optional(),
});

const roles: EmployeeRole[] = ['Developer', 'Tester', 'Architect', 'BA', 'PM'];
const onshoreOffshoreOptions: OnshoreOffshore[] = ['Onshore', 'Offshore'];

export default function ResourcesPage() {
  const { 
    employees: projectEmployees, 
    addEmployee: addEmployeeToProject, 
    updateEmployee: updateProjectEmployee,
    deleteEmployee: removeEmployeeFromProject 
  } = useProject();
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeInputText, setEmployeeInputText] = useState('');
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  const form = useForm<z.infer<typeof resourceSchema>>({
    resolver: zodResolver(resourceSchema),
  });

  useEffect(() => {
    if (!db) return;
    const q = collection(db, 'employees');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const employeesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Employee));
        setAllEmployees(employeesData);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if(isDialogOpen) {
      if (editingEmployee) {
        form.reset({
          employeeId: editingEmployee.id,
          role: editingEmployee.role,
          availability: editingEmployee.availability,
          onshoreOrOffshore: editingEmployee.onshoreOrOffshore,
          onboardingDate: editingEmployee.onboardingDate ? format(new Date(editingEmployee.onboardingDate), 'yyyy-MM-dd') : '',
        });
      } else {
        form.reset({
          employeeId: '',
          role: undefined,
          availability: 100,
          onshoreOrOffshore: undefined,
          onboardingDate: format(new Date(), 'yyyy-MM-dd'),
        });
        setEmployeeInputText('');
      }
    }
  }, [isDialogOpen, editingEmployee, form]);

  const handleFormSubmit = async (values: z.infer<typeof resourceSchema>) => {
    if (editingEmployee) {
      // Update existing employee
      const success = await updateProjectEmployee(editingEmployee.id, {
        role: values.role as EmployeeRole,
        availability: values.availability,
        onshoreOrOffshore: values.onshoreOrOffshore,
        onboardingDate: values.onboardingDate ? new Date(values.onboardingDate).toISOString() : undefined,
      });

      if (success) {
        toast({ title: "Success", description: `${editingEmployee.firstName}'s details updated.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Could not update employee.` });
      }
    } else {
      // Add new employee
      const employeeToAdd = allEmployees.find(emp => emp.id === values.employeeId);
      if (!employeeToAdd) {
          toast({ variant: "destructive", title: "Error", description: "Selected employee not found." });
          return;
      }
      
      const projectEmployeeData: Employee = {
        ...employeeToAdd,
        role: values.role as EmployeeRole,
        availability: values.availability,
        onshoreOrOffshore: values.onshoreOrOffshore,
        onboardingDate: values.onboardingDate ? new Date(values.onboardingDate).toISOString() : undefined,
      };
      
      const success = await addEmployeeToProject(projectEmployeeData);

      if (success) {
        toast({ title: "Success", description: `${employeeToAdd.firstName} added to the project.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Could not add employee to project. They may already be on the team.` });
      }
    }
    
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };
  
  const handleOpenDialog = (employee: Employee | null) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  }

  const availableEmployees = allEmployees.filter(emp => !projectEmployees.some(pe => pe.id === emp.id));
  const availableEmployeeOptions = availableEmployees.map(emp => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.empId})`
  }));

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Resources" description="Manage employees assigned to this project.">
           <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setEditingEmployee(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEmployee ? 'Edit Resource' : 'Add Employee to Project'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                         <FormControl>
                           <Input 
                              list="employee-options"
                              placeholder="Search for an employee..."
                              value={editingEmployee ? `${editingEmployee.firstName} ${editingEmployee.lastName}` : employeeInputText}
                              readOnly={!!editingEmployee}
                              onChange={(e) => {
                                  if (editingEmployee) return;
                                  const inputText = e.target.value;
                                  setEmployeeInputText(inputText);

                                  const matchingOption = availableEmployeeOptions.find(opt => opt.label === inputText);
                                  field.onChange(matchingOption ? matchingOption.value : '');
                              }}
                              onBlur={(e) => {
                                  if (editingEmployee) return;
                                  const matchingOption = availableEmployeeOptions.find(opt => opt.label === e.target.value);
                                  if(!matchingOption) {
                                      setEmployeeInputText('');
                                      field.onChange('');
                                  }
                              }}
                           />
                          </FormControl>
                          <datalist id="employee-options">
                              {availableEmployeeOptions.map(emp => (
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

                  <DialogFooter>
                    <Button type="submit">
                      {editingEmployee ? 'Save Changes' : 'Add to Project'}
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
                <TableHead>Emp ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.empId}</TableCell>
                  <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                  <TableCell>{employee.role || 'N/A'}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.availability ? `${employee.availability}%` : 'N/A'}</TableCell>
                  <TableCell>
                    {employee.onshoreOrOffshore && <Badge variant={employee.onshoreOrOffshore === 'Onshore' ? 'default' : 'secondary'}>{employee.onshoreOrOffshore}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(employee)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingEmployee(employee)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
      
      <AlertDialog open={!!deletingEmployee} onOpenChange={(isOpen) => !isOpen && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deletingEmployee?.firstName} {deletingEmployee?.lastName} from this project. It will not delete their global employee record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if(deletingEmployee) {
                  removeEmployeeFromProject(deletingEmployee.id).then(success => {
                    if (success) {
                      toast({ title: "Success", description: "Employee removed from project." });
                    } else {
                      toast({ variant: "destructive", title: "Error", description: "Could not remove employee." });
                    }
                    setDeletingEmployee(null);
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
