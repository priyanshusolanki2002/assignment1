import jwt, { type SignOptions } from "jsonwebtoken";

export type JwtUserPayload = {
  sub: string;
  email: string;
};

export function signAccessToken(payload: JwtUserPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing env var: JWT_SECRET");

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyAccessToken(token: string): JwtUserPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing env var: JWT_SECRET");

  const decoded = jwt.verify(token, secret);
  if (typeof decoded !== "object" || decoded === null) throw new Error("Invalid token");

  const sub = (decoded as Record<string, unknown>).sub;
  const email = (decoded as Record<string, unknown>).email;
  if (typeof sub !== "string" || typeof email !== "string") throw new Error("Invalid token payload");

  return { sub, email };
}

