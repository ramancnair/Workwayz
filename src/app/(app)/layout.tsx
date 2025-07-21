
import { type PropsWithChildren } from "react";

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
