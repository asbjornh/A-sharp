const throwError = require("./util/error");
const lexer = require("./lexer");
const stream = require("./util/stream");

/* prettier-ignore */
const precedence = {
  "=": 1,
  "||": 2,
  "&&": 3,
  "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
  "+": 10, "-": 10,
  "*": 20, "/": 20, "%": 20,
  "::": 20, "@": 20,
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
  const isMember = token => is("member", undefined, token);
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
  const skipOp = skipType(isOp);

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
    if (isOp()) {
      const op = ts.next();
      skipPunc(")");
      const args = parseWhile(isParam, parseAtom);
      const callee = { ...op, type: "id" };
      return { type: "call", callee, loc: callee.loc, args };
    }
    const node = parser();
    skipPunc(")");
    return node;
  };

  const parseList = (start, stop, sepSkipper, parser) => {
    let expressions = [];
    let first = true;
    skipPunc(start);
    while (!ts.eof()) {
      if (isPunc(stop)) break;
      if (first) first = false;
      else if (sepSkipper) sepSkipper();
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
    const body = parseList("{", "}", () => skipPunc(";"), parseExpression);
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

  const maybeInfix = (left, leftPrec = 0) => {
    if (isOp()) {
      const tok = ts.peek();
      if (isOp("=")) error();
      const rightPrec = precedence[tok.value];
      if (rightPrec > leftPrec) {
        ts.next();
        const right = maybeInfix(maybeCallOrFunc(parseAtom), rightPrec);
        const callee = { ...tok, type: "id" };
        const infix = { type: "call", callee, args: [right, left] };
        return maybeInfix(infix, leftPrec);
      }
    }
    return left;
  };

  const maybeCallOrFunc = exprParser => {
    const expr = exprParser();
    return (isId(expr) || isMember(expr)) && (isParam() || isOp("=>"))
      ? parseCallOrFunc(expr)
      : expr;
  };

  const parseCallOrFunc = id => {
    const args = parseWhile(isParam, parseAtom);
    if (isId(id) && args.every(arg => isId(arg)) && isOp("=>")) {
      skipOp("=>");
      return { type: "fun", args: [id, ...args], body: parseExpression() };
    }
    return { type: "call", callee: id, loc: id.loc, args };
  };

  const parseNum = () => {
    const num = ts.next();
    if (isPunc(".")) {
      skipPunc(".");
      const dec = isNum() ? ts.next() : error();
      return { ...num, value: parseFloat(`${num.value}.${dec.value}`) };
    }
    return { ...num, value: parseFloat(num.value) };
  };

  const parseId = () => (isId() ? ts.next() : error());
  const parseStr = () => (isStr() ? ts.next() : error());

  const parseIdOrMember = () => {
    const id = parseId();
    if (isPunc(".")) {
      skipPunc(".");
      const property = parseId();
      return { type: "member", object: id, property };
    }
    return id;
  };

  const parseExpression = () =>
    maybeCallOrFunc(() => maybeTernary(maybeInfix(maybeCallOrFunc(parseAtom))));

  const parseDestructuring = () => {
    const elements = parseList("(", ")", () => skipOp("::"), parseAtom);
    skipOp("=");
    return {
      type: "assign",
      left: { type: "array-pattern", elements },
      right: parseExpression()
    };
  };

  const parseDeclaration = (kw, type) => {
    skipKw(kw);
    if (isPunc("(")) return parseDestructuring();
    const tokens = parseWhile(isId, parseAtom);
    skipOp("=");
    const [id, ...ids] = tokens;
    return {
      type,
      left: id,
      right: ids.length
        ? { type: "fun", args: ids, body: parseExpression() }
        : parseExpression()
    };
  };

  const parseImport = () => {
    skipKw("import");
    if (isPunc("(")) {
      const ids = parseList("(", ")", null, parseId);
      skipKw("from");
      return { type: "import", ids, source: parseStr() };
    }
    const id = parseId();
    skipKw("from");
    return { type: "import-all", id, source: parseStr() };
  };

  const parseAtom = () => {
    if (isPunc("{")) return parseBlock();
    if (isPunc("(")) return parseParenthesized(parseExpression);
    if (isArray()) return parseArray();
    if (isKw("import")) return parseImport();
    if (isKw("export")) return parseDeclaration("export", "export");
    if (isKw("let")) return parseDeclaration("let", "assign");
    if (isKw("if")) return parseIf();
    if (isBool()) return { type: "bool", value: ts.next().value === "true" };
    if (isNum()) return parseNum();
    if (isStr()) return parseStr();
    if (isId()) return parseIdOrMember();
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
