const codeFrame = require("./code-frame");
const lexer = require("./lexer");
const stream = require("./stream");

const parse = (source, ts) => {
  const error = msg => {
    console.error(msg);
    process.exit(1);
  };
  const cfError = msg => {
    const token = ts.peek();
    const { line, col } = token.loc;
    const cf = codeFrame(source, line, col, col + token.value.length);
    const message = msg || `Unexpected token '${token.value}'.`;
    error(`${cf}\n\n${message}`);
  };

  const is = (type, value, token = ts.peek()) =>
    !ts.eof() && type === token.type && (!value || value === token.value);
  const isKw = str => is("kw", str);
  const isId = token => is("id", undefined, token);
  const isPunc = str => is("punc", str);
  const isOp = str => is("op", str);
  const isNum = () => is("number");
  const isStr = () => is("string");
  const isBool = () => isKw("true") || isKw("false");
  const isArray = () => isPunc("[");
  const isParam = () => isId() || isNum() || isStr() || isBool() || isArray();

  const skipPunc = char =>
    isPunc(char)
      ? ts.next()
      : cfError(`Expected '${char}' but got '${ts.peek().value}'`);

  const parseList = (start, stop, sep, parser) => {
    let expressions = [];
    let first = true;
    skipPunc(start);
    while (!ts.eof()) {
      if (isPunc(stop)) break;
      if (first) first = false;
      else if (sep) skipPunc(sep);
      if (isPunc(stop)) break;
      expressions.push(parser());
    }
    skipPunc(stop);
    return expressions;
  };

  const parseArray = () => {
    const { loc } = ts.peek();
    const elements = parseList("[", "]", null, parseExpression);
    return { type: "array", elements, loc };
  };

  const parseBlock = () => {
    const body = parseList("{", "}", ";", parseExpression);
    return body.length === 1 ? body : { type: "block", body };
  };

  const parseWhile = pred => {
    let nodes = [];
    while (!ts.eof() && pred(ts.peek())) nodes.push(parseAtom());
    return nodes;
  };

  const maybeBinary = left => {
    if (isOp()) {
      const tok = ts.peek();
      ts.next();
      const right = parseExpression();
      return { type: "binary", operator: tok.value, left, right };
    }
    return left;
  };

  const maybeCall = exprParser => {
    const expr = exprParser();
    return isParam() && isId(expr) ? parseCall(expr) : expr;
  };

  const parseCall = callee => ({
    type: "call",
    callee,
    args: parseWhile(isParam)
  });

  const parseNum = () => {
    const node = ts.next();
    return { ...node, value: parseFloat(node.value) };
  };

  const parseExpression = () =>
    maybeCall(() => maybeBinary(maybeCall(parseAtom)));

  const parseAssign = () => {
    ts.next();
    const tokens = parseWhile(isId);
    if (!isOp("=")) return cfError();
    ts.next();
    const [id, ...ids] = tokens;
    return {
      type: "assign",
      left: id,
      right: ids.length
        ? { type: "fun", args: ids, body: parseExpression() }
        : parseExpression()
    };
  };

  const parseAtom = () => {
    if (isPunc("{")) return parseBlock();
    if (isArray()) return parseArray();
    if (isKw("let")) return parseAssign();
    if (isBool()) return { type: "bool", value: ts.next().value === "true" };
    if (isNum()) return parseNum();
    if (isId()) return ts.next();
    cfError();
  };

  let body = [];
  while (!ts.eof()) {
    body.push(parseExpression());
    if (!ts.eof()) skipPunc(";");
  }
  return { type: "program", body };
};

module.exports = source => {
  return parse(source, stream(lexer(source)));
};
