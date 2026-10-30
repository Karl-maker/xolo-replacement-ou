import { z } from "zod";
import { defineCommand } from "../../framework/define-command.js";

export default defineCommand({
  name: "company add",
  summary: "Add a company under the active user",
  effect: "write",
  options: {
    name: {
      type: "string",
      short: "n",
      description: 'Company name, e.g. "Syncpoly OÜ"',
    },
    "registry-code": {
      type: "string",
      short: "r",
      description: "Optional company registration number",
    },
    country: {
      type: "string",
      short: "c",
      description: "ISO country code (default: the configured default, EE)",
    },
  },
  input: z.object({
    name: z.string().min(1),
    registryCode: z.string().optional(),
    country: z.string().optional(),
  }),
  async run(input, ctx) {
    const { actor, source } = await ctx.actor();
    return ctx.core().companies.add({
      actor,
      name: input.name,
      ...(input.registryCode === undefined
        ? {}
        : { registryCode: input.registryCode }),
      country: input.country ?? ctx.config.defaultCountry,
      audit: {
        correlationId: ctx.invocation.correlationId,
        source: "cli",
        actorSource: source,
      },
    });
  },
  human: (c) =>
    `Added ${c.name} (${c.country}${c.registryCode ? `, ${c.registryCode}` : ""}).\nid: ${c.id}`,
});
