const codeFrame = require("./code-frame");

module.exports = function error(msg, source, loc, value = " ") {
  if (source && loc && value) {
    const { line, col } = loc;
    const cf = codeFrame(source, line, col, col + value.length);
    console.error(`${cf}\n\n${msg}`);
  } else {
    console.error(msg);
  }
  process.exit(1);
};
