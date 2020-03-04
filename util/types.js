const realType = value => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

const assertType = type => value => {
  if (realType(value) !== type)
    throw Error(`Type error: Expected '${type}' but got '${realType(value)}'`);
  return value;
};

const str = assertType("string");
const num = assertType("number");
const bool = assertType("boolean");
const func = assertType("function");
const nonZero = value => {
  if (num === 0) throw Error(`Division by zero`);
  return num(value);
};
const arr = assertType("array");
const obj = assertType("object");

module.exports = { str, arr, func, num, bool, nonZero, obj };
