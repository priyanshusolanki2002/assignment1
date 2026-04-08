import mongoose, { type InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true, maxlength: 200, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false, collection: "users" }
);

export type User = InferSchemaType<typeof userSchema>;

// Drop stale model so this schema (including `name`) is always the one Mongoose uses.
if (mongoose.models.User) {
  mongoose.deleteModel("User");
}

export const UserModel = mongoose.model("User", userSchema);

