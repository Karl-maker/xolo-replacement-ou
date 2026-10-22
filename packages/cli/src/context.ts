import type { IO } from "./io/streams.js";

// It will grow (config, client, clock). The rule stays the same: nothing below
// bin.ts reaches for `process`, the clock or the network directly.
export interface Deps {
  io: IO;
  env: Record<string, string | undefined>;
  version: string;
}