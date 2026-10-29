/** A small, dependency-free structured logger for operational diagnostics. */
export interface Logger {
  info(event: string, attributes?: LogAttributes): void;
  error(event: string, attributes?: LogAttributes): void;
}

export type LogAttributes = Record<string, string | number | boolean | null>;

/**
 * Writes newline-delimited JSON to stderr, never stdout, so it cannot corrupt
 * command results or --json output. The audit trail is intentionally separate.
 */
export function createJsonLogger(options: {
  write: (line: string) => void;
  now?: () => Date;
  enabled?: boolean;
}): Logger {
  const now = options.now ?? (() => new Date());
  const enabled = options.enabled ?? true;

  const log = (level: "info" | "error", event: string, attributes = {}) => {
    if (!enabled) return;
    options.write(
      `${JSON.stringify({
        timestamp: now().toISOString(),
        level,
        event,
        ...attributes,
      })}\n`,
    );
  };

  return {
    info: (event, attributes) => log("info", event, attributes),
    error: (event, attributes) => log("error", event, attributes),
  };
}
