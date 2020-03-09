const { arr, str } = require("./types");

module.exports = {
  append: str2 => str1 => `${str(str1)}${str(str2)}`,
  prepend: str2 => str1 => `${str(str2)}${str(str1)}`,
  join: char => array => arr(array).join(str(char)),
  length: string => str(string).length,
  split: char => string => str(string).split(str(char))
};
