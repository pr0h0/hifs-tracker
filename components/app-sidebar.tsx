"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  BookOpenText,
  RotateCcw,
  Grid3X3,
  Settings,
  LogOut,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { logout } from "@/lib/api";

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "My Items", href: "/items", icon: BookOpenText },
  { title: "Daily Review", href: "/review", icon: RotateCcw },
  { title: "Juz View", href: "/juz", icon: Grid3X3 },
  { title: "Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  userName: string;
}

export function AppSidebar({ userName }: AppSidebarProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={() => setOpenMobile(false)}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              Hifz Tracker
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Quran Memorization
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href)
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[120px]">
              {userName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              title="Toggle theme"
            >
              <div className="relative h-4 w-4">
                <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </div>
              <span className="sr-only">Toggle theme</span>
            </button>
            <form action={logout}>
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
