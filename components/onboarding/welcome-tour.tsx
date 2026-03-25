"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserCog,
  ArrowRight,
  MessageCircle,
  Rocket,
  Upload,
  Users,
  GitBranch,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

interface WelcomeTourProps {
  userRole: string;
  userName: string;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin:
    "As an administrator, you have full access to all features. You can manage users, configure settings, and oversee the entire mapping workflow.",
  system_admin:
    "As an administrator, you have full access to all features. You can manage users, configure settings, and oversee the entire mapping workflow.",
  mapper:
    "As a mapper, you'll be mapping personas to target roles for your department. You can run AI analysis and submit mappings for approval.",
  approver:
    "As an approver, you'll review and approve role mappings submitted by mappers in your department.",
  coordinator:
    "As a coordinator, you oversee mapping progress across your area and can manage assignments.",
  viewer:
    "You have read-only access to view mapping progress and reports.",
};

const WORKFLOW_STAGES = [
  { icon: Upload, label: "Upload", desc: "Import source system data" },
  { icon: Users, label: "Personas", desc: "AI-generated user personas" },
  { icon: GitBranch, label: "Mapping", desc: "Map personas to target roles" },
  { icon: ShieldAlert, label: "SOD Analysis", desc: "Check segregation of duties" },
  { icon: CheckCircle2, label: "Approval", desc: "Review and approve mappings" },
];

export function WelcomeTour({ userRole, userName }: WelcomeTourProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (localStorage.getItem("provisum_tour_seen") === "true") return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const firstName = userName?.split(" ")[0] ?? "there";
  const totalSteps = 5;

  function close() {
    localStorage.setItem("provisum_tour_seen", "true");
    setVisible(false);
  }

  const stepContent = [
    // Step 0 — Welcome
    {
      icon: <ShieldCheck className="h-12 w-12 text-teal-500" />,
      title: `Welcome to Provisum, ${firstName}!`,
      body: "Let's take a quick look at how role mapping works.",
    },
    // Step 1 — Your Role
    {
      icon: <UserCog className="h-12 w-12 text-teal-500" />,
      title: "Your Role",
      body: ROLE_DESCRIPTIONS[userRole] ?? ROLE_DESCRIPTIONS.viewer,
    },
    // Step 2 — The Workflow
    {
      icon: null,
      title: "The Workflow",
      body: null, // custom render
    },
    // Step 3 — AI Assistant
    {
      icon: <MessageCircle className="h-12 w-12 text-teal-500" />,
      title: "AI Assistant",
      body: "The Provisum Assistant (teal button, bottom-right) can help you with questions about SOD rules, mapping suggestions, and workflow guidance. Try pressing Cmd+K anytime.",
    },
    // Step 4 — Get Started
    {
      icon: <Rocket className="h-12 w-12 text-teal-500" />,
      title: "You're All Set!",
      body: "Head to the Dashboard to see your project status.",
    },
  ];

  const current = stepContent[step];
  const isLast = step === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative mx-4 w-full max-w-lg rounded-xl bg-white p-8 shadow-2xl">
        {/* Content area with min height for consistency */}
        <div className="flex min-h-[260px] flex-col items-center text-center">
          {/* Icon */}
          {current.icon && <div className="mb-4">{current.icon}</div>}

          {/* Title */}
          <h2 className="mb-3 text-2xl font-bold text-slate-900">
            {current.title}
          </h2>

          {/* Body — custom for workflow step */}
          {step === 2 ? (
            <div className="mt-2 flex w-full flex-col gap-3">
              {WORKFLOW_STAGES.map((stage, i) => (
                <div key={stage.label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <stage.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-semibold text-slate-800">
                      {stage.label}
                    </span>
                    <span className="text-sm text-slate-500">
                      {stage.desc}
                    </span>
                  </div>
                  {i < WORKFLOW_STAGES.length - 1 && (
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="max-w-sm text-slate-500">{current.body}</p>
          )}
        </div>

        {/* Step dots */}
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === step ? "bg-indigo-600" : "bg-slate-300"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={close}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Skip Tour
          </button>
          {isLast ? (
            <button
              onClick={close}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
