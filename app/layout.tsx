import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getSessionUser } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { ChatWidget } from "@/components/chat/chat-widget";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";
import { cookies } from "next/headers";
import { getReleasesForAppUser } from "@/lib/releases";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { validateEnv } from "@/lib/validate-env";

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

  return (
    <html lang="en">
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar userRole={user.role} userName={user.displayName} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header user={user} releases={releases} selectedReleaseId={selectedReleaseId} unreadNotificationCount={unreadNotificationCount} />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
        <ChatWidget userRole={user.role} userName={user.displayName} />
        <WelcomeTour userRole={user.role} userName={user.displayName} />
        <Toaster />
      </body>
    </html>
  );
}
