
'use client';

// This is a new page for sprint grooming.
// It will contain a two-column layout for dragging items from the backlog to sprints.
// For now, it's a placeholder. The full implementation will follow.

import { PageHeader } from '@/components/PageHeader';

export default function GroomingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Grooming Board"
        description="Drag and drop items from the backlog to sprints."
      />
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">Grooming page is under construction.</p>
      </div>
    </div>
  );
}
