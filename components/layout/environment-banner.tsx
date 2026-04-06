"use client";

import { getProvisumEnvClient, type ProvisumEnv } from "@/lib/env";

const BANNER_CONFIG: Record<ProvisumEnv, { label: string; className: string } | null> = {
  production: null,
  demo: {
    label: "Demo Environment — data resets periodically",
    className: "bg-blue-600 text-white",
  },
  sandbox: {
    label: "Sandbox Environment — upload your own data to explore",
    className: "bg-purple-600 text-white",
  },
  preview: {
    label: "Preview Deployment — connected to demo database",
    className: "bg-amber-500 text-white",
  },
  development: {
    label: "Local Development",
    className: "bg-gray-600 text-white",
  },
};

export function EnvironmentBanner() {
  const env = getProvisumEnvClient();
  const config = BANNER_CONFIG[env];
  if (!config) return null;

  return (
    <div className={`${config.className} text-center text-xs font-medium py-1 px-4`}>
      {config.label}
    </div>
  );
}
