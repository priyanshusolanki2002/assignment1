"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost, type AuthResponse } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";
import { AuthCard } from "@/components/AuthCard";
import { IndeterminateProgressBar } from "@/components/IndeterminateProgressBar";
import { PasswordField } from "@/components/PasswordField";
import { AlertCircle, KeyRound, Loader2, LogIn, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiPost<AuthResponse>("/auth/login", { email, password });
      setToken(res.token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100/80 to-white px-4 py-10 sm:px-6 sm:py-12">
    <AuthCard>
      <h1 className="text-2xl font-semibold text-slate-900">Login</h1>
      <p className="mt-1 text-sm text-slate-600">Welcome back.</p>

      {submitting ? (
        <div className="mt-4 overflow-hidden rounded-lg">
          <IndeterminateProgressBar slim label="Signing in" />
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            Email
          </span>
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-slate-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <PasswordField
          label={
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              Password
            </span>
          }
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
          {submitting ? "Signing in…" : "Login"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        No account?{" "}
        <Link className="font-medium text-slate-900 underline underline-offset-4" href="/signup">
          Signup
        </Link>
        {" · "}
        <Link className="font-medium text-slate-900 underline underline-offset-4" href="/">
          Home
        </Link>
      </p>

      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </AuthCard>
    </div>
  );
}

