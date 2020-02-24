/** Deep equality for plain objects and arrays */
module.exports = function deepEqual(a, b) {
  if (a === b) return true;

  if (a && b && typeof a === "object" && typeof b === "object") {
    if (a.constructor !== b.constructor) return false;
    const aEntries = Object.entries(a);
    const bEntries = Object.entries(b);
    if (aEntries.length !== bEntries.length) return false;
    for (let i = 0; i < aEntries.length; i++) {
      const [aKey, aVal] = aEntries[i];
      const [bKey, bVal] = bEntries[i];
      if (aKey !== bKey) return false;
      if (!deepEqual(aVal, bVal)) return false;
    }
    return true;
  }

  // true if both NaN, false otherwise
  return a !== a && b !== b;
};
