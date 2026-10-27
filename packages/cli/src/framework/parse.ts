import { parseArgs } from "node:util";
import type { ZodError } from "zod";
import type { GlobalFlags } from "../context.js";
import { CliError } from "../errors/cli-error.js";
import type { AnyCommand } from "./define-command.js";

// Options every command accepts. `help` is handled by the parser; the rest become GlobalFlags.
export const GLOBAL_OPTIONS = {
  json: { type: "boolean", description: "Print the result as JSON" },
  as: {
    type: "string",
    description: "Act as this user (overrides OUM_USER and the active user)",
  },
  debug: {
    type: "boolean",
    description: "Show details when something goes wrong",
  },
  help: {
    type: "boolean",
    short: "h",
    description: "Show help for this command",
  },
} as const;

export type HelpScope =
  | { type: "root" }
  | { type: "group"; group: string }
  | { type: "command"; command: AnyCommand };

export type Invocation =
  | { kind: "help"; scope: HelpScope }
  | { kind: "run"; command: AnyCommand; input: unknown; flags: GlobalFlags };

const camel = (s: string) =>
  s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * argv -> which command, and validated input. Grammar: `oum <noun> <verb> [args] [--options]`.
 * The command words come first; options follow. This is the only file that knows how argv is parsed
 * (today node:util parseArgs), so swapping in Commander or similar later touches only this file.
 */
export function parseInvocation(
  argv: string[],
  commands: readonly AnyCommand[],
): Invocation {
  const words: string[] = [];
  for (const token of argv) {
    if (token.startsWith("-")) break;
    words.push(token);
  }

  // The longest command name that matches the leading words wins.
  let command: AnyCommand | undefined;
  let used = 0;
  for (let n = words.length; n > 0 && !command; n--) {
    command = commands.find((c) => c.name === words.slice(0, n).join(" "));
    if (command) used = n;
  }

  if (!command) {
    const group = words[0];
    if (group === undefined) {
      // `oum` and `oum --help` show the help. Anything else before a command (for example
      // `oum --as bob company list`) is an error: silently ignoring it would be worse.
      if (argv.every((token) => token === "--help" || token === "-h"))
        return { kind: "help", scope: { type: "root" } };
      throw new CliError({
        code: "USAGE",
        message: `options must come after the command, but found ${argv[0]} first.`,
        hint: "Put the command first, like: oum company list --as <user>.",
      });
    }
    const isGroup = commands.some((c) => c.name.startsWith(`${group} `));
    if (isGroup && words.length === 1)
      return { kind: "help", scope: { type: "group", group } };
    // Name only the part that was mistyped: "company delete", not "company delete 12345678".
    const attempted = isGroup ? words.slice(0, 2).join(" ") : group;
    throw new CliError({
      code: "USAGE",
      message: `unknown command "${attempted}".`,
      hint: isGroup
        ? `Run \`oum ${group} --help\` to see its commands.`
        : "Run `oum --help` to see what is available.",
    });
  }

  const cmd = command;
  const options = { ...GLOBAL_OPTIONS, ...(cmd.options ?? {}) };
  const spec = Object.fromEntries(
    Object.entries(options).map(([key, o]) => [
      key,
      "short" in o && o.short
        ? { type: o.type, short: o.short }
        : { type: o.type },
    ]),
  );

  let parsed;
  try {
    parsed = parseArgs({
      args: argv.slice(used),
      options: spec,
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? (error.message.split(". ")[0] ?? error.message)
        : String(error);
    throw new CliError({
      code: "USAGE",
      message: `${message.replace(/\.$/, "")}.`,
      hint: usageHint(cmd),
      cause: error,
    });
  }

  if (parsed.values["help"] === true)
    return { kind: "help", scope: { type: "command", command: cmd } };

  // Positional arguments, by the names the command declared.
  const argSpecs = cmd.args ?? [];
  if (parsed.positionals.length > argSpecs.length) {
    throw new CliError({
      code: "USAGE",
      message: `unexpected argument "${parsed.positionals[argSpecs.length]}".`,
      hint: usageHint(cmd),
    });
  }
  const raw: Record<string, unknown> = {};
  argSpecs.forEach((arg, i) => {
    const value = parsed.positionals[i];
    if (value === undefined && arg.required) {
      throw new CliError({
        code: "USAGE",
        message: `missing required argument <${arg.name}>.`,
        hint: usageHint(cmd),
      });
    }
    if (value !== undefined) raw[arg.name] = value;
  });

  for (const key of Object.keys(cmd.options ?? {})) {
    const value = parsed.values[key];
    if (value !== undefined) raw[camel(key)] = value;
  }

  const checked = cmd.input.safeParse(raw);
  if (!checked.success) {
    throw new CliError({
      code: "USAGE",
      message: describeIssues(checked.error, cmd),
      hint: usageHint(cmd),
      details: {
        issues: checked.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
  }

  const as = parsed.values["as"];
  return {
    kind: "run",
    command: cmd,
    input: checked.data,
    flags: {
      json: parsed.values["json"] === true,
      as: typeof as === "string" ? as : undefined,
      debug: parsed.values["debug"] === true,
    },
  };
}

const usageHint = (cmd: AnyCommand) =>
  `Run \`oum ${cmd.name} --help\` for usage.`;

function describeIssues(error: ZodError, cmd: AnyCommand): string {
  const optionNames = Object.keys(cmd.options ?? {}).map(camel);
  return error.issues
    .map((issue) => {
      const key = String(issue.path[0] ?? "");
      const label = optionNames.includes(key)
        ? `--${kebab(key)}`
        : key
          ? `<${key}>`
          : "input";
      const missing =
        issue.code === "invalid_type" &&
        /received undefined/.test(issue.message);
      return `${label} ${missing ? "is required" : issue.message}`;
    })
    .join("; ");
}
