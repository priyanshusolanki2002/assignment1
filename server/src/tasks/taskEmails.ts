import { findUserById } from "../auth/userRepo.js";
import { sendEmail } from "../nodemailer.js";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dashboardLinkHtml(): string {
  const baseUrl = (process.env.WEB_ORIGIN ?? process.env.FRONTEND_URL ?? "").replace(/\/$/, "");
  const dashboardLink = baseUrl ? `${baseUrl}/dashboard` : "";
  return dashboardLink
    ? `<p><a href="${escapeHtml(dashboardLink)}">Open your dashboard</a></p>`
    : "<p>Sign in to your task dashboard to view it.</p>";
}

async function sendSafe(to: string, subject: string, html: string) {
  try {
    await sendEmail(to, subject, html);
  } catch (err) {
    console.error("[tasks] email failed:", subject, err);
  }
}

type AssignParams = {
  assignerId: string;
  assignerName: string;
  assignerEmail: string;
  assigneeId: string;
  previousAssigneeId: string | null;
  taskTitle: string;
  /** Use “new task” wording in subject/body (create flow). */
  isNewTask?: boolean;
};

/** Email the assignee when assignment changes to them (not on self-assign). */
export async function notifyTaskAssignee(params: AssignParams) {
  const { assignerId, assignerName, assignerEmail, assigneeId, previousAssigneeId, taskTitle, isNewTask } = params;

  if (!assigneeId || assigneeId === assignerId) return;
  if (previousAssigneeId === assigneeId) return;

  const assignee = await findUserById(assigneeId);
  if (!assignee?.email) return;

  const assigneeGreeting = escapeHtml((assignee.name && assignee.name.trim()) || "there");
  const subject = isNewTask ? `New task assigned: ${taskTitle}` : `Task assigned: ${taskTitle}`;
  const intro = isNewTask
    ? `<p><strong>${escapeHtml(assignerName)}</strong> (${escapeHtml(assignerEmail)}) created a task and assigned it to you:</p>`
    : `<p><strong>${escapeHtml(assignerName)}</strong> (${escapeHtml(assignerEmail)}) assigned you a task:</p>`;

  const html = `
    <p>Hi ${assigneeGreeting},</p>
    ${intro}
    <p><strong>${escapeHtml(taskTitle)}</strong></p>
    ${dashboardLinkHtml()}
  `;

  await sendSafe(assignee.email, subject, html);
}

/** After task create: notify assignee if any (not self); notify creator if unassigned or self-assigned. */
export async function notifyTaskCreated(params: {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  assigneeId: string | null;
  title: string;
}) {
  const { creatorId, creatorName, creatorEmail, assigneeId, title } = params;

  if (assigneeId && assigneeId !== creatorId) {
    await notifyTaskAssignee({
      assignerId: creatorId,
      assignerName: creatorName,
      assignerEmail: creatorEmail,
      assigneeId,
      previousAssigneeId: null,
      taskTitle: title,
      isNewTask: true
    });

    const creator = await findUserById(creatorId);
    const assignee = await findUserById(assigneeId);
    if (creator?.email && assignee?.email) {
      const g = escapeHtml((creator.name && creator.name.trim()) || "there");
      const assigneeLabel = escapeHtml((assignee.name && assignee.name.trim()) || assignee.email);
      const subject = `Task created and assigned: ${title}`;
      const html = `
    <p>Hi ${g},</p>
    <p>This confirms you created a new task and assigned it to <strong>${assigneeLabel}</strong> (${escapeHtml(assignee.email)}):</p>
    <p><strong>${escapeHtml(title)}</strong></p>
    ${dashboardLinkHtml()}
  `;
      await sendSafe(creator.email, subject, html);
    }
    return;
  }

  const creator = await findUserById(creatorId);
  if (!creator?.email) return;

  const g = escapeHtml((creator.name && creator.name.trim()) || "there");
  const subject = `Task created: ${title}`;
  const detail =
    assigneeId && assigneeId === creatorId
      ? "<p>It is assigned to you.</p>"
      : "<p>It is currently unassigned.</p>";

  const html = `
    <p>Hi ${g},</p>
    <p>You created a new task:</p>
    <p><strong>${escapeHtml(title)}</strong></p>
    ${detail}
    ${dashboardLinkHtml()}
  `;

  await sendSafe(creator.email, subject, html);
}

/** When status changes, email creator and/or assignee except the user who updated. */
export async function notifyTaskStatusChanged(params: {
  taskTitle: string;
  fromStatus: string;
  toStatus: string;
  updatedById: string;
  updatedByName: string;
  updatedByEmail: string;
  creatorId: string;
  assigneeId: string | null;
}) {
  const { taskTitle, fromStatus, toStatus, updatedById, updatedByName, updatedByEmail, creatorId, assigneeId } =
    params;

  const recipientIds = new Set<string>();
  recipientIds.add(creatorId);
  if (assigneeId) recipientIds.add(assigneeId);
  recipientIds.delete(updatedById);

  const actorLine = `<p>Updated by <strong>${escapeHtml(updatedByName)}</strong> (${escapeHtml(updatedByEmail)}).</p>`;

  for (const uid of recipientIds) {
    const u = await findUserById(uid);
    if (!u?.email) continue;

    const g = escapeHtml((u.name && u.name.trim()) || "there");
    const subject = `Task status updated: ${taskTitle}`;
    const html = `
      <p>Hi ${g},</p>
      <p>The status of <strong>${escapeHtml(taskTitle)}</strong> changed from <strong>${escapeHtml(fromStatus)}</strong> to <strong>${escapeHtml(toStatus)}</strong>.</p>
      ${actorLine}
      ${dashboardLinkHtml()}
    `;

    await sendSafe(u.email, subject, html);
  }
}
