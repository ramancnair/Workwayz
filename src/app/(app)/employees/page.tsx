
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { type Employee } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';

const employeeFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  experience: z.coerce.number().optional(),
  domainExpertise: z.string().optional(),
  employmentStartDate: z.string().optional(),
  employmentEndDate: z.string().optional(),
});

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof employeeFormSchema>>({
    resolver: zodResolver(employeeFormSchema),
  });
  
  useEffect(() => {
    if (!db) return;
    const q = collection(db, 'employees');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const employeesData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                employmentStartDate: data.employmentStartDate?.toDate ? data.employmentStartDate.toDate().toISOString() : data.employmentStartDate,
                employmentEndDate: data.employmentEndDate?.toDate ? data.employmentEndDate.toDate().toISOString() : data.employmentEndDate,
            } as Employee;
        });
        setEmployees(employeesData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
        if (editingEmployee) {
        form.reset({
            ...editingEmployee,
            employmentStartDate: editingEmployee.employmentStartDate ? format(parseISO(editingEmployee.employmentStartDate), 'yyyy-MM-dd') : '',
            employmentEndDate: editingEmployee.employmentEndDate ? format(parseISO(editingEmployee.employmentEndDate), 'yyyy-MM-dd') : '',
        });
        } else {
        form.reset({
            firstName: '',
            lastName: '',
            phone: '',
            experience: undefined,
            domainExpertise: '',
            employmentStartDate: '',
            employmentEndDate: '',
        });
        }
    }
  }, [isDialogOpen, editingEmployee, form]);

  const handleDialogOpen = (employee: Employee | null) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEmployee || !db) return;
    try {
      await deleteDoc(doc(db, 'employees', deletingEmployee.id));
      toast({ title: "Success", description: "Employee record deleted." });
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast({ variant: "destructive", title: "Error", description: "Could not delete employee." });
    }
    setDeletingEmployee(null);
  };

  const onSubmit = async (values: z.infer<typeof employeeFormSchema>) => {
    if (!db) return;
    setIsSubmitting(true);
    
    const sanitizedValues: any = { ...values };
    if (values.employmentStartDate) {
        sanitizedValues.employmentStartDate = new Date(values.employmentStartDate);
    } else {
        delete sanitizedValues.employmentStartDate;
    }
    if (values.employmentEndDate) {
        sanitizedValues.employmentEndDate = new Date(values.employmentEndDate);
    } else {
        delete sanitizedValues.employmentEndDate;
    }
    
    try {
      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id), sanitizedValues);
        toast({ title: "Success", description: `Employee updated successfully.` });
      } else {
        const snapshot = await getDocs(collection(db, 'employees'));
        const newIdNumber = snapshot.size > 0
            ? Math.max(0, ...snapshot.docs
                .map(doc => doc.data().empId)
                .filter((id: string | undefined) => id && typeof id === 'string')
                .map((id: string) => parseInt(id.replace('E', ''), 10) || 0)
            ) + 1
            : 1;

        const email = `${values.firstName.toLowerCase()}.${values.lastName.toLowerCase()}@example.com`;
        await addDoc(collection(db, 'employees'), { 
            ...sanitizedValues, 
            email, 
            empId: `E${newIdNumber}`,
            avatar: 'https://placehold.co/40x40.png'
        });
        toast({ title: "Success", description: `Employee added successfully.` });
      }
      setIsDialogOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error("Error saving employee", error);
      toast({ variant: "destructive", title: "Error", description: `Could not save employee.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Employees" description="Manage all employees in the organization.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emp ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.empId}</TableCell>
                    <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.phone}</TableCell>
                    <TableCell>{employee.experience ? `${employee.experience} yrs` : 'N/A'}</TableCell>
                    <TableCell>{employee.domainExpertise || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(employee)}>
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
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingEmployee(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                 <FormField control={form.control} name="domainExpertise" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain Expertise</FormLabel>
                    <FormControl><Input placeholder="e.g. Frontend, Payments" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div></div>
                <FormField control={form.control} name="employmentStartDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="employmentEndDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingEmployee ? 'Saving...' : 'Creating...') : (editingEmployee ? 'Save Changes' : 'Create Employee')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingEmployee} onOpenChange={(isOpen) => !isOpen && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee record for {deletingEmployee?.firstName} {deletingEmployee?.lastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
