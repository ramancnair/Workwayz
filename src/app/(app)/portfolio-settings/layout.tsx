
'use client';

export default function PortfolioSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 min-w-0 w-full overflow-x-hidden">
      {children}
    </div>
  );
}
