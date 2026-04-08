import { Router } from "express";
import mongoose from "mongoose";

import { findUserById } from "../auth/userRepo.js";
import { requireAuth, type AuthedRequest } from "../auth/middleware.js";
import { notifyTaskAssignee, notifyTaskCreated, notifyTaskStatusChanged } from "./taskEmails.js";
import { TaskModel, TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "./Task.js";

export const tasksRouter = Router();

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function parseDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

tasksRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  const status: TaskStatus = isOneOf(req.body?.status, TASK_STATUSES) ? req.body.status : "Todo";
  const priority: TaskPriority = isOneOf(req.body?.priority, TASK_PRIORITIES) ? req.body.priority : "Medium";
  const dueDate = parseDate(req.body?.dueDate);

  const assignedUserRaw = req.body?.assignedUser;
  const assignedUser =
    typeof assignedUserRaw === "string" && assignedUserRaw.trim() !== "" ? assignedUserRaw.trim() : null;

  if (!title) return res.status(400).json({ error: "Title is required" });

  if (assignedUser && !mongoose.isValidObjectId(assignedUser)) {
    return res.status(400).json({ error: "assignedUser must be a valid id" });
  }

  const createdBy = req.user!.id;
  if (!mongoose.isValidObjectId(createdBy)) return res.status(401).json({ error: "Invalid user id" });

  const task = await TaskModel.create({
    title,
    description,
    status,
    priority,
    dueDate,
    assignedUser,
    createdBy
  });

  const assigner = await findUserById(createdBy);
  if (assigner) {
    const assignerName = (assigner.name && assigner.name.trim()) || assigner.email;
    await notifyTaskCreated({
      creatorId: createdBy,
      creatorName: assignerName,
      creatorEmail: assigner.email,
      assigneeId: assignedUser,
      title
    });
  }

  return res.status(201).json({ task });
});

const TASK_SORT_KEYS = [
  "created_desc",
  "created_asc",
  "updated_desc",
  "updated_asc",
  "due_asc",
  "due_desc",
  "title_asc",
  "title_desc",
  "priority_desc",
  "priority_asc",
  "status_order"
] as const;
type TaskSortKey = (typeof TASK_SORT_KEYS)[number];

const PRI_ORDER: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER: Record<TaskStatus, number> = { Todo: 0, "In Progress": 1, Done: 2 };

function isTaskSortKey(value: string): value is TaskSortKey {
  return (TASK_SORT_KEYS as readonly string[]).includes(value);
}

// GET /tasks?...&mine=true → tasks you created OR assigned to you
tasksRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const filter: Record<string, unknown> = {};

  const mine = req.query.mine === "true";
  if (mine) {
    const uid = req.user!.id;
    filter.$or = [{ createdBy: uid }, { assignedUser: uid }];
  }

  if (isOneOf(req.query.status, TASK_STATUSES)) filter.status = req.query.status;
  if (isOneOf(req.query.priority, TASK_PRIORITIES)) filter.priority = req.query.priority;

  if (typeof req.query.createdBy === "string" && req.query.createdBy.trim() !== "") {
    if (!mongoose.isValidObjectId(req.query.createdBy)) {
      return res.status(400).json({ error: "createdBy must be a valid id" });
    }
    filter.createdBy = req.query.createdBy.trim();
  }

  let assigneeExplicit = false;
  if (typeof req.query.assignedUser === "string" && req.query.assignedUser.trim() !== "") {
    if (!mongoose.isValidObjectId(req.query.assignedUser)) {
      return res.status(400).json({ error: "assignedUser must be a valid id" });
    }
    filter.assignedUser = req.query.assignedUser.trim();
    assigneeExplicit = true;
  }
  if (!assigneeExplicit && req.query.unassigned === "true") {
    filter.assignedUser = null;
  }

  const dueBefore = parseDate(req.query.dueBefore);
  const dueAfter = parseDate(req.query.dueAfter);
  const overdue = req.query.overdue === "true";
  const hasDue = req.query.hasDue === "true";

  const dueParts: Record<string, unknown> = {};
  if (dueAfter) dueParts.$gte = dueAfter;
  if (dueBefore) dueParts.$lte = dueBefore;
  if (overdue) {
    dueParts.$lt = new Date();
    dueParts.$ne = null;
  } else if (hasDue) {
    dueParts.$ne = null;
  }
  if (Object.keys(dueParts).length > 0) {
    filter.dueDate = dueParts;
  }

  if (overdue && !isOneOf(req.query.status, TASK_STATUSES)) {
    filter.status = { $ne: "Done" };
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) filter.$text = { $search: q };

  const sortRaw = typeof req.query.sort === "string" ? req.query.sort.trim() : "created_desc";
  const sortKey: TaskSortKey = isTaskSortKey(sortRaw) ? sortRaw : "created_desc";

  let mongoSort: Record<string, 1 | -1> = { createdAt: -1 };
  let postSort: TaskSortKey | null = null;

  switch (sortKey) {
    case "created_asc":
      mongoSort = { createdAt: 1 };
      break;
    case "created_desc":
      mongoSort = { createdAt: -1 };
      break;
    case "updated_asc":
      mongoSort = { updatedAt: 1 };
      break;
    case "updated_desc":
      mongoSort = { updatedAt: -1 };
      break;
    case "title_asc":
      mongoSort = { title: 1 };
      break;
    case "title_desc":
      mongoSort = { title: -1 };
      break;
    case "due_asc":
    case "due_desc":
    case "priority_asc":
    case "priority_desc":
    case "status_order":
      mongoSort = { createdAt: -1 };
      postSort = sortKey;
      break;
    default:
      mongoSort = { createdAt: -1 };
  }

  let tasks = await TaskModel.find(filter).sort(mongoSort).limit(500).lean();

  const createdDesc = (a: { createdAt?: Date }, b: { createdAt?: Date }) =>
    new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();

  if (postSort === "due_asc") {
    tasks.sort((a, b) => {
      const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (at !== bt) return at - bt;
      return createdDesc(a, b);
    });
  } else if (postSort === "due_desc") {
    tasks.sort((a, b) => {
      const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.NEGATIVE_INFINITY;
      const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.NEGATIVE_INFINITY;
      if (at !== bt) return bt - at;
      return createdDesc(a, b);
    });
  } else if (postSort === "priority_asc") {
    tasks.sort(
      (a, b) =>
        PRI_ORDER[a.priority as TaskPriority] - PRI_ORDER[b.priority as TaskPriority] || createdDesc(a, b)
    );
  } else if (postSort === "priority_desc") {
    tasks.sort(
      (a, b) =>
        PRI_ORDER[b.priority as TaskPriority] - PRI_ORDER[a.priority as TaskPriority] || createdDesc(a, b)
    );
  } else if (postSort === "status_order") {
    tasks.sort(
      (a, b) =>
        STATUS_ORDER[a.status as TaskStatus] - STATUS_ORDER[b.status as TaskStatus] || createdDesc(a, b)
    );
  }

  return res.json({ tasks });
});

tasksRouter.patch("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid task id" });

  const existing = await TaskModel.findById(id).lean();
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const prevAssigned = existing.assignedUser ? String(existing.assignedUser) : null;
  const prevStatus = existing.status as string;
  const creatorId = String(existing.createdBy);
  const uid = req.user!.id;
  const isCreator = creatorId === uid;
  const isAssignee = prevAssigned !== null && prevAssigned === uid;

  let assignUpdate: string | null | undefined = undefined;
  if (req.body?.assignedUser !== undefined) {
    const assignedUserRaw = req.body.assignedUser;
    assignUpdate =
      typeof assignedUserRaw === "string" && assignedUserRaw.trim() !== "" ? assignedUserRaw.trim() : null;
    if (assignUpdate && !mongoose.isValidObjectId(assignUpdate)) {
      return res.status(400).json({ error: "assignedUser must be a valid id" });
    }
  }

  const claimingSelfOnUnassigned =
    prevAssigned === null && assignUpdate !== undefined && assignUpdate === uid;
  if (!isCreator && !isAssignee && !claimingSelfOnUnassigned) {
    return res.status(403).json({
      error:
        "Only the task creator or the assigned user can edit this task. If the task is unassigned, you may assign it to yourself."
    });
  }

  const updates: Record<string, unknown> = {};

  if (typeof req.body?.title === "string") {
    const title = req.body.title.trim();
    if (!title) return res.status(400).json({ error: "Title cannot be empty" });
    updates.title = title;
  }

  if (typeof req.body?.description === "string") {
    updates.description = req.body.description.trim();
  }

  if (req.body?.status !== undefined) {
    if (!isOneOf(req.body.status, TASK_STATUSES)) return res.status(400).json({ error: "Invalid status" });
    updates.status = req.body.status;
  }

  if (req.body?.priority !== undefined) {
    if (!isOneOf(req.body.priority, TASK_PRIORITIES)) return res.status(400).json({ error: "Invalid priority" });
    updates.priority = req.body.priority;
  }

  if (req.body?.dueDate !== undefined) {
    const dueDate = parseDate(req.body.dueDate);
    if (req.body.dueDate !== null && req.body.dueDate !== "" && !dueDate) {
      return res.status(400).json({ error: "Invalid dueDate" });
    }
    updates.dueDate = dueDate;
  }

  let nextAssigned = prevAssigned;
  if (assignUpdate !== undefined) {
    const assignedUser = assignUpdate;
    if (creatorId !== uid) {
      if (prevAssigned != null && prevAssigned !== uid) {
        if (assignedUser !== prevAssigned) {
          return res.status(403).json({
            error: "This task is assigned to someone else. Only the creator can change the assignee."
          });
        }
      } else {
        const allowed =
          assignedUser === null || assignedUser === uid || assignedUser === prevAssigned;
        if (!allowed) {
          return res.status(403).json({
            error:
              "Only the task creator can assign another user. You may assign yourself, clear the assignee, or leave the assignee unchanged."
          });
        }
      }
    }
    updates.assignedUser = assignedUser;
    nextAssigned = assignedUser;
  }

  if (claimingSelfOnUnassigned && !isCreator && !isAssignee) {
    const keys = Object.keys(updates);
    if (keys.length !== 1 || keys[0] !== "assignedUser") {
      return res.status(403).json({
        error:
          "To take an unassigned task, only set yourself as assignee in this request; you can edit other fields after you are assigned."
      });
    }
  }

  const task = await TaskModel.findOneAndUpdate({ _id: id }, updates, { new: true }).lean();
  if (!task) return res.status(404).json({ error: "Task not found" });

  const assigner = await findUserById(req.user!.id);
  if (assigner && nextAssigned) {
    const assignerName = (assigner.name && assigner.name.trim()) || assigner.email;
    await notifyTaskAssignee({
      assignerId: req.user!.id,
      assignerName,
      assignerEmail: assigner.email,
      assigneeId: nextAssigned,
      previousAssigneeId: prevAssigned,
      taskTitle: task.title
    });
  }

  if (assigner && updates.status !== undefined && task.status !== prevStatus) {
    const assigneeId = task.assignedUser ? String(task.assignedUser) : null;
    const assignerName = (assigner.name && assigner.name.trim()) || assigner.email;
    await notifyTaskStatusChanged({
      taskTitle: task.title,
      fromStatus: prevStatus,
      toStatus: task.status as string,
      updatedById: req.user!.id,
      updatedByName: assignerName,
      updatedByEmail: assigner.email,
      creatorId,
      assigneeId
    });
  }

  return res.json({ task });
});

tasksRouter.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid task id" });

  const uid = req.user!.id;
  const deleted = await TaskModel.findOneAndDelete({ _id: id, createdBy: uid }).lean();
  if (deleted) return res.json({ ok: true });

  const exists = await TaskModel.findById(id).lean();
  if (!exists) return res.status(404).json({ error: "Task not found" });

  return res.status(403).json({ error: "Only the task creator can delete this task." });
});

