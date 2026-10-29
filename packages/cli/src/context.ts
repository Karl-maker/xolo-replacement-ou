import type { Core } from "@ou-manager/core";
import type { ResolvedActor } from "./auth/resolve-actor.js";
import type { Config, ConfigStore } from "./config/store.js";
import type { IO } from "./io/streams.js";
import type { Logger } from "./observability/logger.js";

// Everything the CLI needs from the outside world is passed in through Deps.
export interface Deps {
  io: IO;
  env: Record<string, string | undefined>;
  version: string;
  /** Lazy: the database is only opened when a command actually needs it. */
  core: () => Core;
  config: ConfigStore;
  logger: Logger;
}

export interface GlobalFlags {
  json: boolean;
  as: string | undefined;
  debug: boolean;
}

/** What a command receives. Built once per run by main(). */
export interface Context {
  io: IO;
  env: Record<string, string | undefined>;
  config: Config;
  configStore: ConfigStore;
  flags: GlobalFlags;
  core: () => Core;
  logger: Logger;
  /** Metadata shared by operational logs and successful business audit events. */
  invocation: { correlationId: string };
  /** Resolves who is acting (see auth/resolve-actor.ts). Memoised, and only evaluated when called. */
  actor: () => Promise<ResolvedActor>;
}
