"use client";

import type { ReactNode } from "react";
import { IndeterminateProgressBar } from "@/components/IndeterminateProgressBar";
import type { AssignableUser } from "@/lib/users";

export type AssigneePickerExtraOption = { value: string; title: string; subtitle: string };

type Props = {
  users: AssignableUser[];
  currentUserId: string | null;
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  /** True after a load attempt finished (success or failure). */
  loaded?: boolean;
  /** Set when GET /auth/users failed so we do not imply the team is empty. */
  loadError?: string | null;
  /** Extra rows after “Unassigned” (e.g. keep current assignee). */
  extraOptions?: AssigneePickerExtraOption[];
  /** Hide the “Unassigned” row (e.g. assignee is locked to another user for non-creators). */
  hideUnassigned?: boolean;
};

function initialFor(u: AssignableUser) {
  const s = (u.name.trim() || u.email).trim();
  const ch = s.charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

export function AssigneePicker({
  users,
  currentUserId,
  value,
  onChange,
  disabled,
  loaded = true,
  loadError = null,
  extraOptions,
  hideUnassigned = false
}: Props) {
  return (
    <div className="mt-2 space-y-2">
      {!loaded && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <IndeterminateProgressBar slim label="Loading users" />
          <p className="text-sm text-slate-500">Loading users…</p>
        </div>
      )}
      {loadError && (
        <p className="break-words rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          Could not load the user list: {loadError}. Rebuild or restart the API (<code className="rounded bg-amber-100/80 px-1 text-xs">npm run build</code> then{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs">npm start</code>) and confirm{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs">NEXT_PUBLIC_API_URL</code> points at it.
        </p>
      )}
      {loaded && (
        <div
          role="radiogroup"
          aria-label={hideUnassigned ? "Current assignee" : "Assign task to"}
          className="max-h-52 overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-lg border border-slate-200 bg-slate-50/50 p-1.5 shadow-inner"
        >
          {!hideUnassigned ? (
            <PickerRow
              selected={value === ""}
              onPick={() => onChange("")}
              disabled={disabled}
              title="Unassigned"
              subtitle="No one"
              leading={
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200/80 text-xs font-semibold text-slate-500">
                  —
                </span>
              }
            />
          ) : null}
          {extraOptions?.map((opt) => (
            <PickerRow
              key={opt.value}
              selected={value === opt.value}
              onPick={() => onChange(opt.value)}
              disabled={disabled}
              title={opt.title}
              subtitle={opt.subtitle}
              leading={
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900">
                  ⧗
                </span>
              }
            />
          ))}
          {!loadError &&
            users.map((u) => {
              const isMe = u.id === currentUserId;
              const title = u.name.trim() || u.email;
              return (
                <PickerRow
                  key={u.id}
                  selected={value === u.id}
                  onPick={() => onChange(u.id)}
                  disabled={disabled}
                  title={title}
                  subtitle={u.email}
                  leading={
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
                      {initialFor(u)}
                    </span>
                  }
                  badge={isMe ? "Me" : undefined}
                />
              );
            })}
        </div>
      )}
      {loaded &&
        !loadError &&
        users.length === 0 &&
        !(extraOptions && extraOptions.length > 0) &&
        !hideUnassigned && (
        <p className="text-xs text-slate-500">No other users yet. Sign up another account to assign tasks.</p>
      )}
    </div>
  );
}

function PickerRow({
  selected,
  onPick,
  disabled,
  title,
  subtitle,
  leading,
  badge
}: {
  selected: boolean;
  onPick: () => void;
  disabled?: boolean;
  title: string;
  subtitle: string;
  leading: ReactNode;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onPick}
      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors disabled:opacity-50 ${
        selected ? "bg-white shadow-sm ring-1 ring-slate-900/15" : "hover:bg-white/80"
      }`}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-900">{title}</span>
          {badge && (
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {badge}
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-slate-500">{subtitle}</span>
      </span>
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"
        }`}
        aria-hidden
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
    </button>
  );
}
