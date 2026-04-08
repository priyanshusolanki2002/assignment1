"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
  CalendarClock,
  Database,
  Filter,
  type LucideIcon,
  LayoutDashboard,
  ListTodo,
  LogIn,
  Shield,
  SquarePen,
  UserPlus
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  return (
    <main className="mx-auto mt-8 w-full max-w-6xl min-w-0 px-4 pb-16 font-sans">
      <div className="grid min-w-0 items-start gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="order-2 min-w-0 overflow-x-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:order-1">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <LayoutDashboard className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-semibold tracking-tight text-slate-900">Smart Task Manager Dashboard</h1>
              <p className="mt-1 max-w-xl break-words text-slate-600">
                Sign in or create an account to start managing your tasks. Assign tasks to yourself or others, set due dates, and more.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Feature icon={Shield} title="Auth (JWT)" desc="Secure signup and login." />
            <Feature icon={ListTodo} title="Task board" desc="Todo, In Progress, Done." />
            <Feature icon={CalendarClock} title="Scheduling" desc="Priorities and due dates." />
            <Feature icon={Filter} title="Filters" desc="Search and narrow your list." />
            <Feature icon={SquarePen} title="CRUD" desc="Create, update, and delete tasks." />
            <Feature icon={Database} title="MongoDB" desc="Persist users and tasks." />
          </div>
        </div>

        <div className="order-1 flex min-w-0 items-stretch lg:order-2">
          <div className="flex w-full flex-col justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Get started</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Sign in or create an account on the dedicated pages below.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/login"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{desc}</div>
        </div>
      </div>
    </div>
  );
}
