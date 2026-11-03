"use client";

import { useApi, type User } from "@/lib/api";
import { AppSidebar } from "@/components/app-sidebar";
import { PageLoader } from "@/components/page-loader";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A 401 here sends the browser to /login (see lib/api.ts).
  const { data: user } = useApi<User>("me");
  if (!user) return <PageLoader />;

  return (
    <SidebarProvider>
      <AppSidebar userName={user.name} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:hidden">
          <SidebarTrigger />
          <span className="font-semibold">Hifz Tracker</span>
        </header>
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
