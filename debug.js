const util = require("util");

const error = require("./util/error");
const lexer = require("./lexer");
const parser = require("./parser");
const eval = require("./eval");

const source = `
let map fn ls = {
  let (x :: xs) = ls;
  if (xs == []) then [(fn x)]
  else (fn x) :: (map fn xs)
};
let add a b = a + b;
map (add 2) [1 2]
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
