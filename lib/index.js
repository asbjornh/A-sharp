const fs = require("fs");
const path = require("path");

const read = fileName =>
  fs.readFileSync(path.resolve(__dirname, `./${fileName}`), "utf8");

module.exports = {
  io: require("../lib/io"),
  list: read("list.asharp")
};
