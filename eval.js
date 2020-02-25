const deepEq = require("./util/deep-equal");
const error = require("./util/error");
const environment = require("./env");
const globals = require("./globals");
const importModule = require("./util/import-module");

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
  if (node.type !== "id")
    throwWithNode(node, `Type error: Unexpected '${node.type}'`);

  return node.value;
};

function evaluate(node, cwd, env, expEnv) {
  const eval = node => evaluate(node, cwd, env);

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
    if (["||", "&&", "<", ">", "+", "-", "*", "/", "%"].includes(operator))
      return global.eval(`${num(left)} ${operator} ${num(right)}`);
    throwWithNode(right, `Unexpected operator '${operator}'`);
  };

  const applyFunc = (node, args, scope) => {
    if (args.length < node.args.length) {
      return (...moreArgs) =>
        applyFunc(node, [...args, ...moreArgs], scope.extend());
    } else if (args.length > node.args.length) {
      throwWithNode(args.slice(-1)[0], "Too many arguments");
    }
    args.forEach((arg, index) => scope.set(node.args[index].value, arg));
    return evaluate(node.body, cwd, scope);
  };

  const evalDestructuring = (left, right) => {
    const names = catchWithNode(left, () => assertArray(left));
    const values = catchWithNode(right, () => assertArray(right));
    if (names.length > values.length + 1)
      throwWithNode(right, `Input array too short`);
    names.reduce((acc, name, i) => {
      const [value, ...rest] = acc;
      env.set(name, i < names.length - 1 ? value : acc);
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
      return node.body.reduce((_, node) => evaluate(node, cwd, blockEnv), null);
    case "export":
      if (!expEnv) throwWithNode(node.left, "Cannot export in block scope");
      return expEnv.set(getIdName(node.left), eval(node.right));
    case "import":
      const moduleExports = catchWithNode(node.source, () =>
        importModule(eval(node.source), cwd, tryEvaluate)
      );
      return node.ids.forEach(id => {
        const name = getIdName(id);
        if (name in moduleExports) return env.set(name, moduleExports[name]);
        else throwWithNode(id, `No export named '${name}'`);
      });
    case "program":
      const globalEnv = environment();
      Object.entries(globals).forEach(([name, value]) => {
        globalEnv.set(name, value);
      });
      const moduleEnv = globalEnv.extend();
      const exportEnv = environment();
      const body = node.body.reduce(
        (_, node) => evaluate(node, cwd, moduleEnv, exportEnv),
        null
      );
      return Object.keys(exportEnv.vars).length > 0
        ? { __module: exportEnv.vars }
        : body;
    default:
      throw Error(`Eval: Missing implementation for '${node.type}'`);
  }
}

function tryEvaluate(ast, source, cwd) {
  try {
    return evaluate(ast, cwd);
  } catch (e) {
    error(e.message, source, e.node && e.node.loc, e.node && e.node.value);
  }
}

module.exports = tryEvaluate;
