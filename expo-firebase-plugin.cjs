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

        if (
          !contents.includes(
            "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES",
          )
        ) {
          const postInstallRegex =
            /(post_install do \|installer\|[\s\S]*?)(end\s*end)/;

          const postInstallFix = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

          contents = contents.replace(
            postInstallRegex,
            `$1${postInstallFix}$2`,
          );
          writeFileSync(podfilePath, contents);
          console.log("✅ Added post_install fix to Podfile");
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
