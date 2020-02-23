const codeFrame = require("./code-frame");

const keywords = ["let", "true", "false", "if", "else", "then"];
/* prettier-ignore */
const operators = [
  "|>", ">>",
  "<=", ">=", "!=", "==", "||", "&&",
  "<", ">", "=", "+", "-", "/", "%", "*"
];
const punctuation = "()[]{};?:";

const isId = str => str && /^[a-zA-Z-]*$/.test(str);
const isKw = str => str && keywords.includes(str);
const isNum = str => str && /^\d*\.?\d*$/.test(str);
const isOp = str => str && operators.includes(str);
const isPunc = str => str && punctuation.includes(str);
const isString = str => str && /^".*"$/.test(str);

const reducer = ([tokens, stack, line, col], char, index, input) => {
  const consumeStack = (type, value = stack) => {
    const loc = { line, col: col - stack.length + 1 };
    return [tokens.concat({ type, value, loc }), char, line, col + 1];
  };

  const next = () => [tokens, stack + char, line, col + 1];
  const skip = () => [tokens, char, line, col + 1];

  if (isPunc(stack)) return consumeStack("punc");
  if (isKw(stack) && !isId(char)) return consumeStack("kw");
  if (isOp(stack)) return isOp(stack + char) ? next() : consumeStack("op");
  if (isId(stack) && !isId(char)) return consumeStack("id");
  if (isNum(stack) && !isNum(char)) return consumeStack("number");
  if (isString(stack) && !isString(char))
    return consumeStack("string", stack.replace(/"/g, ""));

  // NOTE: If the stack holds any value when reaching the end of the line, the first character of the stack is invalid
  if (stack && char === "\n" && stack !== "\n") {
    console.log(stack);
    const errCol = col - stack.length + 1;
    const cf = codeFrame(input.join(""), line, errCol, errCol + 1);
    const character = stack[0] === "\n" ? "newline" : `character '${stack[0]}'`;
    console.error(`${cf}\n\nParse error: Unexpected ${character}`);
    process.exit(1);
  }

  if (stack === "\n") return [tokens, char, line + 1, 1];
  if (stack === " ") return skip();

  return next();
};

module.exports = source => {
  // NOTE: Ensure file ends with \n to avoid handling end of file as a separate case
  const str = source.endsWith("\n") ? source : `${source}\n`;
  const [tokens] = str.split("").reduce(reducer, [[], "", 1, 0]);
  return tokens;
};
