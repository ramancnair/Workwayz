import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function CriticalPathMethodPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6 overflow-auto">
      <PageHeader 
        title="Critical Path Method (CPM)" 
        description="Analyze the longest sequence of dependent tasks and measure the time required to complete the project." 
      />
      
      <Card className="mt-8 border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Construction className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Under Construction</h2>
          <p className="text-muted-foreground max-w-md">
            The Critical Path Method analysis page is currently being built. Check back soon for updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
