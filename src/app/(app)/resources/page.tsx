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
import { DatePicker } from '@/components/ui/datepicker';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { type Employee } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const employeeFormSchema = z.object({
  empId: z.string().min(1, 'Employee ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  clientEmpId: z.string().optional(),
  clientEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  role: z.string().optional(),
  experience: z.coerce.number().optional(),
  onboardingDate: z.date().optional(),
  offloadingDate: z.date().optional(),
  onshoreOrOffshore: z.enum(['Onshore', 'Offshore']).optional(),
  billedRate: z.coerce.number().optional(),
  availability: z.coerce.number().min(0).max(100, 'Availability cannot exceed 100%').optional(),
});

export default function ResourcesPage() {
  const { employees, setEmployees } = useProject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  const form = useForm<z.infer<typeof employeeFormSchema>>({
    resolver: zodResolver(employeeFormSchema),
  });

  useEffect(() => {
    if (editingEmployee) {
      form.reset({
        ...editingEmployee,
        onboardingDate: editingEmployee.onboardingDate ? new Date(editingEmployee.onboardingDate) : undefined,
        offloadingDate: editingEmployee.offloadingDate ? new Date(editingEmployee.offloadingDate) : undefined,
      });
    } else {
      form.reset({
        empId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        clientEmpId: '',
        clientEmail: '',
        role: '',
        experience: undefined,
        onboardingDate: undefined,
        offloadingDate: undefined,
        billedRate: undefined,
        availability: undefined,
      });
    }
  }, [editingEmployee, form]);

  const handleDialogOpen = (employee: Employee | null) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleDelete = (employee: Employee) => {
    setEmployees(employees.filter((e) => e.id !== employee.id));
    setDeletingEmployee(null);
  };

  const onSubmit = (values: z.infer<typeof employeeFormSchema>) => {
    const employeeData = {
      ...values,
      onboardingDate: values.onboardingDate?.toISOString(),
      offloadingDate: values.offloadingDate?.toISOString(),
    };

    if (editingEmployee) {
      // Update existing employee
      setEmployees(
        employees.map((e) => (e.id === editingEmployee.id ? { ...e, ...employeeData } : e))
      );
    } else {
      // Add new employee
      setEmployees([...employees, { id: crypto.randomUUID(), ...employeeData }]);
    }
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Resources" description="Manage project employees.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
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
              {employees.map((employee) => (
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
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingEmployee(null); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? 'Update the details for this employee.' : 'Fill in the details for the new employee.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Mandatory Fields */}
                <FormField control={form.control} name="empId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID *</FormLabel>
                    <FormControl><Input placeholder="E12345" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl><Input placeholder="Developer" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 {/* Optional Fields */}
                <FormField control={form.control} name="clientEmpId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Employee ID</FormLabel>
                    <FormControl><Input placeholder="C54321" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="clientEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Email</FormLabel>
                    <FormControl><Input type="email" placeholder="john.client@example.com" {...field} value={field.value ?? ''} /></FormControl>
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
                <FormField control={form.control} name="onboardingDate" render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Onboarding Date</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="offloadingDate" render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Offloading Date</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="onshoreOrOffshore" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Onshore">Onshore</SelectItem>
                        <SelectItem value="Offshore">Offshore</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="billedRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Billed Rate ($)</FormLabel>
                    <FormControl><Input type="number" placeholder="5000" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="availability" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability (%)</FormLabel>
                    <FormControl><Input type="number" placeholder="100" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="submit">{editingEmployee ? 'Save Changes' : 'Create Employee'}</Button>
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
            <AlertDialogAction onClick={() => deletingEmployee && handleDelete(deletingEmployee)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
