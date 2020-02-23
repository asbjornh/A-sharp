const throwError = require("./error");
const lexer = require("./lexer");
const stream = require("./stream");

/* prettier-ignore */
const precedence = {
  "=": 1,
  "||": 2,
  "&&": 3,
  "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
  "+": 10, "-": 10,
  "*": 20, "/": 20, "%": 20,
  "|>": 40, ">>": 40
};

// TODO: end loc
const parse = (source, ts) => {
  const error = msg => {
    const token = ts.peek();
    const message = msg || `Unexpected token '${token.value}'.`;
    throwError(message, source, token.loc, token.value);
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
  const isParam = () =>
    isId() || isNum() || isStr() || isBool() || isArray() || isPunc("(");

  const skipType = pred => value =>
    pred(value)
      ? ts.next()
      : error(`Expected '${value}' but got '${ts.peek().value}'`);

  const skipPunc = skipType(isPunc);
  const skipKw = skipType(isKw);

  const parseWhile = (pred, parser) => {
    let nodes = [];
    while (!ts.eof() && pred(ts.peek())) nodes.push(parser());
    return nodes;
  };

  const parseParenthesized = parser => {
    const start = skipPunc("(");
    if (isPunc(")")) {
      skipPunc(")");
      return { type: "unit", loc: start.loc };
    }
    const node = parser();
    skipPunc(")");
    return node;
  };

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
    const elements = parseList("[", "]", null, parseAtom);
    return { type: "array", elements, loc };
  };

  const parseBlock = () => {
    const body = parseList("{", "}", ";", parseExpression);
    return body.length === 1 ? body : { type: "block", body };
  };

  const parseIf = () => {
    skipKw("if");
    const condition = parseExpression();
    skipKw("then");
    const thenBranch = parseExpression();
    skipKw("else");
    const elseBranch = parseExpression();
    return {
      type: "if",
      condition,
      then: thenBranch,
      else: elseBranch
    };
  };

  const maybeTernary = first => {
    if (isPunc("?")) {
      skipPunc("?");
      const thenBranch = parseExpression();
      skipPunc(":");
      const elseBranch = parseExpression();
      return {
        type: "ternary",
        condition: first,
        then: thenBranch,
        else: elseBranch
      };
    }
    return first;
  };

  const maybeBinary = (left, leftPrec = 0) => {
    if (isOp()) {
      const tok = ts.peek();
      if (isOp("=")) error();
      const rightPrec = precedence[tok.value];
      if (rightPrec > leftPrec) {
        ts.next();
        const right = maybeBinary(maybeCall(parseAtom), rightPrec);
        const binary = { type: "binary", operator: tok.value, left, right };
        return maybeBinary(binary, leftPrec);
      }
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
    loc: callee.loc,
    args: parseWhile(isParam, parseAtom)
  });

  const parseNum = () => {
    const node = ts.next();
    return { ...node, value: parseFloat(node.value) };
  };

  const parseExpression = () =>
    maybeCall(() => maybeTernary(maybeBinary(maybeCall(parseAtom))));

  const parseAssign = () => {
    ts.next();
    const tokens = parseWhile(isId, parseAtom);
    if (!isOp("=")) return error();
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
    if (isPunc("(")) return parseParenthesized(parseExpression);
    if (isArray()) return parseArray();
    if (isKw("let")) return parseAssign();
    if (isKw("if")) return parseIf();
    if (isBool()) return { type: "bool", value: ts.next().value === "true" };
    if (isNum()) return parseNum();
    if (isStr()) return ts.next();
    if (isId()) return ts.next();
    error();
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
