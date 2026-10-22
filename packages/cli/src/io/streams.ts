export interface WritableLike {
  write(chunk: string): unknown;
  isTTY?: boolean | undefined;
  columns?: number | undefined;
}

export interface StreamSources {
  stdout: WritableLike;
  stderr: WritableLike;
  stdin: { isTTY?: boolean | undefined };
  env: Record<string, string | undefined>;
}

export interface IO {
  out: { write(s: string): void; isTTY: boolean; columns: number };
  err: { write(s: string): void; isTTY: boolean };
  /** Colour is allowed only on a TTY, and never when NO_COLOR is set. */
  colorEnabled: boolean;
  /** Prompts and spinners are allowed only when a person is at the terminal. */
  interactive: boolean;
}

export function createStreams(src: StreamSources): IO {
  const outTTY = src.stdout.isTTY === true;
  const errTTY = src.stderr.isTTY === true;
  const noColor = (src.env["NO_COLOR"] ?? "") !== "";

  return {
    out: {
      write: (s) => void src.stdout.write(s),
      isTTY: outTTY,
      columns: src.stdout.columns ?? 80,
    },
    err: {
      write: (s) => void src.stderr.write(s),
      isTTY: errTTY,
    },
    colorEnabled: outTTY && !noColor,
    interactive: outTTY && src.stdin.isTTY === true,
  };
}