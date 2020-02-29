const error = require("./util/error");
const environment = require("./env");
const globals = require("./globals");
const importModule = require("./util/import-module");
const { arr, func } = require("./util/types");

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
    const names = catchWithNode(left, () => arr(eval(left)));
    const values = catchWithNode(right, () => arr(eval(right)));
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
    case "member": {
      const objectName = getIdName(node.object);
      const property = getIdName(node.property);
      const object = catchWithNode(node.object, () => env.get(objectName));
      if (property in object) return object[property];
      throwWithNode(node.property, `'${property}' is not defined.`);
    }
    case "assign":
      if (node.left.type === "array-pattern") {
        return evalDestructuring(node.left, node.right);
      }
      return env.set(getIdName(node.left), eval(node.right));
    case "call":
      return catchWithNode(node.callee, () => {
        const fn = func(eval(node.callee));
        return fn(...node.args.map(eval));
      });
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
      env.set(getIdName(node.left), eval(node.right));
      return expEnv.set(getIdName(node.left), eval(node.right));
    case "import": {
      const moduleExports = catchWithNode(node.source, () =>
        importModule(eval(node.source), cwd, tryEvaluate)
      );
      return node.ids.forEach(id => {
        const name = getIdName(id);
        if (name in moduleExports) return env.set(name, moduleExports[name]);
        else throwWithNode(id, `No export named '${name}'`);
      });
    }
    case "import-all": {
      const name = getIdName(node.id);
      const moduleExports = catchWithNode(node.source, () =>
        importModule(eval(node.source), cwd, tryEvaluate)
      );
      return env.set(name, moduleExports);
    }
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
