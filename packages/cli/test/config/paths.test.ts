import { describe, expect, it } from "vitest";
import { defaultConfigPath } from "../../src/config/paths.js";

describe("defaultConfigPath", () => {
  it("uses XDG_CONFIG_HOME when set", () => {
    expect(
      defaultConfigPath({
        env: { XDG_CONFIG_HOME: "/x" },
        platform: "linux",
        home: "/home/me",
      }),
    ).toBe("/x/oum/config.json");
  });

  it("falls back to ~/.config", () => {
    expect(
      defaultConfigPath({ env: {}, platform: "darwin", home: "/Users/me" }),
    ).toBe("/Users/me/.config/oum/config.json");
  });

  it("uses APPDATA on Windows", () => {
    expect(
      defaultConfigPath({
        env: { APPDATA: "C:\\Users\\me\\AppData\\Roaming" },
        platform: "win32",
        home: "C:\\Users\\me",
      }),
    ).toBe("C:\\Users\\me\\AppData\\Roaming\\oum\\config.json");
  });

  it("lets OUM_CONFIG override everything", () => {
    expect(
      defaultConfigPath({
        env: { OUM_CONFIG: "/tmp/test.json", XDG_CONFIG_HOME: "/x" },
        platform: "linux",
        home: "/h",
      }),
    ).toBe("/tmp/test.json");
  });
});
