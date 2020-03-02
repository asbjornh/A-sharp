const fs = require("fs");
const path = require("path");

global.__asharp = global.__asharp || {};

const g = global.__asharp;

module.exports = {
  cwd: process.cwd(),
  get dirname() {
    return g.cwd;
  },
  "read-file": source => {
    if (!source) throw Error("No path given");
    return fs.readFileSync(path.resolve(g.cwd, source), "utf8");
  },
  "write-file": outPath => content => {
    if (!source) throw Error("No path given");
    return fs.writeFileSync(path.resolve(g.cwd, outPath), content);
  },
  print: (...messages) => console.log(...messages),
  trace: label => value => console.log(label, value) || value
};
