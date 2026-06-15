module.exports = {
  webpack: {
    configure: (config) => {
      // Disable Terser variable name mangling - prevents TDZ circular reference crashes
      if (config.optimization && config.optimization.minimizer) {
        config.optimization.minimizer.forEach((plugin) => {
          if (plugin.constructor.name === 'TerserPlugin') {
            plugin.options.terserOptions = {
              ...plugin.options.terserOptions,
              mangle: false,  // Don't rename variables - prevents TDZ crashes
              compress: {
                ...((plugin.options.terserOptions || {}).compress || {}),
                sequences: false,
                passes: 1,
              },
            };
          }
        });
      }
      return config;
    },
  },
};
