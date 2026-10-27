import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createFileConfigStore,
  DEFAULT_CONFIG,
} from "../../src/config/store.js";

// A real filesystem, in a throwaway folder: this is the one place file behaviour is worth proving.
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "oum-config-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("file config store", () => {
  it("returns the defaults when the file does not exist yet", async () => {
    const store = createFileConfigStore(
      path.join(dir, "nested", "config.json"),
    );

    expect(await store.read()).toEqual(DEFAULT_CONFIG);
  });

  it("saves and reads back a change, keeping what was not changed", async () => {
    const store = createFileConfigStore(path.join(dir, "config.json"));

    await store.update({ activeUser: "user-1" });
    await store.update({ defaultCountry: "LV" });

    expect(await store.read()).toEqual({
      activeUser: "user-1",
      defaultCountry: "LV",
    });
  });

  it("creates missing folders, and leaves no temporary files behind", async () => {
    const file = path.join(dir, "a", "b", "config.json");

    await createFileConfigStore(file).update({ activeUser: "user-1" });

    expect(await readdir(path.dirname(file))).toEqual(["config.json"]);
  });

  it.skipIf(process.platform === "win32")(
    "keeps the file private to the user (mode 0600)",
    async () => {
      const file = path.join(dir, "config.json");

      await createFileConfigStore(file).update({ activeUser: "user-1" });

      expect((await stat(file)).mode & 0o777).toBe(0o600);
    },
  );

  it("reports a corrupted file as a CONFIG error that names the file", async () => {
    const file = path.join(dir, "config.json");
    await writeFile(file, "{ not json");

    await expect(createFileConfigStore(file).read()).rejects.toMatchObject({
      info: { code: "CONFIG", message: expect.stringContaining(file) },
      exitCode: 1,
    });
  });

  it("ignores unknown keys and wrongly typed values rather than trusting them", async () => {
    const file = path.join(dir, "config.json");
    await writeFile(
      file,
      JSON.stringify({ activeUser: 42, defaultCountry: "LV", surprise: true }),
    );

    expect(await createFileConfigStore(file).read()).toEqual({
      activeUser: undefined,
      defaultCountry: "LV",
    });
  });

  it("writes readable JSON", async () => {
    const file = path.join(dir, "config.json");

    await createFileConfigStore(file).update({ activeUser: "user-1" });

    expect(JSON.parse(await readFile(file, "utf8"))).toMatchObject({
      activeUser: "user-1",
    });
  });
});
