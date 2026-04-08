import { apiGet } from "./api";

export type AssignableUser = { id: string; email: string; name: string };

export async function getAssignableUsers(token: string) {
  return apiGet<{ users: AssignableUser[] }>("/auth/users", token);
}
