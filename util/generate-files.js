const fs = require("fs");
const path = require("path");

const generator = require("../generator");
const lib = require("../lib");
const parser = require("../parser");

const writeDependencies = (dependencies, cwd, outPath, libPath) => {
  const libName = path.basename(libPath);
  dependencies
    .filter(p => !lib[p])
    .forEach(p => {
      const sourcePath = path.resolve(cwd, p);
      const source = fs.readFileSync(sourcePath, "utf8");
      const { code, dependencies } = generator(parser(source, { source, cwd }));

      const filePath = path.resolve(outPath, p).replace(".asharp", ".js");
      try {
        fs.mkdirSync(path.dirname(filePath));
      } catch {}
      fs.writeFileSync(filePath, code);

      try {
        fs.symlinkSync(libPath, path.join(path.dirname(filePath), libName));
      } catch {}

      writeDependencies(
        dependencies,
        path.dirname(sourcePath),
        path.dirname(filePath),
        libPath
      );
    });
};

module.exports = (ast, cwd, inPath, outPath) => {
  const { code, dependencies } = generator(ast);

  const libPath = path.join(outPath, "asharp-lib");
  const fileName = path.basename(inPath, ".asharp") + ".js";
  try {
    fs.mkdirSync(outPath);
  } catch {}
  try {
    fs.mkdirSync(libPath);
  } catch {}

  fs.writeFileSync(path.join(outPath, fileName), code);
  Object.entries(lib).forEach(([name, source]) => {
    const filePath = path.join(libPath, `${name}.js`);
    if (typeof source === "object")
      fs.copyFileSync(
        path.resolve(__dirname, "../lib", `${name}.js`),
        filePath
      );
    if (typeof source === "string") {
      fs.writeFileSync(filePath, generator(parser(source)).code);
    }
  });
  writeDependencies(dependencies, cwd, outPath, libPath);
};
