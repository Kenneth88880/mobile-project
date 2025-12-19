const { withDangerousMod, withPlugins } = require("expo/config-plugins");
const { resolve } = require("path");
const { readFileSync, writeFileSync } = require("fs");

function withFirebasePodfilePostInstall(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const { platformProjectRoot } = cfg.modRequest;
      const podfilePath = resolve(platformProjectRoot, "Podfile");

      try {
        let contents = readFileSync(podfilePath, "utf-8");

        // Check if post_install hook already exists
        if (
          !contents.includes(
            "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"
          )
        ) {
          // Find the post_install do |installer| line
          const postInstallRegex =
            /(post_install do \|installer\|[\s\S]*?)(end\s*end)/;

          const postInstallFix = `
    # Fix for React Native Firebase modular headers issue with static frameworks
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Apply to all RNFB (React Native Firebase) targets
        if target.name.start_with?('RNFB')
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
        # Also apply to React-Core targets that RNFB depends on
        if target.name.start_with?('React')
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end
`;

          contents = contents.replace(
            postInstallRegex,
            `$1${postInstallFix}$2`
          );

          writeFileSync(podfilePath, contents);
          console.log("✅ Added Firebase post_install fix to Podfile");
        }
      } catch (error) {
        console.error("❌ Error modifying Podfile:", error);
      }

      return cfg;
    },
  ]);
}

function withFirebaseFix(config) {
  return withPlugins(config, [withFirebasePodfilePostInstall]);
}

module.exports = withFirebaseFix;
