import type { AnyCommand } from "../framework/define-command.js";
import companyAdd from "./company/add.js";
import companyArchive from "./company/archive.js";
import companyList from "./company/list.js";
import companyShow from "./company/show.js";
import userAdd from "./user/add.js";
import userList from "./user/list.js";
import userUse from "./user/use.js";
import whoami from "./whoami.js";

// The command registry: the one list of everything `oum` can do. Help, parsing and tests all read it.
export const commands: readonly AnyCommand[] = [
  userAdd,
  userList,
  userUse,
  whoami,
  companyAdd,
  companyList,
  companyShow,
  companyArchive,
];

/** Fails at startup, not in front of a user, if the registry is inconsistent. */
export function assertValidRegistry(list: readonly AnyCommand[]): void {
  const seen = new Set<string>();
  for (const c of list) {
    if (seen.has(c.name))
      throw new Error(`Duplicate command name "${c.name}".`);
    seen.add(c.name);
    if (!c.summary.trim())
      throw new Error(`Command "${c.name}" has no summary.`);
    for (const reserved of ["json", "as", "debug", "help"]) {
      if (c.options && reserved in c.options)
        throw new Error(
          `Command "${c.name}" redefines the global option --${reserved}.`,
        );
    }
    const shorts = Object.values(c.options ?? {}).flatMap((o) =>
      o.short ? [o.short] : [],
    );
    if (new Set(shorts).size !== shorts.length || shorts.includes("h")) {
      throw new Error(`Command "${c.name}" has clashing short options.`);
    }
  }
}

assertValidRegistry(commands);
