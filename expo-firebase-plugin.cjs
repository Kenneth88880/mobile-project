const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const { resolve } = require("path");
const { readFileSync, writeFileSync } = require("fs");

function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const { platformProjectRoot } = cfg.modRequest;
      const podfilePath = resolve(platformProjectRoot, "Podfile");

      try {
        let contents = readFileSync(podfilePath, "utf-8");

        if (!contents.includes("use_modular_headers!")) {
          contents = contents.replace(
            "prepare_react_native_project!",
            "use_modular_headers!\n\nprepare_react_native_project!"
          );
          writeFileSync(podfilePath, contents);
          console.log("✅ Added use_modular_headers!");
        } else {
          console.log("ℹ️ use_modular_headers! already present");
        }
      } catch (error) {
        console.error("❌ Error modifying Podfile:", error);
      }

      return cfg;
    },
  ]);
}

function withFirebaseFix(config) {
  const { withPlugins } = require("expo/config-plugins");
  return withPlugins(config, [withFirebaseModularHeaders]);
}

module.exports = withFirebaseFix;
