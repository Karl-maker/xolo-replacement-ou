import type { Context } from "../context.js";
import type { CliError } from "../errors/cli-error.js";
import type { AnyCommand } from "../framework/define-command.js";
import type { IO } from "../io/streams.js";

// The JSON shape is a public API: adding optional fields is fine; renaming or removing fields
// (or changing their types) means bumping schemaVersion.
const SCHEMA_VERSION = "1";

/** Success: data goes to stdout, and only data. */
export function renderResult(
  command: AnyCommand,
  result: unknown,
  ctx: Context,
): void {
  if (ctx.flags.json) {
    ctx.io.out.write(
      `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, ok: true, data: result }, null, 2)}\n`,
    );
  } else {
    ctx.io.out.write(`${command.human(result, ctx)}\n`);
  }
}

/** Failure: always stderr, so stdout stays clean for pipes. */
export function renderError(
  error: CliError,
  io: IO,
  options: { json: boolean; debug: boolean },
): void {
  const { code, message, hint, details, retryable } = error.info;

  if (options.json) {
    io.err.write(
      `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, ok: false, error: { code, message, hint, details, retryable: retryable ?? false } })}\n`,
    );
    return;
  }

  io.err.write(`Error: ${message}\n`);
  if (hint) io.err.write(`${hint}\n`);
  if (options.debug && error.cause instanceof Error)
    io.err.write(`\n${error.cause.stack ?? error.cause.message}\n`);
}
