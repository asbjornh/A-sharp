module.exports = (things = []) => {
  let index = -1;

  const eof = () => peek() === undefined;
  const next = () => {
    index++;
    return things[index];
  };
  const peek = () => things[index + 1];

  return { eof, next, peek };
};
