
// import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";

import { connectToMongo } from "./mongo.js";
import { authRouter } from "./auth/routes.js";
import { tasksRouter } from "./tasks/routes.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.type("text/plain").send("OK");
});

let mongoConnected = false;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", mongoConnected });
});

app.use("/auth", authRouter);
app.use("/tasks", tasksRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[api]", err);
  const code =
    typeof err === "object" && err !== null && "code" in err && typeof (err as { code: unknown }).code === "number"
      ? (err as { code: number }).code
      : undefined;

  if (code === 121) {
    const message =
      err instanceof Error
        ? err.message
        : "Document failed validation (MongoDB code 121). Update Atlas JSON Schema for collection `users` to allow `name`, or set MONGO_BYPASS_COLLECTION_VALIDATION=true.";
    const errInfo =
      typeof err === "object" && err !== null && "errInfo" in err ? (err as { errInfo: unknown }).errInfo : undefined;
    if (!res.headersSent) {
      res.status(400).json({
        error: message,
        ...(errInfo !== undefined ? { details: errInfo } : {})
      });
    }
    return;
  }

  const status =
    typeof err === "object" && err !== null && "status" in err && typeof (err as { status: unknown }).status === "number"
      ? (err as { status: number }).status
      : 500;
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : typeof err === "object" && err !== null && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Server error";
  if (!res.headersSent) {
    res.status(status).json({ error: message });
  }
});

// Default 4000 so it matches web's NEXT_PUBLIC_API_URL when .env is missing.
const PORT = Number(process.env.PORT ?? 4000);
if (!Number.isFinite(PORT)) throw new Error("PORT must be a number");

const HOST = process.env.HOST;

function listen() {
  if (HOST && HOST.length > 0) {
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  } else {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

listen();

async function connectMongoInBackground() {
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      console.log(`Connecting to MongoDB (attempt ${attempt})...`);
      await connectToMongo();
      mongoConnected = true;
      console.log("Connected to MongoDB.");
      return;
    } catch (err) {
      mongoConnected = false;
      console.error("MongoDB connection failed:", err);
      const delayMs = Math.min(30_000, 1000 * 2 ** Math.min(5, attempt - 1));
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

void connectMongoInBackground();
