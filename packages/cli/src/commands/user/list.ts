import { z } from "zod";
import { defineCommand } from "../../framework/define-command.js";
import { renderTable } from "../../output/table.js";

export default defineCommand({
  name: "user list",
  summary: "List the people known to oum",
  effect: "read",
  input: z.object({}),
  run: (_input, ctx) => ctx.core().users.list(),
  human: (users) =>
    users.length === 0
      ? "No users yet. Add one with: oum user add --name <name>"
      : renderTable(
          ["NAME", "EMAIL", "ID"],
          users.map((u) => [u.name, u.email ?? "-", u.id]),
        ),
});
