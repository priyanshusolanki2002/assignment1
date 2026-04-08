import mongoose, { type InferSchemaType } from "mongoose";

export const TASK_STATUSES = ["Todo", "In Progress", "Done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 5000 },
    status: { type: String, required: true, enum: TASK_STATUSES, default: "Todo", index: true },
    priority: { type: String, required: true, enum: TASK_PRIORITIES, default: "Medium", index: true },
    dueDate: { type: Date, default: null, index: true },
    assignedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true, versionKey: false }
);

taskSchema.index({ title: "text", description: "text" });

export type Task = InferSchemaType<typeof taskSchema>;

export const TaskModel = mongoose.models.Task ?? mongoose.model("Task", taskSchema);

