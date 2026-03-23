
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PortfolioSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabChange = (value: string) => {
    router.push(`/portfolio-settings/${value}`);
  };

  const activeTab = pathname.split('/').pop() || 'access-settings';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Portfolio Settings"
        description="Manage global settings for all portfolios and projects."
      />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="access-settings">Access Settings</TabsTrigger>
        </TabsList>
        <div>{children}</div>
      </Tabs>
    </div>
  );
}
