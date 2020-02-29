const assertType = type => value => {
  if (typeof value !== type)
    throw Error(`Type error: Expected '${type}' but got '${typeof value}'`);
  return value;
};

const num = assertType("number");
const bool = assertType("boolean");
const func = assertType("function");
const nonZero = value => {
  if (num === 0) throw Error(`Division by zero`);
  return num(value);
};
const arr = value => {
  if (!Array.isArray(value))
    throw Error(`Type error: Expected 'array' but got '${typeof value}'`);
  return value;
};

module.exports = { arr, func, num, bool, nonZero };
