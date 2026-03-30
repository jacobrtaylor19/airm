export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CalibrationClient from "./calibration-client";

export default async function CalibrationPage() {
  const user = await requireAuth();

  // Only mappers, admins, system_admins can calibrate
  if (!["system_admin", "admin", "mapper"].includes(user.role)) {
    redirect("/unauthorized");
  }

  return <CalibrationClient userRole={user.role} />;
}
