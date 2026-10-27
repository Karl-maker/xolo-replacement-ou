import { z } from "zod";
import { defineCommand } from "../../framework/define-command.js";

export default defineCommand({
  name: "user use",
  summary: "Choose which user later commands act as",
  effect: "write",
  args: [{ name: "ref", description: "User name or id", required: true }],
  input: z.object({ ref: z.string().min(1) }),
  async run(input, ctx) {
    const user = await ctx.core().users.get(input.ref);
    await ctx.configStore.update({ activeUser: user.id }); // store the id: names can change
    return user;
  },
  human: (user) => `Now acting as ${user.name} (${user.id}).`,
});
