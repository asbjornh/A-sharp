const util = require("util");

const error = require("./error");
const lexer = require("./lexer");
const parser = require("./parser");
const eval = require("./eval");

const source = `
let fib n =
  n == 0 ? 0 : n == 1 ? 1
  : (fib (n - 1)) + (fib (n - 2));

fib 6;
`;

const print = (label, thing) =>
  console.log(label, util.inspect(thing, false, null, true));

console.log("SOURCE", source);

// const tokens = lexer(source);
// print("TOKENS", tokens);

const ast = parser(source);
// print("AST", ast);

try {
  const result = eval(ast);
  print("EVAL", result);
} catch (e) {
  error(e.message, source, e.node && e.node.loc);
}
