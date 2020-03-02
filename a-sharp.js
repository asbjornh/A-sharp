const fs = require("fs");
const path = require("path");
const util = require("util");

const lexer = require("./lexer");
const parser = require("./parser");
const eval = require("./eval");
const generateFiles = require("./util/generate-files");

const { argv } = process;
const relPath = argv[2];
const shouldEval = argv.includes("--eval");
const outDir = argv.includes("--out")
  ? argv[argv.findIndex(a => a === "--out") + 1]
  : undefined;
const printTokens = argv.includes("--tokens");
const printAst = argv.includes("--ast");
const printSource = argv.includes("--source");

if (!relPath) {
  console.error("No file specified");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), relPath);
const cwd = path.dirname(filePath);

const source = fs.readFileSync(filePath, "utf8");

const print = (label, thing) =>
  console.log(label, util.inspect(thing, false, null, true), "\n");

if (printSource) console.log("SOURCE") || console.log(source, "\n");
if (printTokens) print("TOKENS", lexer(source));

const ast = parser(source);
if (printAst) print("AST", ast);

if (shouldEval) {
  eval(ast, { codeFrames: true, source, cwd });
} else {
  if (outDir) {
    generateFiles(ast, cwd, filePath, path.resolve(process.cwd(), outDir));
  } else {
    const { code } = generator(ast);
    console.log(code);
  }
}
