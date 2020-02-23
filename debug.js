const util = require("util");

const lexer = require("./lexer");
const parser = require("./parser");

const source = `
let a = 1 |> add 2 |> multiply 3 |> sum
`;

const print = (label, thing) =>
  console.log(label, util.inspect(thing, false, null, true));

console.log("SOURCE", source);

const tokens = lexer(source);
print("TOKENS", tokens);

const ast = parser(source);
print("AST", ast);
