import { z } from "zod";
import { defineCommand } from "../../framework/define-command.js";
import { renderTable } from "../../output/table.js";

export default defineCommand({
  name: "company list",
  summary: "List your companies",
  effect: "read",
  options: {
    "include-archived": {
      type: "boolean",
      description: "Also show archived companies",
    },
  },
  input: z.object({ includeArchived: z.boolean().optional() }),
  async run(input, ctx) {
    const { actor } = await ctx.actor();
    return ctx
      .core()
      .companies.list({
        actor,
        includeArchived: input.includeArchived ?? false,
      });
  },
  human: (companies) =>
    companies.length === 0
      ? "No companies yet. Add one with: oum company add --name <name> --registry-code <code>"
      : renderTable(
          ["NAME", "COUNTRY", "REGISTRY CODE", "STATUS"],
          companies.map((c) => [
            c.name,
            c.country,
            c.registryCode,
            c.archivedAt ? "archived" : "active",
          ]),
        ),
});
