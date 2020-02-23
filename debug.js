const util = require("util");

const error = require("./error");
const lexer = require("./lexer");
const parser = require("./parser");
const eval = require("./eval");

const source = `
let fib n =
  if n == 0 then 0
  else if n == 1 then 1
  else (fib (n - 1)) + (fib (n - 2));

fib 10;
`;

const print = (label, thing) =>
  console.log(label, util.inspect(thing, false, null, true));

console.log("SOURCE", source);

// const tokens = lexer(source);
// print("TOKENS", tokens);

const ast = parser(source);
// print("AST", ast);

try {
  print("EVAL", eval(ast));
} catch (e) {
  error(e.message, source, e.node && e.node.loc);
}
