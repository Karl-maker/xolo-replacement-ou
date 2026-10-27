import { z } from "zod";
import { SOURCE_LABEL, type ActorSource } from "../auth/resolve-actor.js";
import { defineCommand } from "../framework/define-command.js";

export default defineCommand({
  name: "whoami",
  summary: "Show who commands act as, and where that was decided",
  effect: "read",
  input: z.object({}),
  async run(_input, ctx) {
    const { user, source } = await ctx.actor();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      source: source as ActorSource,
    };
  },
  human: (me) => `${me.name} (${me.id})\nFrom ${SOURCE_LABEL[me.source]}.`,
});
