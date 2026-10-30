import { describe, expect, it } from "vitest";
import { DomainError } from "@ou-manager/core";
import { main } from "../../src/main.js";
import { aCompany, aUser, testDeps } from "../helpers.js";

const me = aUser();

describe("oum company add", () => {
  it("sends an optional registration number and the default country to core", async () => {
    const t = testDeps();
    t.core.companies.add.mockResolvedValue(aCompany());

    const code = await main(
      [
        "company",
        "add",
        "--name",
        "Syncpoly OÜ",
        "--registry-code",
        "12345678",
      ],
      t.deps,
    );

    expect(code).toBe(0);
    expect(t.core.companies.add).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { kind: "user", userId: me.id },
        name: "Syncpoly OÜ",
        registryCode: "12345678",
        country: "EE",
        audit: expect.objectContaining({
          source: "cli",
          actorSource: "config",
          correlationId: expect.any(String),
        }),
      }),
    );
    expect(t.stdout()).toContain("Added Syncpoly OÜ (EE, 12345678).");
    expect(t.stderr()).toBe("");
  });

  it("allows a company to be added without a registration number", async () => {
    const t = testDeps();
    t.core.companies.add.mockResolvedValue(
      aCompany({
        name: "Learning collective",
        country: "US",
        registryCode: null,
      }),
    );

    expect(
      await main(
        ["company", "add", "--name", "Learning collective", "--country", "US"],
        t.deps,
      ),
    ).toBe(0);
    expect(t.core.companies.add).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Learning collective",
        country: "US",
      }),
    );
    expect(t.core.companies.add.mock.calls[0]?.[0]).not.toHaveProperty(
      "registryCode",
    );
    expect(t.stdout()).toContain("Added Learning collective (US).");
  });

  it("understands the short flags -n, -r and -c", async () => {
    const t = testDeps();
    t.core.companies.add.mockResolvedValue(aCompany());

    await main(
      ["company", "add", "-n", "Syncpoly OÜ", "-r", "12345678", "-c", "ee"],
      t.deps,
    );

    expect(t.core.companies.add).toHaveBeenCalledWith(
      expect.objectContaining({ country: "ee" }),
    );
  });

  it("uses the configured default country, which --country overrides", async () => {
    const t = testDeps({ config: { defaultCountry: "LV" } });
    t.core.companies.add.mockResolvedValue(aCompany());

    await main(["company", "add", "-n", "X", "-r", "12345678"], t.deps);
    await main(
      ["company", "add", "-n", "X", "-r", "12345678", "-c", "EE"],
      t.deps,
    );

    expect(t.core.companies.add.mock.calls.map((c) => c[0].country)).toEqual([
      "LV",
      "EE",
    ]);
  });

  it("prints a versioned JSON envelope on stdout with --json, and nothing on stderr", async () => {
    const t = testDeps();
    t.core.companies.add.mockResolvedValue(aCompany());

    await main(
      ["company", "add", "-n", "Syncpoly OÜ", "-r", "12345678", "--json"],
      t.deps,
    );

    expect(JSON.parse(t.stdout())).toMatchObject({
      schemaVersion: "1",
      ok: true,
      data: {
        name: "Syncpoly OÜ",
        country: "EE",
        registryCode: "12345678",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(t.stderr()).toBe("");
  });

  it("reports a missing --name as a usage error, without touching core", async () => {
    const t = testDeps();

    expect(await main(["company", "add", "-r", "12345678"], t.deps)).toBe(2);
    expect(t.stderr()).toContain("--name is required");
    expect(t.stderr()).toContain("oum company add --help");
    expect(t.stdout()).toBe("");
    expect(t.core.companies.add).not.toHaveBeenCalled();
  });

  it("rejects the misspelt flag from the original idea: a single dash means single letters", async () => {
    const t = testDeps();

    expect(
      await main(
        ["company", "add", "-n", "X", "-registration_no", "12345678"],
        t.deps,
      ),
    ).toBe(2);
    expect(t.core.companies.add).not.toHaveBeenCalled();
  });

  it.each([
    ["INVALID_REGISTRY_CODE", 2],
    ["COMPANY_ALREADY_EXISTS", 5],
    ["FORBIDDEN", 4],
  ] as const)("turns core's %s into exit code %i", async (domainCode, exit) => {
    const t = testDeps();
    t.core.companies.add.mockRejectedValue(
      new DomainError(domainCode, "Something specific."),
    );

    expect(
      await main(["company", "add", "-n", "X", "-r", "12345678"], t.deps),
    ).toBe(exit);
    expect(t.stderr()).toContain("Error: Something specific.");
    expect(t.stdout()).toBe("");
  });

  it("prints errors as JSON on stderr with --json, leaving stdout empty", async () => {
    const t = testDeps();
    t.core.companies.add.mockRejectedValue(
      new DomainError("COMPANY_ALREADY_EXISTS", "It exists."),
    );

    await main(
      ["company", "add", "-n", "X", "-r", "12345678", "--json"],
      t.deps,
    );

    expect(t.stdout()).toBe("");
    expect(JSON.parse(t.stderr())).toMatchObject({
      schemaVersion: "1",
      ok: false,
      error: {
        code: "CONFLICT",
        message: "It exists.",
        retryable: false,
        details: { domainCode: "COMPANY_ALREADY_EXISTS" },
      },
    });
  });

  it("exits 4 when nobody is selected, without touching core", async () => {
    const t = testDeps({ signedInAs: null });

    expect(
      await main(["company", "add", "-n", "X", "-r", "12345678"], t.deps),
    ).toBe(4);
    expect(t.stderr()).toContain("oum user use");
    expect(t.core.users.get).not.toHaveBeenCalled();
    expect(t.core.companies.add).not.toHaveBeenCalled();
  });

  it("hides the internals of an unexpected failure unless --debug is given", async () => {
    const t = testDeps();
    t.core.companies.add.mockRejectedValue(new Error("connection lost"));

    expect(
      await main(["company", "add", "-n", "X", "-r", "12345678"], t.deps),
    ).toBe(1);
    expect(t.stderr()).toContain("Unexpected error: connection lost");
    expect(t.stderr()).not.toContain("at ");

    const d = testDeps();
    d.core.companies.add.mockRejectedValue(new Error("connection lost"));
    await main(
      ["company", "add", "-n", "X", "-r", "12345678", "--debug"],
      d.deps,
    );
    expect(d.stderr()).toContain("at ");
  });
});

describe("oum company list", () => {
  it("shows a table of the user's companies", async () => {
    const t = testDeps();
    t.core.companies.list.mockResolvedValue([
      aCompany(),
      aCompany({
        name: "Old OÜ",
        registryCode: null,
        archivedAt: new Date(),
      }),
    ]);

    expect(await main(["company", "list"], t.deps)).toBe(0);
    expect(t.stdout()).toContain("NAME");
    expect(t.stdout()).toContain("Syncpoly OÜ");
    expect(t.stdout()).toMatch(/Old OÜ\s+EE\s+—\s+archived/);
  });

  it("explains what to do when there are no companies", async () => {
    const t = testDeps();
    t.core.companies.list.mockResolvedValue([]);

    await main(["company", "list"], t.deps);

    expect(t.stdout()).toContain("oum company add");
  });

  it("passes --include-archived to core", async () => {
    const t = testDeps();
    t.core.companies.list.mockResolvedValue([]);

    await main(["company", "list"], t.deps);
    await main(["company", "list", "--include-archived"], t.deps);

    expect(
      t.core.companies.list.mock.calls.map((c) => c[0].includeArchived),
    ).toEqual([false, true]);
  });
});

describe("oum company show", () => {
  it("looks a company up by registration number, with the default country", async () => {
    const t = testDeps();
    t.core.companies.get.mockResolvedValue(aCompany());

    expect(await main(["company", "show", "12345678"], t.deps)).toBe(0);
    expect(t.core.companies.get).toHaveBeenCalledWith({
      actor: { kind: "user", userId: me.id },
      ref: "12345678",
      country: "EE",
    });
    expect(t.stdout()).toContain("registration:  12345678");
  });

  it("exits 3 when the company is not found", async () => {
    const t = testDeps();
    t.core.companies.get.mockRejectedValue(
      new DomainError("COMPANY_NOT_FOUND", 'No company found for "10422334".'),
    );

    expect(await main(["company", "show", "10422334"], t.deps)).toBe(3);
    expect(t.stderr()).toContain("oum company list");
  });

  it("requires the <ref> argument", async () => {
    const t = testDeps();

    expect(await main(["company", "show"], t.deps)).toBe(2);
    expect(t.stderr()).toContain("missing required argument <ref>");
  });
});

describe("oum company archive", () => {
  it("refuses to run without --yes, and does not even look the user up", async () => {
    const t = testDeps();

    expect(await main(["company", "archive", "12345678"], t.deps)).toBe(7);
    expect(t.stderr()).toContain("--yes");
    expect(t.core.users.get).not.toHaveBeenCalled();
    expect(t.core.companies.archive).not.toHaveBeenCalled();
  });

  it("archives with --yes (or -y)", async () => {
    const t = testDeps();
    t.core.companies.archive.mockResolvedValue(
      aCompany({ archivedAt: new Date() }),
    );

    expect(
      await main(["company", "archive", "12345678", "--yes"], t.deps),
    ).toBe(0);
    expect(await main(["company", "archive", "12345678", "-y"], t.deps)).toBe(
      0,
    );
    expect(t.core.companies.archive).toHaveBeenCalledTimes(2);
    expect(t.stdout()).toContain("Archived Syncpoly OÜ");
  });

  it("has no delete command: records are archived, never erased", async () => {
    const t = testDeps();

    expect(await main(["company", "delete", "12345678"], t.deps)).toBe(2);
    expect(t.stderr()).toContain('unknown command "company delete"');
  });
});
