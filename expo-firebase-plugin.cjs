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
          const insertCode = `
    # Fix for non-modular headers (Firebase + Google Maps)
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end

      # Disable modular headers for Google Maps targets to fix RCTViewManager import error
      if ['react-native-google-maps', 'react-native-maps'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'NO'
          config.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-non-modular-include-in-framework-module'
        end
      end
    end

`;

          if (contents.includes("react_native_post_install")) {
            contents = contents.replace(
              /(\s*)(react_native_post_install)/,
              `${insertCode}$1$2`,
            );
            writeFileSync(podfilePath, contents);
            console.log(
              "✅ Added modular headers fix before react_native_post_install",
            );
          } else {
            console.warn(
              "⚠️ Could not find react_native_post_install in Podfile",
            );
          }
        } else {
          console.log("ℹ️ Modular headers fix already present");
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
