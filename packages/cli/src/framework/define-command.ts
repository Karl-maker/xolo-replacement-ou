import type { z } from "zod";
import type { Context } from "../context.js";

export interface OptionSpec {
  type: "string" | "boolean";
  short?: string;
  description: string;
}

export interface ArgSpec {
  name: string;
  description: string;
  required?: boolean;
}

/**
 * Every command is one of these. It declares what it accepts (options, args, an input schema) and
 * what it does (run returns data, human says how to show it to a person). It never prints or exits.
 */
export interface CommandDef<S extends z.ZodType, R> {
  /** Position in the command tree: noun then verb, e.g. "company add". */
  name: string;
  summary: string;
  /** read: changes nothing. write: changes our own data. (commit, for filings, comes later.) */
  effect: "read" | "write";
  options?: Record<string, OptionSpec>;
  args?: ArgSpec[];
  /** Validates the parsed flags and arguments. Keys are camelCase: --registry-code becomes registryCode. */
  input: S;
  run(input: z.output<S>, ctx: Context): Promise<R>;
  human(result: R, ctx: Context): string;
}

// Method syntax above makes this assignment safe, so the registry can hold commands of every shape.
export type AnyCommand = CommandDef<z.ZodType, unknown>;

export function defineCommand<S extends z.ZodType, R>(
  def: CommandDef<S, R>,
): AnyCommand {
  return def as unknown as AnyCommand;
}
