const environment = require("./env");

const catchWithNode = (node, fn) => {
  try {
    return fn();
  } catch (e) {
    e.node = node;
    throw e;
  }
};

const getIdName = node => {
  if (!node.type === "id") {
    const error = new Error(`Cannot assign to node of type '${node.type}'`);
    error.node = node;
    throw error;
  }
  return node.value;
};

module.exports = function evaluate(node, env) {
  const eval = node => evaluate(node, env);

  const assertType = type => node => {
    const value = eval(node);
    if (typeof value !== type) throw Error(`Unexpeced ${typeof value}`);
    return value;
  };
  const assertNum = assertType("number");

  const assertNonZero = node => {
    const num = assertNum(node);
    if (num === 0) throw Error(`Division by zero`);
    return num;
  };
  const num = node => catchWithNode(node, () => assertNum(node));
  const nonZero = node => catchWithNode(node, () => assertNonZero(node));

  const evalBinary = (left, right, operator) => {
    if (operator === "/" || operator === "%")
      return global.eval(`${num(left)} ${operator} ${nonZero(right)}`);
    if (operator === "==") return eval(left) === eval(right);
    if (operator === "!=") return eval(left) !== eval(right);
    if (operator === "|>") throw Error("Implement pipeline");
    if (operator === ">>") throw Error("Implement composition");
    return global.eval(`${num(left)} ${operator} ${num(right)}`);
  };

  switch (node.type) {
    case "number":
    case "string":
    case "bool":
      return node.value;
    case "id":
      return catchWithNode(node, () => env.get(node.value));
    case "assign":
      return catchWithNode(node, () =>
        env.set(getIdName(node.left), eval(node.right))
      );
    case "binary":
      return evalBinary(node.left, node.right, node.operator, env);
    case "call":
      const fn = eval(node.callee);
      return fn(...node.args.map(eval));
    case "fun":
      return (...args) => {
        const fnScope = env.extend();
        node.args.forEach((node, index) => {
          catchWithNode(node, () => {
            fnScope.set(node.value, args[index]);
          });
        });
        return evaluate(node.body, fnScope);
      };
    case "ternary":
      return eval(node.condition) ? eval(node.then) : eval(node.else);
    case "program":
      const globalEnv = environment();
      return node.body.reduce((_, node) => evaluate(node, globalEnv), null);
  }
};
