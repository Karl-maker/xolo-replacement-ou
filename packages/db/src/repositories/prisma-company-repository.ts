import {
  DomainError,
  parseCountryCode,
  type Company,
  type CompanyRef,
  type CompanyRepository,
  type NewCompany,
} from "@ou-manager/core";
import { isUniqueViolation } from "../errors.js";
import type { PrismaClient } from "../generated/client.js";

type CompanyPrisma = Pick<PrismaClient, "company">;

const select = {
  id: true,
  country: true,
  registryCode: true,
  name: true,
  createdAt: true,
  archivedAt: true,
} as const;

type Row = {
  id: string;
  country: string;
  registryCode: string;
  name: string;
  createdAt: Date;
  archivedAt: Date | null;
};

const toCompany = (row: Row): Company => ({
  ...row,
  country: parseCountryCode(row.country),
});

export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: CompanyPrisma) {}

  async create(input: NewCompany, ownerId: string): Promise<Company> {
    try {
      const row = await this.prisma.company.create({
        data: {
          ...input,
          memberships: { create: { userId: ownerId, role: "OWNER" } },
        },
        select,
      });
      return toCompany(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError(
          "COMPANY_ALREADY_EXISTS",
          `A company with registry code ${input.registryCode} already exists in ${input.country}.`,
          { country: input.country, registryCode: input.registryCode },
        );
      }
      throw error;
    }
  }

  async findForUser(userId: string, ref: CompanyRef): Promise<Company | null> {
    const row = await this.prisma.company.findFirst({
      where: {
        memberships: { some: { userId } },
        ...("id" in ref ? { id: ref.id } : ref),
      },
      select,
    });
    return row ? toCompany(row) : null;
  }

  async listForUser(
    userId: string,
    { includeArchived }: { includeArchived: boolean },
  ): Promise<Company[]> {
    const rows = await this.prisma.company.findMany({
      where: {
        memberships: { some: { userId } },
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      select,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return rows.map(toCompany);
  }

  async archive(id: string, at: Date): Promise<Company> {
    return toCompany(
      await this.prisma.company.update({
        where: { id },
        data: { archivedAt: at },
        select,
      }),
    );
  }
}
