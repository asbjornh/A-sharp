const fs = require("fs");
const path = require("path");

const parse = require("../parser");
const lib = require("../lib");

module.exports = function importModule(sourcePath, cwd, tryEvaluate) {
  const errorMessage = `Module '${sourcePath}' not found.`;
  const isLib = !sourcePath.startsWith(".") && !sourcePath.startsWith("/");

  if (isLib) {
    const source = lib[sourcePath];
    if (typeof source === "object") return source;
    else if (typeof source === "string")
      return tryEvaluate(parse(source), { source, cwd }).__module;
    throw Error(errorMessage);
  }

  const sourceFile = path.resolve(cwd, sourcePath);
  if (!fs.existsSync(sourceFile)) throw Error(errorMessage);
  const source = fs.readFileSync(sourceFile, "utf8");
  const file = tryEvaluate(parse(source), {
    codeFrames: true,
    source,
    cwd: path.dirname(sourceFile)
  });
  if (!file || typeof file !== "object" || !file.__module)
    throw Error(`No modules exported from '${sourcePath}'`);
  return file.__module;
};
