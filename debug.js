const util = require("util");

const lexer = require("./lexer");
const parser = require("./parser");

const source = `
let some-func a b = {
  let newA = a * 2;
  newA + b;
};
let res = some-func 1.5 2;
`;

console.log("SOURCE", source);
const tokens = lexer(source);
console.log("TOKENS", tokens);
const ast = parser(source);
console.log("AST", util.inspect(ast, false, null, true));
