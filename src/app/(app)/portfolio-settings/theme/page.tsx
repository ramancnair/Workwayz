
import { PageHeader } from '@/components/PageHeader';

export default function ThemePage() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Theme</h3>
        <p className="text-sm text-muted-foreground">Customize the look and feel of the application.</p>
      </div>
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <p className="text-muted-foreground">Theme customization options will be available here.</p>
      </div>
    </div>
  );
}
