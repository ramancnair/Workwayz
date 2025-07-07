import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/SidebarNav";
import { PropsWithChildren } from "react";

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <div className="bg-background">
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <SidebarInset>
          <div className="min-h-screen">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
