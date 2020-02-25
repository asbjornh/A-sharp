const fs = require("fs");
const path = require("path");

const parse = require("../parser");

const libPath = fileName => path.resolve(__dirname, `../lib/${fileName}`);
const lib = {
  list: libPath("list.asharp")
};

module.exports = function importModule(sourcePath, cwd, eval) {
  const errorMessage = `Module '${sourcePath}' not found.`;
  const isLib = !sourcePath.startsWith(".") && !sourcePath.startsWith("/");
  const filePath = isLib ? lib[sourcePath] : path.resolve(cwd, sourcePath);

  if (!fs.existsSync(filePath)) throw Error(errorMessage);
  const source = fs.readFileSync(filePath, "utf8");
  const file = eval(parse(source), source, cwd);
  if (!file || typeof file !== "object" || !file.__module)
    throw Error(`No modules exported from '${sourcePath}'`);
  return file.__module;
};
