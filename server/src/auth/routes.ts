import { Router, type NextFunction, type Request, type Response } from "express";

import { hashPassword, verifyPassword } from "./password";
import {
  createUser,
  findUserByEmail,
  findUserById,
  listAssignableUsers,
  updateUserName,
  updateUserPasswordHash
} from "./userRepo";
import { signAccessToken } from "./jwt.js";
import { requireAuth, type AuthedRequest } from "./middleware";

export const authRouter = Router();

function catchAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function catchAsyncAuthed(
  fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void | Response>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next);
  };
}

function userPayload(u: { _id: unknown; email: string; name?: string | null }) {
  return { id: String(u._id), email: u.email, name: u.name ?? "" };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mongoErrorCode(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null || !("code" in err)) return undefined;
  const c = (err as { code: unknown }).code;
  return typeof c === "number" ? c : undefined;
}

function formatSignupError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Signup failed — check server logs";
  }
}

/** Accept common JSON/autofill keys so `name` is not dropped when the client sends a different field. */
function readSignupName(body: Request["body"]): string {
  const b = body as Record<string, unknown> | null | undefined;
  if (!b || typeof b !== "object") return "";
  const keys = ["name", "fullName", "displayName", "username"] as const;
  for (const k of keys) {
    const v = b[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (typeof v === "number" && String(v).trim().length > 0) return String(v).trim();
  }
  return "";
}

authRouter.post(
  "/signup",
  catchAsync(async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const name = readSignupName(req.body);

    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
    if (password.length < 8 || password.length > 200) return res.status(400).json({ error: "Invalid password" });
    if (name.length < 1 || name.length > 200) return res.status(400).json({ error: "Invalid name" });

    try {
      const passwordHash = await hashPassword(password);
      const user = await createUser(email, passwordHash, name);
      if (!user) return res.status(500).json({ error: "Failed to create user" });

      const id = String(user._id);
      const token = signAccessToken({ sub: id, email: user.email });
      return res.status(201).json({
        token,
        user: userPayload(user)
      });
    } catch (err) {
      const code = mongoErrorCode(err);
      if (code === 11000) return res.status(409).json({ error: "Email already in use" });
      if (code === 121) {
        const errInfo =
          typeof err === "object" && err !== null && "errInfo" in err ? (err as { errInfo: unknown }).errInfo : undefined;
        return res.status(400).json({
          error: err instanceof Error ? err.message : "Document failed MongoDB validation",
          ...(errInfo !== undefined ? { details: errInfo } : {})
        });
      }
      const message = formatSignupError(err);
      console.error("[auth/signup]", err);
      return res.status(500).json({ error: message });
    }
  })
);

authRouter.post(
  "/login",
  catchAsync(async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
    if (password.length < 1 || password.length > 200) return res.status(400).json({ error: "Invalid password" });

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const id = String(user._id);
    const token = signAccessToken({ sub: id, email: user.email });
    return res.json({ token, user: userPayload(user) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  catchAsyncAuthed(async (req, res) => {
    const u = await findUserById(req.user!.id);
    if (!u) return res.status(404).json({ error: "User not found" });
    return res.json({ user: userPayload(u) });
  })
);

authRouter.get(
  "/users",
  requireAuth,
  catchAsyncAuthed(async (_req, res) => {
    const users = await listAssignableUsers();
    return res.json({ users });
  })
);

async function handleUpdateProfile(req: AuthedRequest, res: Response) {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (name.length < 1 || name.length > 200) return res.status(400).json({ error: "Invalid name" });

  const u = await updateUserName(req.user!.id, name);
  if (!u) return res.status(404).json({ error: "User not found" });
  return res.json({ user: userPayload(u) });
}

authRouter.patch("/profile", requireAuth, catchAsyncAuthed(handleUpdateProfile));
authRouter.post("/profile", requireAuth, catchAsyncAuthed(handleUpdateProfile));

async function handleUpdatePassword(req: AuthedRequest, res: Response) {
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (currentPassword.length < 1 || newPassword.length < 8 || newPassword.length > 200) {
    return res.status(400).json({ error: "Invalid password fields" });
  }

  const u = await findUserById(req.user!.id);
  if (!u) return res.status(404).json({ error: "User not found" });

  const ok = await verifyPassword(currentPassword, u.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

  const passwordHash = await hashPassword(newPassword);
  await updateUserPasswordHash(req.user!.id, passwordHash);
  return res.json({ ok: true });
}

authRouter.patch("/password", requireAuth, catchAsyncAuthed(handleUpdatePassword));
authRouter.post("/password", requireAuth, catchAsyncAuthed(handleUpdatePassword));
