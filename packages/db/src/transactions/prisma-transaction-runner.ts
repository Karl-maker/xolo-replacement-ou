import type { TransactionRunner } from "@ou-manager/core";
import type { PrismaClient } from "../generated/client.js";
import { PrismaAuditLog } from "../audit/prisma-audit-log.js";
import { PrismaCompanyRepository } from "../repositories/prisma-company-repository.js";
import { PrismaUserRepository } from "../repositories/prisma-user-repository.js";

/** Supplies repositories bound to one Prisma transaction to a core use case. */
export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(work: Parameters<TransactionRunner["run"]>[0]): Promise<T> {
    return this.prisma.$transaction(async (tx) =>
      work({
        users: new PrismaUserRepository(tx),
        companies: new PrismaCompanyRepository(tx),
        audit: new PrismaAuditLog(tx),
      }),
    ) as Promise<T>;
  }
}
