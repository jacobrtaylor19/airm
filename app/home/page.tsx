import { requireAuth } from "@/lib/auth";
import { getVisibleModules, getModuleDefaultRoute, getModuleNav } from "@/lib/modules";
import { TileLauncher } from "@/components/layout/tile-launcher";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireAuth();
  const visibleModules = getVisibleModules(user.role);

  // Enrich each module with the role-filtered default route and visible nav count
  const enriched = visibleModules.map((mod) => ({
    ...mod,
    defaultRoute: getModuleDefaultRoute(mod.id, user.role),
    nav: getModuleNav(mod.id, user.role),
  }));

  return (
    <TileLauncher
      modules={enriched}
      userName={user.displayName}
      userRole={user.role}
    />
  );
}
