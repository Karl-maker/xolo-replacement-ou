#!/usr/bin/env node
// The ONLY file that touches `process`. Keep it boring.
import { createRequire } from "node:module";
import { main } from "./main.js";
import { createStreams } from "./io/streams.js";

// package.json is one level up from both src/ and dist/, so this works in dev and when built.
const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

// Ctrl-C: exit with the conventional 128 + SIGINT (2) = 130.
process.on("SIGINT", () => process.exit(130));

// `oum ... | head` closes our stdout early. That is the reader's choice, not an error.
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code !== "EPIPE") throw err;
  process.exit(0);
});

const io = createStreams({
  stdout: process.stdout,
  stderr: process.stderr,
  stdin: process.stdin,
  env: process.env,
});

// Set exitCode instead of calling process.exit(), so piped output can finish flushing.
process.exitCode = await main(process.argv.slice(2), { io, env: process.env, version });