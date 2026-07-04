import { type PropsWithChildren } from "react";

interface PageHeaderProps extends PropsWithChildren {
  title: string;
  description: string;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{children}</div>
      )}
    </div>
  );
}
