const util = require("util");

const error = require("./util/error");
const lexer = require("./lexer");
const parser = require("./parser");
const eval = require("./eval");

const source = `
let map fn list = {
  let (x :: xs) = list;
  if xs == [] then [(fn x)]
  else fn x :: map fn xs
};

map (n => n + 2) [1 2 3 4]
`;

const print = (label, thing) =>
  console.log(label, util.inspect(thing, false, null, true));

console.log("SOURCE", source);

const tokens = lexer(source);
// print("TOKENS", tokens);

const ast = parser(source);
// print("AST", ast);

try {
  print("EVAL", eval(ast));
} catch (e) {
  error(e.message, source, e.node && e.node.loc, e.node && e.node.value);
}
