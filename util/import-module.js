const fs = require("fs");
const path = require("path");

const parse = require("../parser");

const lib = {};

module.exports = function importModule(sourcePath, cwd, eval) {
  const errorMessage = `Module '${sourcePath}' not found.`;
  const isLib = !sourcePath.startsWith(".") && !sourcePath.startsWith("/");
  if (isLib) {
    const libModule = lib[sourcePath];
    if (!libModule) throw Error(errorMessage);
    return libModule;
  } else {
    const filePath = path.resolve(cwd, sourcePath);
    if (!fs.existsSync(filePath)) throw Error(errorMessage);
    const source = fs.readFileSync(filePath, "utf8");
    const file = eval(parse(source), source, cwd);
    if (!file || typeof file !== "object" || !file.__module)
      throw Error(`No modules exported from '${sourcePath}'`);
    return file.__module;
  }
};
