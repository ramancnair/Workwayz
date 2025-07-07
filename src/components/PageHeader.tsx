import { type PropsWithChildren } from "react";

interface PageHeaderProps extends PropsWithChildren {
  title: string;
  description: string;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center space-x-2">{children}</div>
    </div>
  );
}
