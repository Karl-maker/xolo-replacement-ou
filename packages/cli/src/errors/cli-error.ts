import { ERROR_CODES, type ErrorCode } from "./codes.js";

export interface CliErrorInfo {
  code: ErrorCode;
  /** One human sentence. No stack traces. */
  message: string;
  /** What to do next. */
  hint?: string | undefined;
  details?: Record<string, unknown> | undefined;
  retryable?: boolean | undefined;
  cause?: unknown;
}

export class CliError extends Error {
  readonly info: CliErrorInfo;

  constructor(info: CliErrorInfo) {
    super(info.message, { cause: info.cause });
    this.name = "CliError";
    this.info = info;
  }

  get exitCode(): number {
    return ERROR_CODES[this.info.code];
  }
}
