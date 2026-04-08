"use client";

import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import { IndeterminateProgressBar } from "@/components/IndeterminateProgressBar";
import { PasswordField } from "@/components/PasswordField";
import { CheckCircle2, KeyRound, Loader2, Mail, Settings, User, X } from "lucide-react";

type MeResponse = { user?: { id: string; email: string; name?: string } };

const inputClass =
  "mt-1.5 block h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10";

const primaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-md shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/25 disabled:pointer-events-none disabled:opacity-45";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
  sessionReady: boolean;
  email: string | null;
  initialName: string;
  onProfileSaved: (name: string) => void;
};

export function UserSettingsDialog({
  open,
  onOpenChange,
  token,
  sessionReady,
  email,
  initialName,
  onProfileSaved
}: Props) {
  const [name, setName] = useState(initialName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setNameMsg(null);
    setNameErr(null);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setPwMsg(null);
    setPwErr(null);
  }, [open, initialName]);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const trimmed = name.trim();
    setNameErr(null);
    setNameMsg(null);
    if (trimmed.length < 1 || trimmed.length > 200) {
      setNameErr("Name must be between 1 and 200 characters.");
      return;
    }
    setNameSaving(true);
    try {
      const res = await apiPost<MeResponse>("/auth/profile", { name: trimmed }, token);
      const next = res.user?.name ?? trimmed;
      onProfileSaved(next);
      setName(next);
      setNameMsg("Saved.");
    } catch (err) {
      setNameErr(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setNameSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPwErr(null);
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwErr("New passwords do not match.");
      return;
    }
    if (newPw.length < 8 || newPw.length > 200) {
      setPwErr("New password must be between 8 and 200 characters.");
      return;
    }
    setPwSaving(true);
    try {
      await apiPost<{ ok?: boolean }>(
        "/auth/password",
        { currentPassword: currentPw, newPassword: newPw },
        token
      );
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg("Password updated.");
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPwSaving(false);
    }
  }

  function close() {
    if (nameSaving || pwSaving) return;
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="tm-modal-root" role="presentation">
      <div className="tm-modal-center">
        <div className="tm-modal-backdrop-dim pointer-events-auto" aria-hidden />
        <div
          className="pointer-events-auto relative z-10 my-auto flex max-h-[min(90dvh,720px,calc(100dvh-2rem))] w-full max-w-[440px] min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white shadow-[0_25px_60px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.04]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-settings-title"
          aria-describedby="user-settings-desc"
        >
        {nameSaving || pwSaving ? (
          <div className="relative z-30 shrink-0">
            <IndeterminateProgressBar slim label="Saving settings" />
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-100/90 via-slate-50/40 to-transparent" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-slate-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 top-24 h-32 w-32 rounded-full bg-slate-300/20 blur-3xl" />

        <div className="relative min-w-0 shrink-0 border-b border-slate-200/60 bg-white/70 px-6 pb-5 pt-6 backdrop-blur-sm">
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <div className="flex gap-4 pr-10">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg shadow-slate-900/30">
              <Settings className="h-7 w-7" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 id="user-settings-title" className="break-words text-xl font-semibold tracking-tight text-slate-900">
                User settings
              </h2>
              <p id="user-settings-desc" className="mt-1 break-words text-sm leading-relaxed text-slate-500">
                Keep your profile and sign-in details up to date.
              </p>
            </div>
          </div>
        </div>

        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 py-5 sm:px-6">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  <User className="h-4 w-4 text-slate-600" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Profile</h3>
                  <p className="text-xs text-slate-500">Name shown across the app</p>
                </div>
              </div>

              <form onSubmit={onSaveProfile} className="flex flex-col gap-4">
                {email ? (
                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      Email
                    </span>
                    <p className="mt-2 break-all rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-sm text-slate-600 shadow-inner shadow-slate-900/[0.03]">
                      {email}
                    </p>
                  </div>
                ) : null}

                <label className="block text-sm font-medium text-slate-600">
                  Display name
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameMsg(null);
                      setNameErr(null);
                    }}
                    autoComplete="name"
                    maxLength={200}
                    placeholder="Your name"
                  />
                </label>

                {nameErr && (
                  <p
                    className="rounded-xl border border-red-100 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-700"
                    role="alert"
                  >
                    {nameErr}
                  </p>
                )}
                {nameMsg && (
                  <p className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    {nameMsg}
                  </p>
                )}

                <button type="submit" disabled={!sessionReady || nameSaving || !token} className={primaryBtn}>
                  {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {nameSaving ? "Saving…" : "Save name"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  <KeyRound className="h-4 w-4 text-slate-600" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Password</h3>
                  <p className="text-xs text-slate-500">Confirm your current password to change it</p>
                </div>
              </div>

              <form onSubmit={onChangePassword} className="flex flex-col gap-4">
                <PasswordField
                  label="Current password"
                  value={currentPw}
                  onChange={(v) => {
                    setCurrentPw(v);
                    setPwErr(null);
                    setPwMsg(null);
                  }}
                  autoComplete="current-password"
                  id="settings-current-pw"
                  inputClassName="border-slate-200/90 shadow-sm"
                />
                <PasswordField
                  label="New password"
                  value={newPw}
                  onChange={(v) => {
                    setNewPw(v);
                    setPwErr(null);
                    setPwMsg(null);
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  id="settings-new-pw"
                  inputClassName="border-slate-200/90 shadow-sm"
                />
                <PasswordField
                  label="Confirm new password"
                  value={confirmPw}
                  onChange={(v) => {
                    setConfirmPw(v);
                    setPwErr(null);
                    setPwMsg(null);
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  id="settings-confirm-pw"
                  inputClassName="border-slate-200/90 shadow-sm"
                />

                {pwErr && (
                  <p
                    className="rounded-xl border border-red-100 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-700"
                    role="alert"
                  >
                    {pwErr}
                  </p>
                )}
                {pwMsg && (
                  <p className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/90 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    {pwMsg}
                  </p>
                )}

                <button type="submit" disabled={!sessionReady || pwSaving || !token} className={primaryBtn}>
                  {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {pwSaving ? "Updating…" : "Update password"}
                </button>
              </form>
            </section>
          </div>
        </div>

        <div className="relative shrink-0 border-t border-slate-200/70 bg-slate-50/80 px-6 py-4 backdrop-blur-sm">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={close}
              disabled={nameSaving || pwSaving}
              className="rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-45"
            >
              Done
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
