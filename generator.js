const emptyCompare = (thing1, thing2, operator) => {
  if (thing1 === "[]") return `${thing2}.length ${operator} 0`;
  if (thing2 === "[]") return `${thing1}.length ${operator} 0`;
};

const operators = {
  "+": (l, r) => `${l} + ${r}`,
  "-": (l, r) => `${l} - ${r}`,
  "/": (l, r) => `${l} / ${r}`,
  "%": (l, r) => `${l} / ${r}`,
  "*": (l, r) => `${l} * ${r}`,
  "**": (l, r) => `Math.pow(${l}, ${r})`,
  "::": (l, r) => `[${l}, ...${r}]`,
  "@": (l, r) => `[...${l}, ...${r}]`,
  "<=": (l, r) => `${l} <= ${r}`,
  ">=": (l, r) => `${l} >= ${r}`,
  "<": (l, r) => `${l} < ${r}`,
  ">": (l, r) => `${l} > ${r}`,
  "==": (l, r) => emptyCompare(r, l, "===") || `${l} === ${r}`,
  "!=": (l, r) => emptyCompare(r, l, "!==") || `${l} !== ${r}`,
  "||": (l, r) => `${l} || ${r}`,
  "&&": (l, r) => `${l} && ${r}`,
  "|>": (l, r) => `${r}(${l})`,
  "<|": (l, r) => `${l}(${r})`,
  ">>": (l, r) => `(...args) => ${r}(${l}(...args))`,
  "<<": (l, r) => `(...args) => ${l}(${r}(...args))`
};

module.exports = function gen(node) {
  const generateOp = () => {
    const [right, left] = node.args.map(gen);
    const op = gen(node.callee);
    return left
      ? operators[op](left, right)
      : `(x => ${operators[op]("x", right)})`;
  };

  const generateFunc = node => {
    const body = genBlock(node.body);
    const args = node.args.map(gen).join(" => ");
    return `${args} => ${body}`;
  };

  const genBlock = body => {
    if (body.type === "block") {
      const [last, ...restRev] = body.body.reverse().map(gen);
      return `{\n${[...restRev.reverse(), `return ${last}`].join(";\n")};\n}`;
    }
    return gen(body);
  };

  const genDestructuring = (left, right) => {
    const [lastName, ...names] = gen(left).reverse();
    const values = gen(right);
    return `const [${names.reverse().join(", ")}, ...${lastName}] = ${values}`;
  };

  const genImportSource = node => {
    const { value } = node;
    const isLib = !value.startsWith(".") && !value.startsWith("/");
    return isLib ? `./asharp-lib/${value}` : value.replace(".asharp", ".js");
  };

  switch (node.type) {
    case "unit":
      return "()";
    case "number":
    case "string":
    case "bool":
    case "op":
      return node.value;
    case "id":
      return node.value.replace(/-/g, "_");
    case "array":
      return `[${node.elements.map(gen).join(", ")}]`;
    case "array-pattern":
      return node.elements.map(gen);
    case "object":
      const properties = node.properties
        .map(({ key, value }) => `${gen(key)}: ${gen(value)}`)
        .join(",\n");
      return `{\n${properties}\n}`;
    case "member":
      return `${gen(node.object)}.${gen(node.property)}`;
    case "property-accessor":
      return `(obj => obj[${gen(node.key)}])`;
    case "assign":
      if (node.left.type === "array-pattern") {
        return genDestructuring(node.left, node.right);
      }
      return `const ${gen(node.left)} = ${gen(node.right)}`;
    case "call":
      if (node.callee.type === "op") return generateOp();
      const args = node.args.map(gen).map(a => `(${a})`);
      return `${gen(node.callee)}${args.join("")}`;
    case "fun":
      return generateFunc(node);
    case "ternary":
    case "if":
      return `${gen(node.condition)} ? ${gen(node.then)} : ${gen(node.else)}`;
    case "block":
      const content = genBlock(node);
      return `(() => ${content})()`;
    case "export": {
      const name = gen(node.left);
      return `const ${name} = ${gen(node.right)};\nexports.${name} = ${name}`;
    }
    case "import": {
      return `const { ${node.ids
        .map(gen)
        .join(", ")} } = require('${genImportSource(node.source)}')`;
    }
    case "import-all": {
      return `const ${gen(node.id)} = require('${genImportSource(
        node.source
      )}')`;
    }
    case "program":
      const code = node.body.map(gen).join(";\n") + ";\n";
      const dependencies = node.body
        .filter(({ type }) => type === "import" || type === "import-all")
        .map(({ source }) => gen(source));
      return { code, dependencies };
    default:
      throw Error(`Eval: Missing implementation for '${node.type}'`);
  }
};
