// Disables JS minification so Terser cannot create the
// "Cannot access X before initialization" TDZ crash.
module.exports = function override(config) {
  config.optimization = config.optimization || {};
  config.optimization.minimize = false;
  config.optimization.minimizer = [];
  return config;
};
