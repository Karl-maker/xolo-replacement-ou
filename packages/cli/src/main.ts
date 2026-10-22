import type { Deps } from "./context.js";
import { EXIT } from "./errors/codes.js";

const HELP = `oum - OÜ business manager

Usage:
  oum <command> [options]

Options:
  -h, --help       Show this help
  -v, --version    Show the version

Exit codes:
  0  success
  1  unexpected failure
  2  usage error
`;

// Never reads `process`, never exits. That is what makes it testable.
export async function main(argv: string[], deps: Deps): Promise<number> {
  const [first] = argv;

  if (first === "--version" || first === "-v") {
    deps.io.out.write(`${deps.version}\n`);
    return EXIT.ok;
  }

  if (first === undefined || first === "--help" || first === "-h") {
    deps.io.out.write(HELP);
    return EXIT.ok;
  }

  deps.io.err.write(`Error: unknown command "${first}".\nRun \`oum --help\` to see what is available.\n`);
  return EXIT.usage;
}