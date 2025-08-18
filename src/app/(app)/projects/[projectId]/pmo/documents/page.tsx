
import { PageHeader } from '@/components/PageHeader';

export default function DocumentsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Documents" description="Manage project documents." />
        <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Under Construction</p>
        </div>
    </div>
  );
}
