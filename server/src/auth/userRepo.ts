import mongoose from "mongoose";

import { connectToMongo } from "../mongo.js";
import { UserModel } from "./User.js";

function writeOpts(): { bypassDocumentValidation?: boolean } {
  return process.env.MONGO_BYPASS_COLLECTION_VALIDATION === "true"
    ? { bypassDocumentValidation: true }
    : {};
}

export async function findUserByEmail(email: string) {
  await connectToMongo();
  return UserModel.findOne({ email }).lean();
}

export async function findUserById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToMongo();
  return UserModel.findById(id).lean();
}

export async function createUser(email: string, passwordHash: string, name: string) {
  if (typeof name !== "string" || name.length < 1) {
    throw new Error("createUser: name must be a non-empty string");
  }

  await connectToMongo();
  const coll = UserModel.collection;
  const opts = writeOpts();
  const createdAt = new Date();
  const doc = { email, passwordHash, name, createdAt };

  const ins = await coll.insertOne(doc, opts);
  await coll.updateOne({ _id: ins.insertedId }, { $set: { name } }, opts);

  const saved = await coll.findOne({ _id: ins.insertedId });
  if (!saved) throw new Error("User insert failed");

  const savedName = (saved as Record<string, unknown>)["name"];
  if (typeof savedName !== "string" || !savedName.trim()) {
    const err = new Error(
      "MongoDB stored the user without `name`. Your Atlas collection validator is blocking that field. " +
      "Fix: Atlas → Database → Collections → users → Validation → add \"name\" (string) under properties, " +
      "or set additionalProperties: true. See server/schemas/atlas-users-json-schema.json. " +
      "Temporary workaround: set MONGO_BYPASS_COLLECTION_VALIDATION=true in server .env (requires a user with bypass permission)."
    );
    Object.assign(err, { code: 121 });
    throw err;
  }

  return saved as {
    _id: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    name: string;
    createdAt?: Date;
  };
}

export async function updateUserName(id: string, name: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToMongo();
  const oid = new mongoose.Types.ObjectId(id);
  const coll = UserModel.collection;
  const opts = writeOpts();
  await coll.updateOne({ _id: oid }, { $set: { name } }, opts);
  return UserModel.findById(id).lean();
}

/** Public directory for assignee pickers (no password hash). */
export async function listAssignableUsers() {
  await connectToMongo();
  const rows = await UserModel.find({})
    .select("_id email name")
    .sort({ name: 1, email: 1 })
    .limit(2000)
    .lean();
  return rows.map((u) => ({
    id: String(u._id),
    email: u.email,
    name: typeof u.name === "string" ? u.name : ""
  }));
}

export async function updateUserPasswordHash(id: string, passwordHash: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToMongo();
  const oid = new mongoose.Types.ObjectId(id);
  const coll = UserModel.collection;
  const opts = writeOpts();
  await coll.updateOne({ _id: oid }, { $set: { passwordHash } }, opts);
  return UserModel.findById(id).lean();
}
