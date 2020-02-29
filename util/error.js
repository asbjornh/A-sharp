const codeFrame = require("./code-frame");

module.exports = function error(msg, source, loc) {
  if (source && loc) {
    const cf = codeFrame(source, loc);
    console.error(`${cf}\n\n${msg}`);
  } else {
    console.error(msg);
  }
  process.exit(1);
};
