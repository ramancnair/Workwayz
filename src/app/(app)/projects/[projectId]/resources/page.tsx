
'use client';

import { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { type Employee } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ResourcesPage() {
  const { employees: projectEmployees, addEmployee, deleteEmployee: removeEmployeeFromProject } = useProject();
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

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

  const handleAddEmployeeToProject = async () => {
    if (!selectedEmployeeId) {
      toast({ variant: "destructive", title: "Error", description: "Please select an employee to add." });
      return;
    }
    
    const employeeToAdd = allEmployees.find(emp => emp.id === selectedEmployeeId);
    if (!employeeToAdd) {
        toast({ variant: "destructive", title: "Error", description: "Selected employee not found." });
        return;
    }
    
    // The addEmployee function in context now handles adding a resource *to the project*
    const success = await addEmployee(employeeToAdd);

    if (success) {
      toast({ title: "Success", description: `${employeeToAdd.firstName} added to the project.` });
      setIsDialogOpen(false);
      setSelectedEmployeeId('');
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not add employee to project. They may already be on the team.` });
    }
  };

  const availableEmployees = allEmployees.filter(emp => !projectEmployees.some(pe => pe.id === emp.id));

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Resources" description="Manage employees assigned to this project.">
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Employee to Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee from the global list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.empId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddEmployeeToProject} className="w-full">
                  Add to Project
                </Button>
              </div>
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
