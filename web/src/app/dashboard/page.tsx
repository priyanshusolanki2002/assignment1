"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { AssigneePicker } from "@/components/AssigneePicker";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IndeterminateProgressBar, LoadingBlock } from "@/components/IndeterminateProgressBar";
import { UserSettingsDialog } from "@/components/UserSettingsDialog";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  type Task,
  type TaskFilters,
  type TaskPriority,
  type TaskSort,
  type TaskStatus,
  type TaskUpdateInput
} from "@/lib/tasks";
import { ASSIGNMENT_KEEP_VALUE } from "@/lib/taskAssignment";
import { getAssignableUsers, type AssignableUser } from "@/lib/users";
import {
  AlertCircle,
  ArrowDownUp,
  Calendar,
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  CircleDot,
  ClipboardList,
  Flame,
  Home,
  Inbox,
  LayoutGrid,
  List,
  ListTodo,
  Loader2,
  LogOut,
  PenLine,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  User,
  UserPlus,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MeResponse = { user?: { id: string; email: string; name?: string } };

const FILTER_UNASSIGNED = "__unassigned__";

function creatorLabelForTask(task: Task, currentUserId: string | null, labelById: Map<string, string>) {
  if (currentUserId && task.createdBy === currentUserId) return "You";
  return labelById.get(task.createdBy) ?? "Unknown user";
}

function canEditTask(task: Task, userId: string | null): boolean {
  if (!userId) return false;
  if (task.createdBy === userId) return true;
  return Boolean(task.assignedUser && task.assignedUser === userId);
}

/** Task you created or that is assigned to you — highlighted in the board/list. */
function taskInvolvesMe(task: Task, userId: string | null): boolean {
  if (!userId) return false;
  if (task.createdBy === userId) return true;
  return Boolean(task.assignedUser && task.assignedUser === userId);
}

function assignUsersForSelect(users: AssignableUser[], selfId: string | null) {
  const copy = [...users];
  copy.sort((a, b) => {
    if (selfId) {
      if (a.id === selfId && b.id !== selfId) return -1;
      if (b.id === selfId && a.id !== selfId) return 1;
    }
    const an = (a.name.trim() || a.email).toLowerCase();
    const bn = (b.name.trim() || b.email).toLowerCase();
    return an.localeCompare(bn);
  });
  return copy;
}

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [assignUsersLoaded, setAssignUsersLoaded] = useState(false);
  const [assignUsersError, setAssignUsersError] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(null);
  /** false until client has read localStorage — avoids SSR/hydration mismatch on `disabled` vs token. */
  const [sessionReady, setSessionReady] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [view, setView] = useState<"kanban" | "list">("kanban");

  // Filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [mine, setMine] = useState(false);
  const [sortBy, setSortBy] = useState<TaskSort>("created_desc");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [hasDueOnly, setHasDueOnly] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Create State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("Medium");
  const [newStatus, setNewStatus] = useState<TaskStatus>("Todo");
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [newAssignedUser, setNewAssignedUser] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("Todo");
  const [editPriority, setEditPriority] = useState<TaskPriority>("Medium");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [editAssignedUser, setEditAssignedUser] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setToken(t);
    setSessionReady(true);

    apiGet<MeResponse>("/auth/me", t)
      .then((res) => {
        if (!res.user?.email) throw new Error("Not authenticated");
        setEmail(res.user.email);
        setCurrentUserId(res.user.id);
        const n = res.user.name ?? "";
        setUserName(n);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!token) {
      setAssignableUsers([]);
      setAssignUsersLoaded(false);
      setAssignUsersError(null);
      return;
    }
    setAssignUsersLoaded(false);
    setAssignUsersError(null);
    void getAssignableUsers(token)
      .then((r) => {
        setAssignableUsers(Array.isArray(r.users) ? r.users : []);
        setAssignUsersLoaded(true);
        setAssignUsersError(null);
      })
      .catch((e) => {
        setAssignableUsers([]);
        setAssignUsersLoaded(true);
        setAssignUsersError(e instanceof Error ? e.message : "Request failed");
      });
  }, [token]);

  useEffect(() => {
    if (!token || (!isCreateOpen && !editingId)) return;
    void getAssignableUsers(token)
      .then((r) => {
        setAssignableUsers(Array.isArray(r.users) ? r.users : []);
        setAssignUsersError(null);
        setAssignUsersLoaded(true);
      })
      .catch((e) => {
        setAssignUsersError(e instanceof Error ? e.message : "Request failed");
      });
  }, [token, isCreateOpen, editingId]);

  const assigneeLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of assignableUsers) {
      m.set(u.id, u.name.trim() ? u.name.trim() : u.email);
    }
    return m;
  }, [assignableUsers]);

  const assignSelectOptions = useMemo(
    () => assignUsersForSelect(assignableUsers, currentUserId),
    [assignableUsers, currentUserId]
  );

  const editingTask = useMemo(() => tasks.find((t) => t._id === editingId) ?? null, [tasks, editingId]);

  const assigneeLockedForViewer = Boolean(
    editingTask &&
      currentUserId &&
      editingTask.createdBy !== currentUserId &&
      editingTask.assignedUser &&
      editingTask.assignedUser !== currentUserId
  );

  const editAssignPickerUsers = useMemo(() => {
    if (!editingTask || !currentUserId || editingTask.createdBy === currentUserId) {
      return assignSelectOptions;
    }
    if (editingTask.assignedUser && editingTask.assignedUser !== currentUserId) {
      return [];
    }
    const self = assignSelectOptions.find((u) => u.id === currentUserId);
    if (self) return [self];
    if (email) {
      return [
        {
          id: currentUserId,
          email,
          name: userName.trim() || email.split("@")[0] || "Me"
        }
      ];
    }
    return [];
  }, [editingTask, currentUserId, assignSelectOptions, email, userName]);

  const editAssignExtraOptions = useMemo(() => {
    if (!editingTask || !currentUserId || editingTask.createdBy === currentUserId) return undefined;
    const aid = editingTask.assignedUser;
    if (!aid || aid === currentUserId) return undefined;
    const label = assigneeLabelById.get(aid) ?? "Unknown user";
    return [{ value: ASSIGNMENT_KEEP_VALUE, title: "Keep current assignee", subtitle: label }];
  }, [editingTask, currentUserId, assigneeLabelById]);

  const taskQueryFilters = useMemo((): TaskFilters => {
    const f: TaskFilters = {
      mine,
      status,
      priority,
      sort: sortBy
    };
    const qt = q.trim();
    if (qt) f.q = qt;
    if (filterCreatedBy) f.createdBy = filterCreatedBy;
    if (filterAssignee === FILTER_UNASSIGNED) f.unassigned = true;
    else if (filterAssignee) f.assignedUser = filterAssignee;
    if (overdueOnly) f.overdue = true;
    if (hasDueOnly) f.hasDue = true;
    return f;
  }, [
    mine,
    q,
    status,
    priority,
    sortBy,
    filterCreatedBy,
    filterAssignee,
    overdueOnly,
    hasDueOnly
  ]);

  const refreshTasks = useCallback(
    async (t: string) => {
      setLoadingTasks(true);
      setTasksError(null);
      try {
        const res = await getTasks(t, taskQueryFilters);
        setTasks(res.tasks);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load tasks";
        setTasksError(msg);
        if (msg.toLowerCase().includes("token")) {
          clearToken();
          router.replace("/login");
        }
      } finally {
        setLoadingTasks(false);
      }
    },
    [router, taskQueryFilters]
  );

  useEffect(() => {
    if (!token) return;
    void refreshTasks(token);
  }, [token, refreshTasks]);

  function clearAdvancedFilters() {
    setSortBy("created_desc");
    setFilterAssignee("");
    setFilterCreatedBy("");
    setOverdueOnly(false);
    setHasDueOnly(false);
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setTasksError(null);
    setCreatingTask(true);

    try {
      await createTask(token, {
        title: newTitle,
        description: newDescription,
        status: newStatus,
        priority: newPriority,
        dueDate: newDueDate ? newDueDate : null,
        assignedUser: newAssignedUser.trim() ? newAssignedUser.trim() : null
      });
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewAssignedUser("");
      setIsCreateOpen(false);
      await refreshTasks(token);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  }

  async function assignUnassignedToMe(task: Task) {
    if (!token || !currentUserId) return;
    setTasksError(null);
    setClaimingTaskId(task._id);
    try {
      await updateTask(token, task._id, { assignedUser: currentUserId });
      await refreshTasks(token);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : "Failed to assign task");
    } finally {
      setClaimingTaskId(null);
    }
  }

  function openDeleteConfirm(task: Task) {
    setDeleteTarget({ id: task._id, title: task.title });
  }

  async function confirmDeleteTask() {
    if (!token || !deleteTarget) return;
    const { id } = deleteTarget;
    setTasksError(null);
    setDeleteLoading(true);
    const prev = tasks;
    setTasks((t) => t.filter((x) => x._id !== id));
    try {
      await deleteTask(token, id);
      setDeleteTarget(null);
    } catch (err) {
      setTasks(prev);
      setTasksError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeleteLoading(false);
    }
  }

  function startEdit(t: Task) {
    setEditingId(t._id);
    setEditTitle(t.title ?? "");
    setEditDescription(t.description ?? "");
    setEditStatus(t.status);
    setEditPriority(t.priority);
    setEditDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "");
    const iAmCreator = currentUserId !== null && t.createdBy === currentUserId;
    if (!iAmCreator && t.assignedUser && t.assignedUser !== currentUserId) {
      setEditAssignedUser(ASSIGNMENT_KEEP_VALUE);
    } else {
      setEditAssignedUser(t.assignedUser ?? "");
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setSavingEdit(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !editingId) return;
    const taskBeingEdited = tasks.find((x) => x._id === editingId);
    if (!taskBeingEdited) return;
    setTasksError(null);
    setSavingEdit(true);
    try {
      const isCreator = currentUserId !== null && taskBeingEdited.createdBy === currentUserId;
      const payload: TaskUpdateInput = {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        priority: editPriority,
        dueDate: editDueDate ? editDueDate : null
      };
      if (isCreator) {
        payload.assignedUser = editAssignedUser.trim() || null;
      } else if (editAssignedUser !== ASSIGNMENT_KEEP_VALUE) {
        payload.assignedUser = editAssignedUser.trim() || null;
      }
      await updateTask(token, editingId, payload);
      await refreshTasks(token);
      setEditingId(null);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSavingEdit(false);
    }
  }

  const stats = useMemo(() => {
    const total = tasks.length;
    const byStatus = { Todo: 0, "In Progress": 0, Done: 0 } as Record<TaskStatus, number>;
    const byPriority = { Low: 0, Medium: 0, High: 0 } as Record<TaskPriority, number>;
    const now = Date.now();
    let dueSoon = 0;

    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      if (t.dueDate) {
        const ms = new Date(t.dueDate).getTime() - now;
        if (ms >= 0 && ms <= 7 * 24 * 60 * 60 * 1000) dueSoon += 1;
      }
    }

    return { total, byStatus, byPriority, dueSoon };
  }, [tasks]);

  const kanban = useMemo(() => {
    const cols: Record<TaskStatus, Task[]> = { Todo: [], "In Progress": [], Done: [] };
    for (const t of tasks) cols[t.status].push(t);
    return cols;
  }, [tasks]);

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-slate-50/50 pb-12">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md relative overflow-x-hidden">
        {loadingTasks ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
            <IndeterminateProgressBar slim label="Loading tasks" />
          </div>
        ) : null}
        <div className="mx-auto flex h-14 max-w-7xl min-w-0 items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="hidden h-5 w-px bg-slate-300 sm:block" />
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <ListTodo className="h-4 w-4" aria-hidden />
              </span>
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">STMD</h1>
            </div>
            <div className="hidden h-5 w-px bg-slate-300 sm:block" />
            <p className="hidden flex-col gap-0.5 text-sm text-slate-500 sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {userName.trim() ? (
                  <span className="font-medium text-slate-700">{userName.trim()}</span>
                ) : email ? (
                  email
                ) : (
                  "Loading session…"
                )}
              </span>
              {userName.trim() && email ? (
                <span className="pl-5 text-xs text-slate-400">{email}</span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setNewAssignedUser("");
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 sm:px-4"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">New Task</span>
            </button>
            <button
              type="button"
              onClick={() => setIsUserSettingsOpen(true)}
              disabled={!sessionReady || !token}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 sm:px-4"
              aria-label="User settings"
            >
              <Settings className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline" aria-hidden="true">
                User settings
              </span>
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto mt-8 w-full max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">

        {/* Stats Row */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Tasks" value={stats.total} icon={ClipboardList} />
          <StatCard label="Todo" value={stats.byStatus.Todo} icon={CircleDot} />
          <StatCard label="In Progress" value={stats.byStatus["In Progress"]} icon={PlayCircle} />
          <StatCard label="Done" value={stats.byStatus.Done} icon={CircleCheck} />
          <StatCard label="High Priority" value={stats.byPriority.High} icon={Flame} highlight />
          <StatCard label="Due in 7 days" value={stats.dueSoon} icon={CalendarClock} highlight />
        </section>

        {/* Toolbar: Filters & View Toggles */}
        <section className="mt-8 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs sm:w-auto">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  placeholder="Search tasks…"
                  className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-slate-400 focus:bg-white"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 focus:bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
              >
                <option value="">All Statuses</option>
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
              <select
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 focus:bg-white"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority | "")}
              >
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <label
                className="ml-2 flex max-w-[14rem] cursor-pointer items-center gap-2 text-sm text-slate-600 sm:max-w-none"
                title="When checked, only tasks you created or that are assigned to you. When unchecked, all tasks are shown and yours are highlighted."
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={mine}
                  onChange={(e) => setMine(e.target.checked)}
                />
                <span className="leading-tight">Only my tasks</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 sm:border-none sm:pt-0">
              {tasksError && (
                <span className="mr-2 inline-flex max-w-full min-w-0 items-center gap-1 break-words text-sm text-red-500">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {tasksError}
                </span>
              )}
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${view === "kanban" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  onClick={() => setView("kanban")}
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  onClick={() => setView("list")}
                >
                  <List className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={() => sessionReady && token && refreshTasks(token)}
                disabled={!sessionReady || !token || loadingTasks}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingTasks ? "animate-spin" : ""}`} aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 xl:flex-row xl:flex-wrap xl:items-end xl:gap-2">
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:mr-1 xl:pb-2">
              <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
              Sort &amp; more filters
            </span>
            <label className="flex min-w-0 flex-col gap-0.5 sm:min-w-[10rem]">
              <span className="text-xs font-medium text-slate-600">Sort by</span>
              <select
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as TaskSort)}
              >
                <option value="created_desc">Newest created</option>
                <option value="created_asc">Oldest created</option>
                <option value="updated_desc">Recently updated</option>
                <option value="updated_asc">Least recently updated</option>
                <option value="due_asc">Due date (soonest)</option>
                <option value="due_desc">Due date (latest)</option>
                <option value="title_asc">Title A–Z</option>
                <option value="title_desc">Title Z–A</option>
                <option value="priority_desc">Priority (high first)</option>
                <option value="priority_asc">Priority (low first)</option>
                <option value="status_order">Status (Todo → Done)</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-0.5 text-xs font-medium text-slate-600 sm:min-w-[9rem]">
              Assignee
              <select
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                disabled={!assignUsersLoaded}
              >
                <option value="">Anyone</option>
                <option value={FILTER_UNASSIGNED}>Unassigned</option>
                {assignSelectOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name.trim() || u.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-0.5 text-xs font-medium text-slate-600 sm:min-w-[9rem]">
              Created by
              <select
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                value={filterCreatedBy}
                onChange={(e) => setFilterCreatedBy(e.target.value)}
                disabled={!assignUsersLoaded}
              >
                <option value="">Anyone</option>
                {assignSelectOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name.trim() || u.email}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-3 pb-1 sm:gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                />
                <span>Overdue</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={hasDueOnly}
                  onChange={(e) => setHasDueOnly(e.target.checked)}
                />
                <span>Has due date</span>
              </label>
            </div>
            {(sortBy !== "created_desc" ||
              filterAssignee !== "" ||
              filterCreatedBy !== "" ||
              overdueOnly ||
              hasDueOnly) && (
              <button
                type="button"
                onClick={clearAdvancedFilters}
                className="h-9 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 xl:ml-auto"
              >
                Reset sort &amp; filters
              </button>
            )}
          </div>
        </section>

        {/* Task Board */}
        <section className="mt-6">
          {view === "kanban" ? (
            loadingTasks && tasks.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <LoadingBlock message="Loading tasks…" />
              </div>
            ) : (
            <div className="grid gap-6 sm:grid-cols-3">
              {(["Todo", "In Progress", "Done"] as TaskStatus[]).map((col) => (
                <div key={col} className="flex min-h-0 flex-col rounded-xl bg-slate-100/50 p-4">
                  <div className="mb-4 flex shrink-0 items-center justify-between px-1">
                    <h3 className="flex items-center gap-2 font-semibold text-slate-800">
                      {col === "Todo" && <CircleDot className="h-4 w-4 text-slate-500" aria-hidden />}
                      {col === "In Progress" && <PlayCircle className="h-4 w-4 text-blue-500" aria-hidden />}
                      {col === "Done" && <CircleCheck className="h-4 w-4 text-emerald-500" aria-hidden />}
                      {col}
                    </h3>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                      {kanban[col].length}
                    </span>
                  </div>
                  <div className="flex max-h-[min(70dvh,36rem)] flex-col gap-3 overflow-y-auto overflow-x-hidden overscroll-y-contain pr-0.5">
                    {kanban[col].length === 0 ? (
                      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                        <Inbox className="h-8 w-8 text-slate-300" aria-hidden />
                        No tasks yet
                      </div>
                    ) : (
                      kanban[col].map((t) => (
                        <TaskCard
                          key={t._id}
                          task={t}
                          currentUserId={currentUserId}
                          involvesMe={taskInvolvesMe(t, currentUserId)}
                          creatorLabel={creatorLabelForTask(t, currentUserId, assigneeLabelById)}
                          assigneeLabel={
                            t.assignedUser
                              ? assigneeLabelById.get(t.assignedUser) ?? "Unknown user"
                              : null
                          }
                          canEdit={canEditTask(t, currentUserId)}
                          onEdit={() => startEdit(t)}
                          canDelete={currentUserId !== null && t.createdBy === currentUserId}
                          onDelete={() => openDeleteConfirm(t)}
                          showAssignToMe={Boolean(currentUserId && !t.assignedUser)}
                          assignToMeBusy={claimingTaskId === t._id}
                          onAssignToMe={() => assignUnassignedToMe(t)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
            )
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="max-h-[min(75dvh,48rem)] divide-y divide-slate-100 overflow-y-auto overflow-x-hidden overscroll-y-contain">
                {loadingTasks && tasks.length === 0 ? (
                  <LoadingBlock message="Loading tasks…" className="py-10" />
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-500">
                    <Inbox className="h-10 w-10 text-slate-300" aria-hidden />
                    No tasks found.
                  </div>
                ) : (
                  tasks.map((t) => (
                    <div
                      key={t._id}
                      className={`p-4 transition-colors ${
                        taskInvolvesMe(t, currentUserId)
                          ? "border-l-[3px] border-l-indigo-500 bg-indigo-50/45 hover:bg-indigo-50/65"
                          : "border-l-[3px] border-l-transparent hover:bg-slate-50"
                      }`}
                    >
                      <TaskCard
                        task={t}
                        currentUserId={currentUserId}
                        involvesMe={taskInvolvesMe(t, currentUserId)}
                        creatorLabel={creatorLabelForTask(t, currentUserId, assigneeLabelById)}
                        assigneeLabel={
                          t.assignedUser ? assigneeLabelById.get(t.assignedUser) ?? "Unknown user" : null
                        }
                        canEdit={canEditTask(t, currentUserId)}
                        onEdit={() => startEdit(t)}
                        canDelete={currentUserId !== null && t.createdBy === currentUserId}
                        onDelete={() => openDeleteConfirm(t)}
                        showAssignToMe={Boolean(currentUserId && !t.assignedUser)}
                        assignToMeBusy={claimingTaskId === t._id}
                        onAssignToMe={() => assignUnassignedToMe(t)}
                        listMode
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* --- CREATE MODAL --- */}
      {isCreateOpen && (
        <div className="tm-modal-root transition-opacity">
          <div className="tm-modal-center">
            <button
              type="button"
              aria-label="Close"
              className="tm-modal-backdrop-soft pointer-events-auto"
              disabled={creatingTask}
              onClick={() => !creatingTask && setIsCreateOpen(false)}
            />
            <div className="tm-modal-panel">
            {creatingTask ? (
              <div className="sticky top-0 left-0 right-0 z-10">
                <IndeterminateProgressBar slim label="Creating task" />
              </div>
            ) : null}
            <div className="p-6">
            <button
              type="button"
              onClick={() => !creatingTask && setIsCreateOpen(false)}
              disabled={creatingTask}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="flex items-center gap-2 pr-10 text-xl font-bold text-slate-900">
              <Plus className="h-6 w-6 text-slate-700" aria-hidden />
              Create New Task
            </h2>
            <form onSubmit={onCreate} className="mt-5 flex flex-col gap-4">
              <label className="text-sm font-medium text-slate-700">
                Title
                <input
                  className="mt-1 block h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="E.g. Setup database schema"
                  autoFocus
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Description
                <textarea
                  className="mt-1 block min-h-[100px] w-full rounded-md border border-slate-200 p-3 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add details..."
                />
              </label>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="min-w-0 text-sm font-medium text-slate-700">
                  Status
                  <select
                    className="mt-1 block h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 outline-none focus:border-slate-900"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </label>
                <label className="min-w-0 text-sm font-medium text-slate-700">
                  Priority
                  <select
                    className="mt-1 block h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 outline-none focus:border-slate-900"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>
              <label className="min-w-0 text-sm font-medium text-slate-700">
                Due Date
                <input
                  type="date"
                  className="mt-1 block h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 outline-none focus:border-slate-900"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </label>
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="mb-0 text-sm font-medium text-slate-700">Assign to</legend>
                <AssigneePicker
                  users={assignSelectOptions}
                  currentUserId={currentUserId}
                  value={newAssignedUser}
                  onChange={setNewAssignedUser}
                  loaded={assignUsersLoaded}
                  loadError={assignUsersError}
                />
              </fieldset>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creatingTask}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || creatingTask}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {creatingTask ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {creatingTask ? "Creating…" : "Create Task"}
                </button>
              </div>
            </form>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {editingId && (
        <div className="tm-modal-root transition-opacity">
          <div className="tm-modal-center">
            <button
              type="button"
              aria-label="Close"
              className="tm-modal-backdrop-soft pointer-events-auto"
              disabled={savingEdit}
              onClick={() => !savingEdit && cancelEdit()}
            />
            <div className="tm-modal-panel">
            {savingEdit ? (
              <div className="sticky top-0 left-0 right-0 z-10">
                <IndeterminateProgressBar slim label="Saving task" />
              </div>
            ) : null}
            <div className="p-6">
            <button
              type="button"
              onClick={() => !savingEdit && cancelEdit()}
              disabled={savingEdit}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="flex items-center gap-2 pr-10 text-xl font-bold text-slate-900">
              <Pencil className="h-6 w-6 text-slate-700" aria-hidden />
              Edit Task
            </h2>
            {editingTask ? (
              <p className="mt-2 text-sm text-slate-500">
                Created by{" "}
                <span className="font-medium text-slate-700">
                  {creatorLabelForTask(editingTask, currentUserId, assigneeLabelById)}
                </span>
              </p>
            ) : null}
            <form onSubmit={saveEdit} className="mt-5 flex flex-col gap-4">
              <label className="text-sm font-medium text-slate-700">
                Title
                <input
                  className="mt-1 block h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-slate-900"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Description
                <textarea
                  className="mt-1 block min-h-[100px] w-full rounded-md border border-slate-200 p-3 outline-none focus:border-slate-900"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </label>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="min-w-0 text-sm font-medium text-slate-700">
                  Status
                  <select
                    className="mt-1 block h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 outline-none focus:border-slate-900"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </label>
                <label className="min-w-0 text-sm font-medium text-slate-700">
                  Priority
                  <select
                    className="mt-1 block h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 outline-none focus:border-slate-900"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>
              <label className="min-w-0 text-sm font-medium text-slate-700">
                Due Date
                <input
                  type="date"
                  className="mt-1 block h-10 w-full min-w-0 rounded-md border border-slate-200 px-3 outline-none focus:border-slate-900 sm:max-w-xs"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </label>
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="mb-0 text-sm font-medium text-slate-700">Assign to</legend>
                {assigneeLockedForViewer ? (
                  <p className="mt-1 text-xs text-slate-500">
                    This task is assigned to someone else. Only the creator can change the assignee.
                  </p>
                ) : editingTask && currentUserId && editingTask.createdBy !== currentUserId ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Only the creator can assign someone else. You can assign yourself, unassign, or keep the current
                    assignee.
                  </p>
                ) : null}
                <AssigneePicker
                  users={editAssignPickerUsers}
                  currentUserId={currentUserId}
                  value={editAssignedUser}
                  onChange={setEditAssignedUser}
                  disabled={savingEdit || assigneeLockedForViewer}
                  loaded={assignUsersLoaded}
                  loadError={assignUsersError}
                  extraOptions={editAssignExtraOptions}
                  hideUnassigned={assigneeLockedForViewer}
                />
              </fieldset>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editTitle.trim() || savingEdit}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {savingEdit ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
            </div>
            </div>
          </div>
        </div>
      )}

      <UserSettingsDialog
        open={isUserSettingsOpen}
        onOpenChange={setIsUserSettingsOpen}
        token={token}
        sessionReady={sessionReady}
        email={email}
        initialName={userName}
        onProfileSaved={(name) => setUserName(name)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteTarget(null);
        }}
        title="Delete task?"
        description={
          deleteTarget ? (
            <>
              This will permanently remove{" "}
              <span className="font-medium text-slate-900">&ldquo;{deleteTarget.title}&rdquo;</span>. This cannot be
              undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
        onConfirm={confirmDeleteTask}
      />
    </main>
  );
}

// --- SUBCOMPONENTS ---

function StatCard({ label, value, icon: Icon, highlight = false }: { label: string; value: number; icon?: LucideIcon; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${highlight && value > 0 ? "ring-1 ring-amber-400" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /> : null}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function badgeForPriority(p: TaskPriority) {
  if (p === "High") return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20";
  if (p === "Medium") return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
  return "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/20";
}

function badgeForStatus(s: TaskStatus) {
  if (s === "Done") return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
  if (s === "In Progress") return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
  return "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/20";
}

function TaskCard({
  task,
  currentUserId,
  involvesMe,
  creatorLabel,
  assigneeLabel,
  canEdit,
  onEdit,
  canDelete,
  onDelete,
  showAssignToMe,
  assignToMeBusy,
  onAssignToMe,
  listMode = false
}: {
  task: Task;
  currentUserId: string | null;
  /** You created this task or it is assigned to you — stronger visual emphasis. */
  involvesMe: boolean;
  creatorLabel: string;
  assigneeLabel: string | null;
  canEdit: boolean;
  onEdit: () => void;
  canDelete: boolean;
  onDelete: () => void;
  showAssignToMe: boolean;
  assignToMeBusy: boolean;
  onAssignToMe: () => void;
  listMode?: boolean;
}) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = due ? due < new Date() && task.status !== "Done" : false;

  // Format nicely: "Apr 7" instead of raw dates
  const dueText = due ? due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

  const descText = task.description?.trim() ?? "";
  const hasDescription = descText.length > 0;

  const unassigned = !task.assignedUser;
  const assignedToMe = Boolean(currentUserId && task.assignedUser === currentUserId);

  const assignBadgeClass = unassigned
    ? "bg-slate-100 text-slate-700 ring-slate-400/25"
    : assignedToMe
      ? "bg-violet-50 text-violet-900 ring-violet-600/20"
      : "bg-sky-50 text-sky-900 ring-sky-600/20";

  const assignBadgeText = unassigned
    ? "Unassigned"
    : assignedToMe
      ? "Assigned to you"
      : `Assigned to ${assigneeLabel ?? "Unknown user"}`;

  const kanbanMine =
    "border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white ring-1 ring-indigo-400/30 shadow-indigo-900/5";

  return (
    <div
      className={`group relative flex flex-col gap-3 rounded-xl p-4 transition-shadow ${
        listMode
          ? "border-0 bg-transparent shadow-none ring-0 hover:shadow-none sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          : involvesMe
            ? `border shadow-sm hover:shadow-md ${kanbanMine}`
            : "border border-slate-200 bg-white shadow-sm hover:shadow-md"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className={`flex gap-2 ${listMode ? "flex-wrap items-center" : "items-start justify-between"}`}>
          <h4
            className={`min-w-0 truncate text-sm font-bold text-slate-900 ${listMode ? "flex-1" : ""}`}
            title={task.title}
          >
            {task.title}
          </h4>
          {involvesMe ? (
            <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800 ring-1 ring-inset ring-indigo-500/25">
              Yours
            </span>
          ) : null}
          {listMode && (
            <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium ${badgeForStatus(task.status)}`}>
              {task.status}
            </span>
          )}
          {!listMode && task.status === "Done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Done" />}
        </div>

        {hasDescription && (
          <p
            className={`text-xs leading-relaxed text-slate-600 ${listMode ? "line-clamp-2" : "line-clamp-3"}`}
            title={descText.length > 120 ? descText : undefined}
          >
            {descText}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${badgeForPriority(task.priority)}`}>
            {task.priority}
          </span>
          {dueText && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${isOverdue ? "text-red-600" : "text-slate-500"}`}
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {dueText}
              {isOverdue ? "!" : ""}
            </span>
          )}
          <span
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-stone-50 px-2 py-1 text-xs font-medium text-stone-800 ring-1 ring-inset ring-stone-600/15"
            title={`Created by ${creatorLabel}`}
          >
            <PenLine className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">Created by {creatorLabel}</span>
          </span>
          <span
            className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${assignBadgeClass}`}
            title={unassigned ? "No assignee" : assignBadgeText}
          >
            <User className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">{assignBadgeText}</span>
          </span>
          {showAssignToMe ? (
            <button
              type="button"
              onClick={onAssignToMe}
              disabled={assignToMeBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-violet-600/35 ring-2 ring-violet-400/60 ring-offset-2 ring-offset-white transition hover:from-violet-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-violet-500/45 focus-visible:outline-none focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
              title="Assign this task to yourself"
            >
              {assignToMeBusy ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" aria-hidden />
              ) : (
                <UserPlus className="h-4 w-4 shrink-0 text-white" strokeWidth={2.25} aria-hidden />
              )}
              Assign to me
            </button>
          ) : null}
        </div>
      </div>

      {/* Action Buttons (Reveal on Hover in Kanban, always visible in List) */}
      {(canEdit || canDelete) ? (
        <div className={`flex items-center gap-1 ${listMode ? '' : 'absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100 bg-white/90 backdrop-blur-sm rounded-md p-0.5'}`}>
          {canEdit ? (
            <button
              onClick={onEdit}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title="Edit"
              type="button"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {canDelete ? (
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete"
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}