
import { Sidebar, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/SidebarNav";
import { PropsWithChildren } from "react";
import { ProjectProvider } from "@/context/ProjectContext";

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <ProjectProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </ProjectProvider>
  );
}
