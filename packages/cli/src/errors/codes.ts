// Exit codes are part of the CLI's public contract. Keep this list small and documented.
// Never use values above 125: the shell reserves them for signals (128 + signal number).
export const EXIT = {
  ok: 0,
  failure: 1,
  usage: 2,
  notFound: 3,
  auth: 4,
  conflict: 5,
  unavailable: 6,
  approvalRequired: 7,
} as const;

// Every error the CLI can report has a stable code, and every code has exactly one exit code.
export const ERROR_CODES = {
  USAGE: EXIT.usage,
  NOT_FOUND: EXIT.notFound,
  AUTH_REQUIRED: EXIT.auth,
  FORBIDDEN: EXIT.auth,
  CONFLICT: EXIT.conflict,
  UNAVAILABLE: EXIT.unavailable,
  CONFIRMATION_REQUIRED: EXIT.approvalRequired,
  CONFIG: EXIT.failure,
  INTERNAL: EXIT.failure,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
