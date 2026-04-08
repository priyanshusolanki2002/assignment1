import mongoose from "mongoose";

let connectPromise: Promise<typeof mongoose> | null = null;

export async function connectToMongo() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectPromise) return connectPromise;

  const uri = process.env.mongodb_uri;
  if (!uri) throw new Error("Missing env var: mongodb_uri");

  const dbName = process.env.MONGODB_DB ?? "task-manager";

  connectPromise = mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 5000
  });

  await connectPromise;
  return mongoose;
}

export async function closeMongo() {
  connectPromise = null;
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}
