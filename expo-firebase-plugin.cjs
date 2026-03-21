const { withXcodeProject } = require("expo/config-plugins");

function withFirebaseFix(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;

    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const config = configurations[key];
      if (config && config.buildSettings) {
        config.buildSettings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES";
        config.buildSettings["GCC_C_LANGUAGE_STANDARD"] = "gnu11";
        config.buildSettings["CLANG_CXX_LANGUAGE_STANDARD"] = '"gnu++17"';
      }
    }

    return cfg;
  });
}

module.exports = withFirebaseFix;
