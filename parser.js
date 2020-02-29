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

const mkLoc = (startNode, endNode) => ({
  start: startNode.loc.start,
  end: endNode.loc.end
});

// TODO: Maybe use "op" type for calls to binary functions?
// TODO: Maybe special parsing of |> and >> ?
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
      const end = skipPunc(")");
      return { type: "unit", loc: mkLoc(start, end) };
    }
    if (isOp()) {
      const op = ts.next();
      skipPunc(")");
      const args = parseWhile(isParam, parseAtom);
      const callee = { ...op, type: "id" };
      const loc = mkLoc(start, args.slice(-1)[0]);
      return { type: "call", callee, loc, args };
    }
    const node = parser();
    const end = skipPunc(")");
    return { ...node, loc: mkLoc(node, end) };
  };

  const parseList = (start, stop, sepSkipper, parser) => {
    let elements = [];
    let first = true;
    skipPunc(start);
    while (!ts.eof()) {
      if (isPunc(stop)) break;
      if (first) first = false;
      else if (sepSkipper) sepSkipper();
      if (isPunc(stop)) break;
      elements.push(parser());
    }
    return [elements, skipPunc(stop)];
  };

  const parseArray = () => {
    const start = ts.peek();
    const [elements, end] = parseList("[", "]", null, parseAtom);
    return { type: "array", elements, loc: mkLoc(start, end) };
  };

  const parseBlock = () => {
    const start = ts.peek();
    const sep = () => skipPunc(";");
    const [body, end] = parseList("{", "}", sep, parseExpression);
    const loc = mkLoc(start, end);
    return body.length === 1 ? body : { type: "block", body, loc };
  };

  const parseIf = () => {
    const start = skipKw("if");
    const condition = parseExpression();
    skipKw("then");
    const thenBranch = parseExpression();
    skipKw("else");
    const elseBranch = parseExpression();
    return {
      type: "if",
      condition,
      then: thenBranch,
      else: elseBranch,
      loc: mkLoc(start, elseBranch)
    };
  };

  const maybeTernary = first => {
    if (isPunc("?")) {
      const start = skipPunc("?");
      const thenBranch = parseExpression();
      skipPunc(":");
      const elseBranch = parseExpression();
      return {
        type: "ternary",
        condition: first,
        then: thenBranch,
        else: elseBranch,
        loc: mkLoc(start, elseBranch)
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
        const loc = mkLoc(left, right);
        const infix = { type: "call", callee, args: [right, left], loc };
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
      const body = parseExpression();
      return { type: "fun", args: [id, ...args], body, loc: mkLoc(id, body) };
    }
    const loc = mkLoc(id, args.slice(-1)[0]);
    return { type: "call", callee: id, loc, args };
  };

  const parseNum = () => {
    const num = ts.next();
    if (isPunc(".")) {
      skipPunc(".");
      const dec = isNum() ? ts.next() : error();
      const loc = mkLoc(num, dec);
      return { ...num, value: parseFloat(`${num.value}.${dec.value}`), loc };
    }
    return { ...num, value: parseFloat(num.value) };
  };

  const parseBool = () => {
    if (!isBool()) error();
    const { value, loc } = ts.next();
    return { type: "bool", value: value === "true", loc };
  };

  const parseId = () => (isId() ? ts.next() : error());
  const parseStr = () => (isStr() ? ts.next() : error());

  const parseIdOrMember = () => {
    const id = parseId();
    if (isPunc(".")) {
      skipPunc(".");
      const property = parseId();
      const loc = mkLoc(id, property);
      return { type: "member", object: id, property, loc };
    }
    return id;
  };

  const parseExpression = () =>
    maybeCallOrFunc(() => maybeTernary(maybeInfix(maybeCallOrFunc(parseAtom))));

  const parseDestructuring = assignStart => {
    const patternStart = ts.peek();
    const [elements, end] = parseList("(", ")", () => skipOp("::"), parseAtom);
    skipOp("=");
    const patternLoc = mkLoc(patternStart, end);
    const left = { type: "array-pattern", elements, loc: patternLoc };
    const right = parseExpression();
    return { type: "assign", left, right, loc: mkLoc(assignStart, right) };
  };

  const parseDeclaration = (kw, type) => {
    const kwNode = skipKw(kw);
    if (isPunc("(")) return parseDestructuring(kwNode);
    const tokens = parseWhile(isId, parseAtom);
    skipOp("=");
    const [id, ...ids] = tokens;
    const expr = parseExpression();
    return {
      type,
      left: id,
      right: ids.length ? { type: "fun", args: ids, body: expr } : expr,
      loc: mkLoc(kwNode, expr)
    };
  };

  const parseImport = () => {
    const start = skipKw("import");
    if (isPunc("(")) {
      const [ids] = parseList("(", ")", null, parseId);
      skipKw("from");
      const source = parseStr();
      return { type: "import", ids, source, loc: mkLoc(start, source) };
    }
    const id = parseId();
    skipKw("from");
    const source = parseStr();
    return { type: "import-all", id, source, loc: mkLoc(start, source) };
  };

  const parseAtom = () => {
    if (isPunc("{")) return parseBlock();
    if (isPunc("(")) return parseParenthesized(parseExpression);
    if (isArray()) return parseArray();
    if (isKw("import")) return parseImport();
    if (isKw("export")) return parseDeclaration("export", "export");
    if (isKw("let")) return parseDeclaration("let", "assign");
    if (isKw("if")) return parseIf();
    if (isBool()) return parseBool();
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
