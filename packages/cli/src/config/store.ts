import { randomUUID } from "node:crypto";
import * as nodeFs from "node:fs/promises";
import path from "node:path";
import { CliError } from "../errors/cli-error.js";

/** Settings that belong to the person running the CLI, not to the company data. */
export interface Config {
  /** Id of the user commands act as, set by `oum user use`. */
  activeUser: string | undefined;
  /** Country used when a command is not given --country. */
  defaultCountry: string;
}

export const DEFAULT_CONFIG: Config = {
  activeUser: undefined,
  defaultCountry: "EE",
};

// A port: commands read and update settings through this, never through the filesystem directly.
export interface ConfigStore {
  read(): Promise<Config>;
  update(patch: Partial<Config>): Promise<Config>;
}

/** The slice of node:fs/promises we use, so tests can hand in a fake. */
export interface FsLike {
  readFile(file: string, encoding: "utf8"): Promise<string>;
  writeFile(
    file: string,
    data: string,
    options: { mode: number },
  ): Promise<void>;
  mkdir(
    dir: string,
    options: { recursive: true; mode: number },
  ): Promise<unknown>;
  rename(from: string, to: string): Promise<void>;
}

export function createFileConfigStore(
  file: string,
  fs: FsLike = nodeFs,
): ConfigStore {
  async function read(): Promise<Config> {
    let raw: string;
    try {
      raw = await fs.readFile(file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { ...DEFAULT_CONFIG };
      throw new CliError({
        code: "CONFIG",
        message: `Cannot read the config file ${file}.`,
        cause: error,
      });
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new CliError({
        code: "CONFIG",
        message: `The config file ${file} is not valid JSON.`,
        hint: "Fix it, or delete it to start again.",
        cause: error,
      });
    }

    const o = (typeof data === "object" && data !== null ? data : {}) as Record<
      string,
      unknown
    >;
    return {
      activeUser:
        typeof o["activeUser"] === "string" ? o["activeUser"] : undefined,
      defaultCountry:
        typeof o["defaultCountry"] === "string"
          ? o["defaultCountry"]
          : DEFAULT_CONFIG.defaultCountry,
    };
  }

  return {
    read,
    async update(patch) {
      const next = { ...(await read()), ...patch };
      // Private to the user (0700 folder, 0600 file) and replaced atomically, so a crash can never
      // leave a half-written file behind.
      await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      const temp = `${file}.${randomUUID()}.tmp`;
      await fs.writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, {
        mode: 0o600,
      });
      await fs.rename(temp, file);
      return next;
    },
  };
}
