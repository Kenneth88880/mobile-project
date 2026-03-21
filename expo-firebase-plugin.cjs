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
          // Append before the final end of the file
          const fix = `
  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
  end
`;
          // Only append if no post_install block exists
          if (!contents.includes("post_install do")) {
            contents = contents + fix;
          } else {
            // Insert the fix inside existing post_install block before its closing end
            contents = contents.replace(
              /(post_install do \|installer\|[\s\S]*?)(^end)/m,
              `$1  installer.pods_project.targets.each do |target|\n    target.build_configurations.each do |config|\n      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n    end\n  end\n$2`
            );
          }
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