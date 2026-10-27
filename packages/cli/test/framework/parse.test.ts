import { describe, expect, it } from "vitest";
import { z } from "zod";
import { commands } from "../../src/commands/index.js";
import { defineCommand } from "../../src/framework/define-command.js";
import { parseInvocation } from "../../src/framework/parse.js";

const demo = [
  defineCommand({
    name: "thing add",
    summary: "Add a thing",
    effect: "write",
    options: {
      "full-name": { type: "string", short: "f", description: "n" },
      force: { type: "boolean", description: "f" },
    },
    args: [{ name: "target", description: "t", required: true }],
    input: z.object({
      target: z.string(),
      fullName: z.string().optional(),
      force: z.boolean().optional(),
    }),
    run: async () => null,
    human: () => "",
  }),
  defineCommand({
    name: "thing",
    summary: "A thing on its own",
    effect: "read",
    input: z.object({}),
    run: async () => null,
    human: () => "",
  }),
];

describe("parseInvocation", () => {
  it("picks the longest command name that matches", () => {
    const r = parseInvocation(["thing", "add", "x"], demo);
    expect(r).toMatchObject({ kind: "run", command: { name: "thing add" } });
  });

  it("turns --kebab-case flags into camelCase input and positionals into named input", () => {
    const r = parseInvocation(
      ["thing", "add", "x", "--full-name", "Bob", "--force"],
      demo,
    );
    expect(r).toMatchObject({
      kind: "run",
      input: { target: "x", fullName: "Bob", force: true },
    });
  });

  it("accepts short flags", () => {
    const r = parseInvocation(["thing", "add", "x", "-f", "Bob"], demo);
    expect(r).toMatchObject({ input: { fullName: "Bob" } });
  });

  it("reads the global flags", () => {
    const r = parseInvocation(
      ["thing", "add", "x", "--json", "--as", "bob", "--debug"],
      demo,
    );
    expect(r).toMatchObject({ flags: { json: true, as: "bob", debug: true } });
  });

  it("shows root help with no words, and group help for a bare group", () => {
    expect(parseInvocation([], demo)).toEqual({
      kind: "help",
      scope: { type: "root" },
    });
    expect(parseInvocation(["--help"], demo)).toEqual({
      kind: "help",
      scope: { type: "root" },
    });
    expect(parseInvocation(["company"], commands)).toEqual({
      kind: "help",
      scope: { type: "group", group: "company" },
    });
  });

  it("refuses options placed before the command, instead of silently showing help", () => {
    expect(() =>
      parseInvocation(["--as", "bob", "company", "list"], commands),
    ).toThrowError(
      expect.objectContaining({
        info: expect.objectContaining({
          code: "USAGE",
          message: expect.stringContaining(
            "options must come after the command",
          ),
        }),
      }),
    );
    expect(() => parseInvocation(["--json"], commands)).toThrow(
      /options must come after the command/,
    );
  });

  it("shows command help for --help and -h", () => {
    expect(parseInvocation(["thing", "add", "--help"], demo)).toMatchObject({
      kind: "help",
      scope: { type: "command" },
    });
    expect(parseInvocation(["thing", "add", "-h"], demo)).toMatchObject({
      kind: "help",
      scope: { type: "command" },
    });
  });

  it.each([
    ["an unknown command", ["nope"], 'unknown command "nope"'],
    [
      "an unknown subcommand",
      ["company", "nope"],
      'unknown command "company nope"',
    ],
    [
      "an unknown flag",
      ["thing", "add", "x", "--wat"],
      "Unknown option '--wat'",
    ],
    [
      "a flag that needs a value",
      ["thing", "add", "x", "--full-name"],
      "argument missing",
    ],
    [
      "an extra argument",
      ["thing", "add", "x", "y"],
      'unexpected argument "y"',
    ],
    [
      "a missing required argument",
      ["thing", "add"],
      "missing required argument <target>",
    ],
  ])("rejects %s as a usage error", (_label, argv, message) => {
    expect(() => parseInvocation(argv, demo.concat(commands))).toThrowError(
      expect.objectContaining({
        info: expect.objectContaining({
          code: "USAGE",
          message: expect.stringContaining(message),
        }),
      }),
    );
  });
});
