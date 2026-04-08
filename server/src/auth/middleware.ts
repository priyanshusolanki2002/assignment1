import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "./jwt";

export type AuthedRequest = Request & {
  user?: { id: string; email: string };
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const [kind, token] = header.split(" ");

  if (kind !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

