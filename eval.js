const deepEq = require("./util/deep-equal");
const environment = require("./env");

const catchWithNode = (node, fn) => {
  try {
    return fn();
  } catch (e) {
    // NOTE: Overwriting existing node creates misleading output
    e.node = e.node || node;
    throw e;
  }
};

const throwWithNode = (node, msg) => {
  const error = new Error(msg);
  error.node = node;
  throw error;
};

const getIdName = node => {
  if (node.type !== "id") {
    throwWithNode(
      node,
      `Type error: Cannot assign to node of type '${node.type}'`
    );
  }
  return node.value;
};

module.exports = function evaluate(node, env) {
  const eval = node => evaluate(node, env);

  const assertType = type => node => {
    const value = eval(node);
    if (typeof value !== type)
      throw Error(`Type error: Expected '${type}' but got '${typeof value}'`);
    return value;
  };
  const assertNum = assertType("number");
  const assertFunc = assertType("function");

  const assertArray = node => {
    const arr = eval(node);
    if (!Array.isArray(arr))
      throw Error(`Type error: Expected 'array' but got '${typeof arr}'`);
    return arr;
  };
  const assertNonZero = node => {
    const num = assertNum(node);
    if (num === 0) throw Error(`Division by zero`);
    return num;
  };
  const num = node => catchWithNode(node, () => assertNum(node));
  const nonZero = node => catchWithNode(node, () => assertNonZero(node));

  const evalBinary = node => {
    const { left, right, operator } = node;
    if (operator === "/" || operator === "%")
      return global.eval(`${num(left)} ${operator} ${nonZero(right)}`);
    if (operator === "==") return deepEq(eval(left), eval(right));
    if (operator === "!=") return !deepEq(eval(left), eval(right));
    if (operator === "::") {
      const arr = catchWithNode(right, () => assertArray(right));
      return [eval(left), ...arr];
    }
    if (operator === "|>") {
      const fn = catchWithNode(node.right.callee, () => assertFunc(right));
      return fn(eval(left));
    }
    if (operator === ">>") {
      const l = catchWithNode(left.callee, () => assertFunc(left));
      const r = catchWithNode(right.callee, () => assertFunc(right));
      return (...args) => r(l(...args));
    }
    return global.eval(`${num(left)} ${operator} ${num(right)}`);
  };

  const applyFunc = (node, args, scope) => {
    if (args.length < node.args.length) {
      return (...moreArgs) =>
        applyFunc(node, [...args, ...moreArgs], scope.extend());
    } else if (args.length > node.args.length) {
      throwWithNode(args.slice(-1)[0], "Too many arguments");
    }
    args.forEach((arg, index) => scope.set(node.args[index].value, arg));
    return evaluate(node.body, scope);
  };

  const evalDestructuring = (left, right) => {
    const names = catchWithNode(left, () => assertArray(left));
    const values = catchWithNode(right, () => assertArray(right));
    console.log("destructure", values);
    if (names.length > values.length + 1)
      throwWithNode(right, `Input array too short`);
    names.reduce((acc, name) => {
      const [value, ...rest] = acc;
      env.set(name, rest.length > 0 ? value : [value]);
      return rest;
    }, values);
  };

  switch (node.type) {
    case "unit":
      return undefined;
    case "number":
    case "string":
    case "bool":
      return node.value;
    case "array":
      return node.elements.map(eval);
    case "array-pattern":
      return node.elements.map(getIdName);
    case "id":
      return catchWithNode(node, () => env.get(node.value));
    case "assign":
      if (node.left.type === "array-pattern") {
        return evalDestructuring(node.left, node.right);
      }
      return env.set(getIdName(node.left), eval(node.right));
    case "binary":
      return evalBinary(node);
    case "call":
      const fn = catchWithNode(node.callee, () => assertFunc(node.callee));
      return fn(...node.args.map(eval));
    case "fun":
      return (...args) => applyFunc(node, args, env.extend());
    case "ternary":
      return eval(node.condition) ? eval(node.then) : eval(node.else);
    case "if":
      return eval(node.condition) ? eval(node.then) : eval(node.else);
    case "block":
      const blockEnv = env.extend();
      return node.body.reduce((_, node) => evaluate(node, blockEnv), null);
    case "program":
      const globalEnv = environment();
      return node.body.reduce((_, node) => evaluate(node, globalEnv), null);
    default:
      throw Error(`Missing implementation for '${node.type}'`);
  }
};
