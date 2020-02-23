module.exports = function environment(parent) {
  let vars = {};

  const extend = () => environment(env);

  const lookup = name => {
    if (name in vars) return env;
    return parent && parent.lookup(name);
  };

  const get = name => {
    const scope = lookup(name);
    if (!scope) throw new Error(`Undefined variable '${name}'`);
    if (scope === env) return vars[name];
    return scope.get(name);
  };

  const set = (name, value) => {
    if (name in vars) throw new Error(`Cannot reassign '${name}'`);
    vars[name] = value;
  };

  const env = { extend, get, lookup, parent, set };

  return env;
};
