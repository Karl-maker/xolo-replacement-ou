import type { NewUser, User } from "../../domain/user/index.js";

export interface UserRepository {
  /** Throws DomainError("USER_ALREADY_EXISTS") if the email is taken. */
  create(input: NewUser): Promise<User>;
  findById(id: string): Promise<User | null>;
  list(): Promise<User[]>;
}
