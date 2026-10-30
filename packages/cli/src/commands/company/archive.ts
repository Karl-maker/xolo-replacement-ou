import { z } from "zod";
import { CliError } from "../../errors/cli-error.js";
import { defineCommand } from "../../framework/define-command.js";

// Companies are archived (hidden from lists), never erased.
export default defineCommand({
  name: "company archive",
  summary: "Archive a company (hides it from lists; the records are kept)",
  effect: "write",
  args: [
    {
      name: "ref",
      description: "Registration number or company id",
      required: true,
    },
  ],
  options: {
    country: {
      type: "string",
      short: "c",
      description:
        "Country of the registration number (default: the configured default)",
    },
    yes: { type: "boolean", short: "y", description: "Confirm without asking" },
  },
  input: z.object({
    ref: z.string().min(1),
    country: z.string().optional(),
    yes: z.boolean().optional(),
  }),
  async run(input, ctx) {
    // Check confirmation first: a script that forgot --yes must fail before anything is looked up.
    if (!input.yes) {
      throw new CliError({
        code: "CONFIRMATION_REQUIRED",
        message:
          "Archiving hides the company from your lists, and this CLI cannot undo it yet.",
        hint: "Run it again with --yes to confirm.",
      });
    }
    const { actor, source } = await ctx.actor();
    return ctx.core().companies.archive({
      actor,
      ref: input.ref,
      country: input.country ?? ctx.config.defaultCountry,
      audit: {
        correlationId: ctx.invocation.correlationId,
        source: "cli",
        actorSource: source,
      },
    });
  },
  human: (c) =>
    `Archived ${c.name} (${c.country}${c.registryCode ? `, ${c.registryCode}` : ""}).`,
});
