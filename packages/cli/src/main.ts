import { resolveActor, type ResolvedActor } from "./auth/resolve-actor.js";
import type { Config } from "./config/store.js";
import type { Context, Deps, GlobalFlags } from "./context.js";
import { commands } from "./commands/index.js";
import { EXIT } from "./errors/codes.js";
import { mapError } from "./errors/map-error.js";
import { parseInvocation } from "./framework/parse.js";
import { helpFor } from "./output/help.js";
import { renderError, renderResult } from "./output/render.js";
import { randomUUID } from "node:crypto";

// main() is the whole program as a plain function: arguments in, exit code out.
// It never reads `process` and never exits, which is what makes it testable.
export async function main(argv: string[], deps: Deps): Promise<number> {
  // Needed even when parsing fails, so errors can still be printed as JSON or with details.
  const wantsJson = argv.includes("--json");
  const wantsDebug = argv.includes("--debug");
  const correlationId = randomUUID();

  try {
    if (argv[0] === "--version" || argv[0] === "-v") {
      deps.io.out.write(`${deps.version}\n`);
      return EXIT.ok;
    }

    const invocation = parseInvocation(argv, commands);

    if (invocation.kind === "help") {
      deps.io.out.write(helpFor(invocation.scope, commands));
      return EXIT.ok;
    }

    const config = await deps.config.read();
    const ctx = createContext(deps, config, invocation.flags, correlationId);
    const result = await invocation.command.run(invocation.input, ctx);
    renderResult(invocation.command, result, ctx);
    deps.logger.info("command.completed", {
      command: invocation.command.name,
      correlationId,
    });
    return EXIT.ok;
  } catch (error) {
    const mapped = mapError(error);
    deps.logger.error("command.failed", {
      correlationId,
      errorCode: mapped.info.code,
    });
    renderError(mapped, deps.io, { json: wantsJson, debug: wantsDebug });
    return mapped.exitCode;
  }
}

function createContext(
  deps: Deps,
  config: Config,
  flags: GlobalFlags,
  correlationId: string,
): Context {
  let actor: Promise<ResolvedActor> | undefined;
  return {
    io: deps.io,
    env: deps.env,
    config,
    configStore: deps.config,
    flags,
    core: deps.core,
    logger: deps.logger,
    invocation: { correlationId },
    // Resolved on first use only, so `oum user list` never needs a selected user.
    actor: () =>
      (actor ??= resolveActor({
        flagAs: flags.as,
        env: deps.env,
        config,
        core: deps.core,
      })),
  };
}
