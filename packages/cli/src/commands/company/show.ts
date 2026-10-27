import { z } from "zod";
import { defineCommand } from "../../framework/define-command.js";
import { describeCompany } from "./format.js";

export default defineCommand({
  name: "company show",
  summary: "Show one company",
  effect: "read",
  args: [
    { name: "ref", description: "Registry code or company id", required: true },
  ],
  options: {
    country: {
      type: "string",
      short: "c",
      description:
        "Country of the registry code (default: the configured default)",
    },
  },
  input: z.object({ ref: z.string().min(1), country: z.string().optional() }),
  async run(input, ctx) {
    const { actor } = await ctx.actor();
    return ctx
      .core()
      .companies.get({
        actor,
        ref: input.ref,
        country: input.country ?? ctx.config.defaultCountry,
      });
  },
  human: describeCompany,
});
