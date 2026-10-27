/** A plain, aligned text table. Deliberately tiny: no colour, no wrapping. */
export function renderTable(headers: string[], rows: string[][]): string {
  const all = [headers, ...rows];
  const widths = headers.map((_, col) =>
    Math.max(...all.map((row) => (row[col] ?? "").length)),
  );
  const line = (row: string[]) =>
    row
      .map((cell, col) => cell.padEnd(widths[col] ?? 0))
      .join("  ")
      .trimEnd();
  return [line(headers), ...rows.map(line)].join("\n");
}
