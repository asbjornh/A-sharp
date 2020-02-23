const util = require("util");

const error = require("./error");
const lexer = require("./lexer");
const parser = require("./parser");
const eval = require("./eval");

const source = `
let div b a = a / b;
let add a b = a + b;
let fn = div 2 >> add 2;

let with-pipe = 10 |> div 2 |> add 2;
let with-composition = fn 10;

[ with-pipe with-composition (fn 10) ];
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
  error(e.message, source, e.node && e.node.loc, e.node && e.node.value);
}
