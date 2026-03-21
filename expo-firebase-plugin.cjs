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
          // Just append before the final 'end' rather than replacing the block
          contents = contents.replace(
            /(\s+installer\.pods_project\.targets\.each do \|target\|[\s\S]*?end\s*\nend)/m,
            `$1\n\n  # Firebase fix\n  installer.pods_project.targets.each do |target|\n    target.build_configurations.each do |config|\n      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n    end\n  end`
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