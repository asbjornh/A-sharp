module.exports = function(code, loc) {
  try {
    const { line, col: startCol } = loc.start;
    const endCol = loc.end.col + 1;
    const lineIndex = Math.max(1, line - 1);
    const sourceLines = code.split("\n");
    const lines = sourceLines
      .map((l, index) => `${String(index + 1).padEnd(3, " ")}|  ${l}`)
      .slice(lineIndex - 1, lineIndex + 2);

    const secondLine =
      "   |  " + " ".repeat(startCol - 1) + "^".repeat(endCol - startCol);
    lines.splice(Math.min(2, line), 0, secondLine);
    return lines.join("\n");
  } catch (e) {
    return "";
  }
};
