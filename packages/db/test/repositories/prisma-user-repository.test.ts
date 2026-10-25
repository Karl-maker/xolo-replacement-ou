import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  closeDatabase,
  db,
  insertUser,
  resetDatabase,
} from "../support/test-db.js";

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe("PrismaUserRepository", () => {
  describe("create", () => {
    it("stores the user and returns exactly the domain fields", async () => {
      const user = await db.users.create({
        name: "Karl-Johan Bailey",
        email: "kj@example.com",
      });

      // toEqual on the whole object proves nothing else (such as updatedAt) leaks out of the select.
      expect(user).toEqual({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        name: "Karl-Johan Bailey",
        email: "kj@example.com",
        createdAt: expect.any(Date),
      });
    });

    it("translates a duplicate email into a domain error", async () => {
      await insertUser("First", "kj@example.com");

      await expect(
        db.users.create({ name: "Second", email: "kj@example.com" }),
      ).rejects.toMatchObject({
        code: "USER_ALREADY_EXISTS",
      });
    });

    it("allows any number of users without an email", async () => {
      await db.users.create({ name: "One", email: null });
      await db.users.create({ name: "Two", email: null });

      expect(await db.users.list()).toHaveLength(2);
    });
  });

  describe("findById", () => {
    it("finds an existing user", async () => {
      const id = await insertUser("Karl-Johan Bailey");

      expect(await db.users.findById(id)).toMatchObject({
        id,
        name: "Karl-Johan Bailey",
      });
    });

    it("returns null for a well-formed id that does not exist", async () => {
      expect(
        await db.users.findById("00000000-0000-4000-8000-000000000000"),
      ).toBeNull();
    });

    it("returns null, rather than throwing, for something that is not an id at all", async () => {
      expect(await db.users.findById("Karl-Johan Bailey")).toBeNull();
    });
  });

  describe("list", () => {
    it("returns users oldest first", async () => {
      const first = await insertUser("First");
      const second = await insertUser("Second");

      expect((await db.users.list()).map((u) => u.id)).toEqual([first, second]);
    });
  });
});
