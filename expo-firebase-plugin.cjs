const { withDangerousMod } = require("expo/config-plugins");
const { resolve } = require("path");
const { readFileSync, writeFileSync } = require("fs");

function withFirebaseFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const { platformProjectRoot } = cfg.modRequest;
      const podfilePath = resolve(platformProjectRoot, "Podfile");
      try {
        let contents = readFileSync(podfilePath, "utf-8");
        if (!contents.includes("CLANG_ALLOW_NON_MODULAR")) {
          const fix = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end`;

          // Match the closing ) of react_native_post_install on its own line
          contents = contents.replace(
            /(react_native_post_install\([\s\S]*?^\s*\))/m,
            `$1${fix}`
          );
          writeFileSync(podfilePath, contents);
          console.log("✅ Added CLANG_ALLOW_NON_MODULAR_INCLUDES fix");
        } else {
          console.log("ℹ️ Fix already present");
        }
      } catch (error) {
        console.error("❌ Error modifying Podfile:", error);
      }
      return cfg;
    },
  ]);
}

module.exports = withFirebaseFix;