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

    # Fix for non-modular headers + iOS 26 SDK strict C compliance
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end

      if ['react-native-google-maps', 'react-native-maps'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'NO'
          config.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-non-modular-include-in-framework-module'
        end
      end

      if target.name.start_with?('RNFB')
        target.build_configurations.each do |config|
          config.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++17'
          config.build_settings['DEFINES_MODULE'] = 'NO'
          config.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-implicit-int -Wno-strict-prototypes -Wno-deprecated-declarations'
        end
      end
    end
`;

          // Find react_native_post_install and its matching closing paren
          const startIdx = contents.indexOf("react_native_post_install");
          if (startIdx !== -1) {
            const parenStart = contents.indexOf("(", startIdx);
            let depth = 0;
            let endIdx = -1;
            for (let i = parenStart; i < contents.length; i++) {
              if (contents[i] === "(") depth++;
              if (contents[i] === ")") depth--;
              if (depth === 0) {
                endIdx = i + 1;
                break;
              }
            }

            if (endIdx !== -1) {
              contents =
                contents.slice(0, endIdx) + insertCode + contents.slice(endIdx);
              writeFileSync(podfilePath, contents);
              console.log("✅ Added fix after react_native_post_install");
            }
          } else {
            console.warn(
              "⚠️ Could not find react_native_post_install in Podfile",
            );
          }
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

function withFirebaseFix(config) {
  return withPlugins(config, [withFirebasePodfilePostInstall]);
}

module.exports = withFirebaseFix;
