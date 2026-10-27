import { z } from "zod";
import { defineCommand } from "../../framework/define-command.js";

export default defineCommand({
  name: "user add",
  summary: "Add a person who can own companies",
  effect: "write",
  options: {
    name: {
      type: "string",
      short: "n",
      description: 'Full name, e.g. "Karl-Johan Bailey"',
    },
    email: {
      type: "string",
      short: "e",
      description: "Email address (optional)",
    },
  },
  input: z.object({ name: z.string().min(1), email: z.string().optional() }),
  run: (input, ctx) =>
    ctx.core().users.add({ name: input.name, email: input.email }),
  human: (user) =>
    `Added ${user.name}.\nid: ${user.id}\nSelect this user with: oum user use "${user.name}"`,
});
