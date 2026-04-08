import { ListTodo } from "lucide-react";
import type { PropsWithChildren } from "react";

export function AuthCard({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto w-full max-w-md min-w-0 px-4 pb-8 font-sans">
      <div className="min-w-0 overflow-x-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-2 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <ListTodo className="h-6 w-6" aria-hidden />
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}

