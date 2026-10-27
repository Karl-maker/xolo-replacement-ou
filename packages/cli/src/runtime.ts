import { createCore, type Core } from "@ou-manager/core";
import { createDatabase, type Database } from "@ou-manager/db";
import { createFileConfigStore } from "./config/store.js";
import type { Deps } from "./context.js";
import { CliError } from "./errors/cli-error.js";
import type { IO } from "./io/streams.js";

export interface Runtime {
  deps: Deps;
  /** Releases the database connection, if one was opened. Call once when the command is done. */
  close(): Promise<void>;
}

/**
 * The composition root: the one place where the real database, core and config file are wired together.
 * Everything is lazy, so `oum --help` and `oum --version` work with no database configured.
 */
export function createRuntime(options: {
  env: Record<string, string | undefined>;
  version: string;
  io: IO;
  configPath: string;
}): Runtime {
  let db: Database | undefined;
  let core: Core | undefined;

  const getCore = (): Core => {
    if (!core) {
      const connectionString = options.env["DATABASE_URL"];
      if (!connectionString) {
        throw new CliError({
          code: "CONFIG",
          message: "DATABASE_URL is not set, so oum cannot reach the database.",
          hint: "Set it, for example: export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oum",
        });
      }
      db = createDatabase({ connectionString });
      core = createCore({ users: db.users, companies: db.companies });
    }
    return core;
  };

  return {
    deps: {
      io: options.io,
      env: options.env,
      version: options.version,
      core: getCore,
      config: createFileConfigStore(options.configPath),
    },
    async close() {
      await db?.close();
    },
  };
}
