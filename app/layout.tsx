import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { ChatWidget } from "@/components/chat/chat-widget";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";
import { cookies } from "next/headers";
import { getReleasesForAppUser } from "@/lib/releases";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { validateEnv } from "@/lib/validate-env";
import { MODULES, getVisibleModules, getModuleNav, getModuleDefaultRoute } from "@/lib/modules";

export const metadata: Metadata = {
  title: "Provisum — Intelligent Role Mapping for Enterprise Migrations",
  description: "Intelligent role mapping for enterprise migrations",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  validateEnv();
  const user = await getSessionUser();

  // If no user (login/setup/public pages), render with minimal nav
  if (!user) {
    return (
      <html lang="en">
        <body className={`${GeistSans.variable} font-sans antialiased`}>
          <nav className="flex items-center justify-between px-6 py-3 border-b bg-background">
            <a href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-brand-accent-dark">
              Provisum
              <span className="text-[10px] font-mono font-normal text-brand-text-light border border-brand-border rounded px-1.5 py-0.5">beta</span>
            </a>
            <div className="flex items-center gap-4 text-sm">
              <a href="/methodology" className="text-muted-foreground hover:text-foreground">How It Works</a>
              <a href="/overview" className="text-muted-foreground hover:text-foreground">Overview</a>
              <a href="/login" className="text-teal-600 font-medium hover:text-teal-700">Sign In</a>
            </div>
          </nav>
          {children}
        </body>
      </html>
    );
  }

  const releases = await getReleasesForAppUser(user);
  const cookieReleaseId = parseInt(cookies().get("airm_release_id")?.value ?? "") || null;
  const selectedReleaseId = releases.some((r) => r.id === cookieReleaseId) ? cookieReleaseId : null;
  const unreadNotificationCount = await getUnreadNotificationCount(user.id);

  // Build serializable module data for the client shell
  const visibleModules = getVisibleModules(user.role);
  const switcherModules = visibleModules.map((m) => ({
    id: m.id,
    label: m.label,
    iconName: m.iconName,
    color: m.color,
    defaultRoute: getModuleDefaultRoute(m.id, user.role),
  }));

  // Pre-compute nav for every module so the client shell can switch instantly
  const moduleNavMap: Record<string, ReturnType<typeof getModuleNav>> = {};
  for (const mod of MODULES) {
    moduleNavMap[mod.id] = getModuleNav(mod.id, user.role);
  }

  return (
    <html lang="en">
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        <AppShell
          user={user}
          releases={releases}
          selectedReleaseId={selectedReleaseId}
          unreadNotificationCount={unreadNotificationCount}
          allModules={switcherModules}
          moduleNavMap={moduleNavMap}
        >
          {children}
        </AppShell>
        <ChatWidget userRole={user.role} userName={user.displayName} />
        <WelcomeTour userRole={user.role} userName={user.displayName} />
        <Toaster />
      </body>
    </html>
  );
}
