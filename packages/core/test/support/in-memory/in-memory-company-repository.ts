import { randomUUID } from "node:crypto";
import {
  DomainError,
  type Company,
  type CompanyRef,
  type CompanyRepository,
  type NewCompany,
} from "../../../src/index.js";

/** A working, in-memory CompanyRepository, including the owner relationship and uniqueness rule. */
export class InMemoryCompanyRepository implements CompanyRepository {
  private rows: Company[] = [];
  private members = new Map<string, Set<string>>(); // companyId -> userIds

  /** Test-only: put a company in place (owned by `ownerId`) without using the code under test. */
  seed(company: Company, ownerId: string): Company {
    this.rows.push(company);
    this.members.set(company.id, new Set([ownerId]));
    return company;
  }

  /** Test-only: look inside, to assert on what was stored. */
  all(): readonly Company[] {
    return this.rows;
  }

  ownersOf(companyId: string): string[] {
    return [...(this.members.get(companyId) ?? [])];
  }

  async create(input: NewCompany, ownerId: string): Promise<Company> {
    if (
      input.registryCode !== null &&
      this.rows.some(
        (c) =>
          c.country === input.country && c.registryCode === input.registryCode,
      )
    ) {
      throw new DomainError(
        "COMPANY_ALREADY_EXISTS",
        `Company ${input.registryCode} already exists in ${input.country}.`,
      );
    }
    return this.seed(
      {
        id: randomUUID(),
        createdAt: new Date("2026-01-01T00:00:00Z"),
        archivedAt: null,
        ...input,
      },
      ownerId,
    );
  }

  async findForUser(userId: string, ref: CompanyRef): Promise<Company | null> {
    return (
      this.rows.find(
        (c) =>
          this.members.get(c.id)?.has(userId) === true &&
          ("id" in ref
            ? c.id === ref.id
            : c.country === ref.country && c.registryCode === ref.registryCode),
      ) ?? null
    );
  }

  async listForUser(
    userId: string,
    { includeArchived }: { includeArchived: boolean },
  ): Promise<Company[]> {
    return this.rows.filter(
      (c) =>
        this.members.get(c.id)?.has(userId) === true &&
        (includeArchived || c.archivedAt === null),
    );
  }

  async archive(id: string, at: Date): Promise<Company> {
    const company = this.rows.find((c) => c.id === id);
    if (!company)
      throw new DomainError("COMPANY_NOT_FOUND", `No company ${id}.`);
    company.archivedAt = at;
    return company;
  }
}
