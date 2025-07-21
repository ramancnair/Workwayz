
'use client';

import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PmSidebarNav } from "@/components/PmSidebarNav";
import { type PropsWithChildren } from "react";

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <PmSidebarNav />
      </Sidebar>
      <SidebarInset>
        <div className="h-screen flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
