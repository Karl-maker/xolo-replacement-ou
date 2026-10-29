import { describe, expect, it } from "vitest";
import { createJsonLogger } from "../../src/observability/logger.js";

describe("createJsonLogger", () => {
  it("writes one structured, newline-delimited record", () => {
    let output = "";
    const logger = createJsonLogger({
      write: (line) => void (output += line),
      now: () => new Date("2026-10-29T09:00:00Z"),
    });

    logger.info("command.completed", { correlationId: "abc", count: 1 });

    expect(output).toBe(
      '{"timestamp":"2026-10-29T09:00:00.000Z","level":"info","event":"command.completed","correlationId":"abc","count":1}\n',
    );
  });

  it("can be disabled without writing anything", () => {
    let output = "";
    createJsonLogger({
      write: (line) => void (output += line),
      enabled: false,
    }).error("command.failed");
    expect(output).toBe("");
  });
});
