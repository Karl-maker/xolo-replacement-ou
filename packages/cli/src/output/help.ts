import type { AnyCommand } from "../framework/define-command.js";
import { GLOBAL_OPTIONS, type HelpScope } from "../framework/parse.js";

const EXIT_CODES = [
  "0  success",
  "1  unexpected failure",
  "2  usage error (bad flag or argument)",
  "3  not found",
  "4  not signed in, or not allowed",
  "5  conflict (already exists)",
  "6  service unavailable",
  "7  confirmation required (pass --yes)",
];

const optionLine = (flags: string, description: string) =>
  `  ${flags.padEnd(30)} ${description}`;

function globalOptions(): string[] {
  return Object.entries(GLOBAL_OPTIONS).map(([name, o]) => {
    const short = "short" in o ? `-${o.short}, ` : "    ";
    const value = o.type === "string" ? ` <${name}>` : "";
    return optionLine(`${short}--${name}${value}`, o.description);
  });
}

export function helpFor(
  scope: HelpScope,
  commands: readonly AnyCommand[],
): string {
  if (scope.type === "command") return commandHelp(scope.command);

  const list =
    scope.type === "group"
      ? commands.filter((c) => c.name.startsWith(`${scope.group} `))
      : commands;
  const width = Math.max(...list.map((c) => c.name.length));
  const lines = list.map((c) => `  ${c.name.padEnd(width)}  ${c.summary}`);

  if (scope.type === "group") {
    return [
      `oum ${scope.group}`,
      "",
      "Commands:",
      ...lines,
      "",
      `Run \`oum ${scope.group} <command> --help\` for details.`,
      "",
    ].join("\n");
  }

  return [
    "oum - OÜ business manager",
    "",
    "Usage:",
    "  oum <command> [options]",
    "",
    "Commands:",
    ...lines,
    "",
    "Global options:",
    ...globalOptions(),
    optionLine("-v, --version", "Show the version"),
    "",
    "Exit codes:",
    ...EXIT_CODES.map((l) => `  ${l}`),
    "",
  ].join("\n");
}

function commandHelp(cmd: AnyCommand): string {
  const args = (cmd.args ?? [])
    .map((a) => (a.required ? `<${a.name}>` : `[${a.name}]`))
    .join(" ");
  const own = Object.entries(cmd.options ?? {}).map(([name, o]) => {
    const short = o.short ? `-${o.short}, ` : "    ";
    return optionLine(
      `${short}--${name}${o.type === "string" ? ` <${name}>` : ""}`,
      o.description,
    );
  });
  const argLines = (cmd.args ?? []).map((a) =>
    optionLine(`<${a.name}>`, a.description),
  );

  return [
    `oum ${cmd.name} - ${cmd.summary}`,
    "",
    "Usage:",
    `  oum ${cmd.name}${args ? ` ${args}` : ""} [options]`,
    ...(argLines.length ? ["", "Arguments:", ...argLines] : []),
    ...(own.length ? ["", "Options:", ...own] : []),
    "",
    "Global options:",
    ...globalOptions(),
    "",
  ].join("\n");
}
