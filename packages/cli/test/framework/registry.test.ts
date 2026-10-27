import { describe, expect, it } from "vitest";
import { z } from "zod";
import { assertValidRegistry, commands } from "../../src/commands/index.js";
import { defineCommand } from "../../src/framework/define-command.js";
import { helpFor } from "../../src/output/help.js";

const make = (over: Partial<Parameters<typeof defineCommand>[0]> = {}) =>
  defineCommand({
    name: "a b",
    summary: "s",
    effect: "read",
    input: z.object({}),
    run: async () => null,
    human: () => "",
    ...over,
  } as never);

describe("the command registry", () => {
  it("is valid", () => {
    expect(() => assertValidRegistry(commands)).not.toThrow();
  });

  it("names every command as <noun> <verb>, except whoami", () => {
    for (const c of commands)
      expect(c.name).toMatch(/^([a-z]+ [a-z]+|whoami)$/);
  });

  it("rejects duplicate names", () => {
    expect(() => assertValidRegistry([make(), make()])).toThrow(
      /Duplicate command name "a b"/,
    );
  });

  it("rejects a command that redefines a global option", () => {
    const c = make({
      options: { json: { type: "boolean", description: "x" } },
    });
    expect(() => assertValidRegistry([c])).toThrow(/global option --json/);
  });

  it("rejects clashing short options", () => {
    const c = make({
      options: {
        aa: { type: "string", short: "a", description: "x" },
        bb: { type: "string", short: "a", description: "x" },
      },
    });
    expect(() => assertValidRegistry([c])).toThrow(/clashing short options/);
  });
});

describe("generated help", () => {
  it("lists every command with its summary", () => {
    const text = helpFor({ type: "root" }, commands);
    for (const c of commands) {
      expect(text).toContain(c.name);
      expect(text).toContain(c.summary);
    }
  });

  it("documents the options of a command, including the short flags and the global ones", () => {
    const add = commands.find((c) => c.name === "company add")!;
    const text = helpFor({ type: "command", command: add }, commands);

    expect(text).toContain("oum company add [options]");
    expect(text).toContain("-n, --name <name>");
    expect(text).toContain("-r, --registry-code <registry-code>");
    expect(text).toContain("--json");
    expect(text).toContain("--as <as>");
  });

  it("shows required arguments in the usage line", () => {
    const show = commands.find((c) => c.name === "company show")!;

    expect(helpFor({ type: "command", command: show }, commands)).toContain(
      "oum company show <ref> [options]",
    );
  });

  it("lists only a group's commands for group help", () => {
    const text = helpFor({ type: "group", group: "company" }, commands);

    expect(text).toContain("company add");
    expect(text).not.toContain("user add");
  });
});
