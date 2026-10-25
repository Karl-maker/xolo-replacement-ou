import {
  DomainError,
  type NewUser,
  type User,
  type UserRepository,
} from "@ou-manager/core";
import { isUniqueViolation } from "../errors.js";
import type { PrismaClient } from "../generated/client.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const select = { id: true, name: true, email: true, createdAt: true } as const;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: NewUser): Promise<User> {
    try {
      return await this.prisma.user.create({ data: input, select });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError(
          "USER_ALREADY_EXISTS",
          `A user with email ${input.email} already exists.`,
          {
            email: input.email,
          },
        );
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    if (!UUID.test(id)) return null; // not an id, so cannot match (and Postgres would reject it)
    return this.prisma.user.findUnique({ where: { id }, select });
  }

  async list(): Promise<User[]> {
    return this.prisma.user.findMany({ select, orderBy: { createdAt: "asc" } });
  }
}
