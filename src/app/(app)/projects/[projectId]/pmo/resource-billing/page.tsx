
'use client';

import { useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { type User } from '@/types';

export default function ResourceBillingPage() {
  const { employees, updateProjectUser } = useProject();
  const { toast } = useToast();
  const [editingRates, setEditingRates] = useState<Record<string, { billedRate?: number; costRate?: number }>>({});

  const handleRateChange = (userId: string, field: 'billedRate' | 'costRate', value: string) => {
    const numericValue = value === '' ? undefined : parseFloat(value);
    setEditingRates(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: numericValue,
      }
    }));
  };
  
  const handleSaveChanges = async (userId: string) => {
    const user = employees.find(e => e.id === userId);
    const rates = editingRates[userId];

    if (!user || !rates) return;

    // We only update if the value has actually changed to a valid number or undefined
    const payload: Partial<User> = {};
    if (rates.billedRate !== user.billedRate) {
        payload.billedRate = rates.billedRate;
    }
    
    // The 'costRate' field is not on the User type, so we cannot save it.
    // I will assume 'cost' maps to 'billedRate' for now.
    // If you add a costRate field to the User type, I can update this.

    if (Object.keys(payload).length === 0) {
        toast({ title: 'No Changes', description: 'There were no new values to save.' });
        return;
    }

    const success = await updateProjectUser(userId, payload);
    if (success) {
      toast({ title: 'Success', description: 'Rates updated successfully.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update rates.' });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Resource Billing" description="Manage billed and cost rates for project resources." />
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Utilization (%)</TableHead>
                <TableHead>Billed Rate (USD/Day)</TableHead>
                <TableHead>Cost Rate (USD/Day)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.role || 'N/A'}</TableCell>
                  <TableCell>{user.availability || 100}%</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Enter rate"
                      value={editingRates[user.id]?.billedRate ?? user.billedRate ?? ''}
                      onChange={(e) => handleRateChange(user.id, 'billedRate', e.target.value)}
                      onBlur={() => handleSaveChanges(user.id)}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                     <Input
                      type="number"
                      placeholder="Enter rate"
                      value={editingRates[user.id]?.costRate ?? 'N/A' }
                      onChange={(e) => handleRateChange(user.id, 'costRate', e.target.value)}
                      // onBlur={() => handleSaveChanges(user.id)} // Cannot save cost rate
                      className="w-32"
                      readOnly // Cannot save this field yet.
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
