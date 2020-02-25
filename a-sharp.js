const fs = require("fs");
const path = require("path");

const lexer = require("./lexer");
const parser = require("./parser");
const eval = require("./eval");

const relPath = process.argv[2];
const printTokens = process.argv.includes("--tokens");
const printAst = process.argv.includes("--ast");
const printSource = process.argv.includes("--source");

if (!relPath) {
  console.error("No file specified");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), relPath);
const cwd = path.dirname(filePath);

const source = fs.readFileSync(filePath, "utf8");

const print = (label, thing) =>
  console.log(label, util.inspect(thing, false, null, true));

if (printSource) console.log("SOURCE", source);
if (printTokens) print("TOKENS", lexer(source));

const ast = parser(source);
if (printAst) print("AST", ast);

eval(ast, source, cwd);
