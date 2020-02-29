const deepEq = require("./util/deep-equal");
const { func, num, bool, arr, nonZero } = require("./util/types");

const curry = (fn, n = fn.length) => (...args) => {
  if (args.length > n) throw Error("Too many arguments");
  return args.length === n
    ? fn(...args)
    : curry(fn.bind(null, ...args), n - args.length);
};

module.exports = {
  "+": curry((r, l) => num(l) + num(r)),
  "-": curry((r, l) => num(l) - num(r)),
  "/": curry((r, l) => num(l) / nonZero(r)),
  "%": curry((r, l) => num(l) % nonZero(r)),
  "*": curry((r, l) => num(l) * num(r)),
  "::": curry((r, l) => [l, ...arr(r)]),
  "@": curry((r, l) => [...arr(l), ...arr(r)]),
  "<=": curry((r, l) => num(l) <= num(r)),
  ">=": curry((r, l) => num(l) >= num(r)),
  "<": curry((r, l) => num(l) < num(r)),
  ">": curry((r, l) => num(l) > num(r)),
  "==": curry((r, l) => deepEq(l, r)),
  "!=": curry((r, l) => !deepEq(l, r)),
  "||": curry((r, l) => bool(l) || bool(r)),
  "&&": curry((r, l) => bool(l) && bool(r)),
  "|>": curry((r, l) => func(r)(l)),
  ">>": curry((r, l) => (...args) => func(r)(func(l)(...args))),
  print: (...messages) => console.log(...messages)
};
