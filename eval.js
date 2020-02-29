const codeFrame = require("./util/code-frame");
const environment = require("./env");
const globals = require("./globals");
const importModule = require("./util/import-module");
const operators = require("./operators");
const { arr, bool, func } = require("./util/types");

function evaluate(node, opts, env, expEnv) {
  const eval = node => evaluate(node, opts, env);

  const catchWithCf = (node, fn) => {
    try {
      return fn();
    } catch (e) {
      // NOTE: Overwriting existing code frame creates misleading output
      if (opts.codeFrames)
        e.cf = e.cf || codeFrame(opts.source, node.loc, node.value);
      throw e;
    }
  };

  const throwWithCf = (node, msg) => {
    const error = new Error(msg);
    opts.codeFrames &&
      (error.cf = codeFrame(opts.source, node.loc, node.value));
    throw error;
  };

  const getIdName = node => {
    if (node.type !== "id")
      throwWithCf(node, `Type error: Unexpected '${node.type}'`);

    return node.value;
  };

  const evalOp = () => {
    const fn = catchWithCf(node.callee, () =>
      func(operators[node.callee.value])
    );
    const [right, left] = node.args;
    const rApplied = catchWithCf(right, () => fn(eval(right)));
    return left ? catchWithCf(right, () => rApplied(eval(left))) : rApplied;
  };

  const applyFunc = (node, args, scope) => {
    if (args.length < node.args.length) {
      return (...moreArgs) =>
        applyFunc(node, [...args, ...moreArgs], scope.extend());
    } else if (args.length > node.args.length) {
      throwWithCf(args.slice(-1)[0], "Too many arguments");
    }
    args.forEach((arg, index) => scope.set(node.args[index].value, arg));
    return evaluate(node.body, opts, scope);
  };

  const evalDestructuring = (left, right) => {
    const names = catchWithCf(left, () => arr(eval(left)));
    const values = catchWithCf(right, () => arr(eval(right)));
    if (names.length > values.length + 1)
      throwWithCf(right, `Input array too short`);
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
      return catchWithCf(node, () => env.get(node.value));
    case "member": {
      const objectName = getIdName(node.object);
      const property = getIdName(node.property);
      const object = catchWithCf(node.object, () => env.get(objectName));
      if (property in object) return object[property];
      throwWithCf(node.property, `'${property}' is not defined.`);
    }
    case "assign":
      if (node.left.type === "array-pattern") {
        return evalDestructuring(node.left, node.right);
      }
      return env.set(getIdName(node.left), eval(node.right));
    case "call":
      if (node.callee.type === "op") return evalOp();
      return catchWithCf(node.callee, () => {
        const fn = func(eval(node.callee));
        return fn(...node.args.map(eval));
      });
    case "fun":
      return (...args) => applyFunc(node, args, env.extend());
    case "ternary":
    case "if":
      return catchWithCf(node.condition, () => bool(eval(node.condition)))
        ? eval(node.then)
        : eval(node.else);
    case "block":
      const blockEnv = env.extend();
      return node.body.reduce(
        (_, node) => evaluate(node, opts, blockEnv),
        null
      );
    case "export":
      if (!expEnv) throwWithCf(node.left, "Cannot export in block scope");
      env.set(getIdName(node.left), eval(node.right));
      return expEnv.set(getIdName(node.left), eval(node.right));
    case "import": {
      const moduleExports = catchWithCf(node.source, () =>
        importModule(eval(node.source), opts.cwd, tryEvaluate)
      );
      return node.ids.forEach(id => {
        const name = getIdName(id);
        if (name in moduleExports) return env.set(name, moduleExports[name]);
        else throwWithCf(id, `No export named '${name}'`);
      });
    }
    case "import-all": {
      const name = getIdName(node.id);
      const moduleExports = catchWithCf(node.source, () =>
        importModule(eval(node.source), opts.cwd, tryEvaluate)
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
        (_, node) => evaluate(node, opts, moduleEnv, exportEnv),
        null
      );
      return Object.keys(exportEnv.vars).length > 0
        ? { __module: exportEnv.vars }
        : body;
    default:
      throw Error(`Eval: Missing implementation for '${node.type}'`);
  }
}

function tryEvaluate(ast, { codeFrames, source, cwd }) {
  try {
    return evaluate(ast, { codeFrames, source, cwd });
  } catch (e) {
    if (e.cf) console.error(`${e.cf}\n\n${e.message}`);
    else console.error(e.message);
    process.exit(1);
  }
}

module.exports = tryEvaluate;
