import { parseName } from "../../domain/company/index.js";
import type { User } from "../../domain/user/index.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface AddUserInput {
  name: string;
  email?: string | undefined;
}

export const addUser =
  (users: UserRepository) =>
  async (input: AddUserInput): Promise<User> =>
    users.create({
      name: parseName(input.name, "person"),
      email: input.email?.trim().toLowerCase() || null,
    });
