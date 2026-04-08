import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

export type TaskStatus = "Todo" | "In Progress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";

export type Task = {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedUser: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskCreateInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedUser?: string | null;
};

export type TaskUpdateInput = Partial<TaskCreateInput>;

export type TaskSort =
  | "created_desc"
  | "created_asc"
  | "updated_desc"
  | "updated_asc"
  | "due_asc"
  | "due_desc"
  | "title_asc"
  | "title_desc"
  | "priority_desc"
  | "priority_asc"
  | "status_order";

export type TaskFilters = {
  /** If true, tasks you created or assigned to you (API: mine=true). */
  mine?: boolean;
  status?: TaskStatus | "";
  priority?: TaskPriority | "";
  assignedUser?: string;
  /** API: unassigned=true — tasks with no assignee (ignored if `assignedUser` is set). */
  unassigned?: boolean;
  /** API: createdBy=userId */
  createdBy?: string;
  /** API: overdue=true — due in the past, not Done */
  overdue?: boolean;
  /** API: hasDue=true — has a due date */
  hasDue?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  q?: string;
  /** API: sort=… */
  sort?: TaskSort;
};

function toQuery(filters: TaskFilters) {
  const p = new URLSearchParams();
  if (filters.mine) p.set("mine", "true");
  if (filters.status) p.set("status", filters.status);
  if (filters.priority) p.set("priority", filters.priority);
  if (filters.assignedUser) p.set("assignedUser", filters.assignedUser);
  if (filters.unassigned) p.set("unassigned", "true");
  if (filters.createdBy) p.set("createdBy", filters.createdBy);
  if (filters.overdue) p.set("overdue", "true");
  if (filters.hasDue) p.set("hasDue", "true");
  if (filters.dueBefore) p.set("dueBefore", filters.dueBefore);
  if (filters.dueAfter) p.set("dueAfter", filters.dueAfter);
  if (filters.q) p.set("q", filters.q);
  if (filters.sort) p.set("sort", filters.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function getTasks(token: string, filters: TaskFilters) {
  return apiGet<{ tasks: Task[] }>(`/tasks${toQuery(filters)}`, token);
}

export async function createTask(token: string, input: TaskCreateInput) {
  return apiPost<{ task: Task }>("/tasks", input, token);
}

export async function updateTask(token: string, id: string, input: TaskUpdateInput) {
  return apiPatch<{ task: Task }>(`/tasks/${id}`, input, token);
}

export async function deleteTask(token: string, id: string) {
  return apiDelete<{ ok: true }>(`/tasks/${id}`, token);
}

