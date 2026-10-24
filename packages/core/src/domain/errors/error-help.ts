import { ERROR_CATALOG } from "./error-catalog.js";
import type { DomainErrorCode } from "./errors.js";

export interface ErrorHelpOptions {
  docsBaseUrl?: string;
}

const DEFAULT_DOCS_BASE_URL = undefined;

export function getErrorHelp(
  code: DomainErrorCode,
  options: ErrorHelpOptions = {},
) {
  const definition = ERROR_CATALOG[code];
  const docsBaseUrl = options.docsBaseUrl ?? DEFAULT_DOCS_BASE_URL;

  return {
    ...definition,
    docsUrl:
      definition.docsPath && docsBaseUrl
        ? new URL(definition.docsPath, docsBaseUrl).toString()
        : undefined,
  };
}
