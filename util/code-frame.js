module.exports = function(code, line, startCol, endCol) {
  try {
    const lineIndex = Math.max(1, line - 1);
    const sourceLines = code.split("\n");
    const lines = sourceLines
      .slice(lineIndex - 1, lineIndex + 2)
      .map((l, index) => `${index + lineIndex} |  ${l}`);

    const secondLine =
      "  |  " + " ".repeat(startCol - 1) + "^".repeat(endCol - startCol);
    lines.splice(Math.min(2, line), 0, secondLine);
    return lines.join("\n");
  } catch (e) {
    return "";
  }
};
