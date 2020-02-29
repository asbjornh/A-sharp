const codeFrame = require("./code-frame");

module.exports = function error(msg, source, loc, value = " ") {
  if (source && loc && value) {
    const cf = codeFrame(source, loc, value);
    console.error(`${cf}\n\n${msg}`);
  } else {
    console.error(msg);
  }
  process.exit(1);
};
