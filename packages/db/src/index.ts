import type { CompanyRepository, UserRepository } from "@ou-manager/core";
import { createPrismaClient } from "./client.js";
import { PrismaCompanyRepository } from "./repositories/prisma-company-repository.js";
import { PrismaUserRepository } from "./repositories/prisma-user-repository.js";

export interface Database {
  /** Ready to hand to createCore(). */
  readonly users: UserRepository;
  readonly companies: CompanyRepository;
  /** Cheap connectivity check, for `oum doctor` and health pages. */
  ping(): Promise<void>;
  /** Releases the connection pool. Call once when the process is done. */
  close(): Promise<void>;
}

/**
 * The single entry point to the data. Nothing outside this package imports Prisma:
 * callers receive repositories that speak the language of @ou-manager/core.
 */
export function createDatabase(options: {
  connectionString: string;
}): Database {
  const prisma = createPrismaClient(options.connectionString);

  return {
    users: new PrismaUserRepository(prisma),
    companies: new PrismaCompanyRepository(prisma),
    async ping() {
      await prisma.$queryRaw`SELECT 1`;
    },
    async close() {
      await prisma.$disconnect();
    },
  };
}
