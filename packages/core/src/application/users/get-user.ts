import { DomainError } from "../../domain/errors/index.js";
import type { User } from "../../domain/user/index.js";
import type { UserRepository } from "../ports/user-repository.js";

/** Finds a user by id, or by exact (case-insensitive) name when the name is unambiguous. */
export const getUser =
  (users: UserRepository) =>
  async (ref: string): Promise<User> => {
    const byId = await users.findById(ref);
    if (byId) return byId;

    const matches = (await users.list()).filter(
      (u) => u.name.toLowerCase() === ref.trim().toLowerCase(),
    );
    const [only] = matches;
    if (matches.length === 1 && only) return only;

    if (matches.length > 1) {
      throw new DomainError(
        "USER_NOT_FOUND",
        `More than one user is named "${ref}". Use the user id instead.`,
        {
          ref,
          candidates: matches.map((u) => u.id),
        },
      );
    }
    throw new DomainError("USER_NOT_FOUND", `No user found for "${ref}".`, {
      ref,
    });
  };
