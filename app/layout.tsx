import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Provisum — Intelligent Role Mapping for Enterprise Migrations",
  description: "Intelligent role mapping for enterprise migrations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = getSessionUser();

  // If no user (login/setup pages), render without sidebar
  if (!user) {
    return (
      <html lang="en">
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    );
  }

  const releases = getReleasesForAppUser(user);
  const cookieReleaseId = parseInt(cookies().get("airm_release_id")?.value ?? "") || null;
  const selectedReleaseId = releases.some((r) => r.id === cookieReleaseId) ? cookieReleaseId : null;
  const unreadNotificationCount = getUnreadNotificationCount(user.id);

  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
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
