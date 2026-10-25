import type { User } from "../../domain/user/index.js";
import type { UserRepository } from "../ports/user-repository.js";

export const listUsers = (users: UserRepository) => async (): Promise<User[]> =>
  users.list();
