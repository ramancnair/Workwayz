import { type PropsWithChildren, type ReactNode } from "react";

interface PageHeaderProps extends PropsWithChildren {
  title: ReactNode;
  description: string;
  titleAddon?: ReactNode;
}

export function PageHeader({ title, description, titleAddon, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
          {titleAddon}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{children}</div>
      )}
    </div>
  );
}
