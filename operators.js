const deepEq = require("./util/deep-equal");
const { func, num, bool, arr, nonZero } = require("./lib/types");

// NOTE: Does type checking also while partially applied
module.exports = {
  "+": r => num(r) && (l => num(l) + r),
  "-": r => num(r) && (l => num(l) - r),
  "/": r => nonZero(r) && (l => num(l) / r),
  "%": r => nonZero(r) && (l => num(l) % r),
  "*": r => num(r) && (l => num(l) * r),
  "**": r => num(r) && (l => Math.pow(num(l), r)),
  "::": r => arr(r) && (l => [l, ...r]),
  "@": r => arr(r) && (l => [...arr(l), ...r]),
  "<=": r => num(r) && (l => num(l) <= r),
  ">=": r => num(r) && (l => num(l) >= r),
  "<": r => num(r) && (l => num(l) < r),
  ">": r => num(r) && (l => num(l) > r),
  "==": r => l => deepEq(l, r),
  "!=": r => l => !deepEq(l, r),
  "||": r => bool(r) && (l => bool(l) || r),
  "&&": r => bool(r) && (l => bool(l) && r),
  "|>": r => func(r) && (l => r(l)),
  "<|": r => l => func(l)(r),
  ">>": r => func(r) && (l => (...args) => r(func(l)(...args))),
  "<<": r => func(r) && (l => (...args) => func(l)(r(...args)))
};
