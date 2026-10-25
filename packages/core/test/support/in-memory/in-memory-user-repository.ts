import { randomUUID } from "node:crypto";
import {
  DomainError,
  type NewUser,
  type User,
  type UserRepository,
} from "../../../src/index.js";

/**
 * A working, in-memory UserRepository: a "fake".
 * It obeys the same rules as the real one (unique emails), so use cases can be tested for real
 * behaviour without a database.
 */
export class InMemoryUserRepository implements UserRepository {
  private rows: User[] = [];

  /** Test-only: put a user in place directly, without going through the code under test. */
  seed(user: User): User {
    this.rows.push(user);
    return user;
  }

  /** Test-only: look inside, to assert on what was stored. */
  all(): readonly User[] {
    return this.rows;
  }

  async create(input: NewUser): Promise<User> {
    if (
      input.email !== null &&
      this.rows.some((u) => u.email === input.email)
    ) {
      throw new DomainError(
        "USER_ALREADY_EXISTS",
        `A user with email ${input.email} already exists.`,
      );
    }
    return this.seed({
      id: randomUUID(),
      createdAt: new Date("2026-01-01T00:00:00Z"),
      ...input,
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.rows.find((u) => u.id === id) ?? null;
  }

  async list(): Promise<User[]> {
    return [...this.rows];
  }
}
