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
        if target.name.start_with?('RNFB')
          config.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-implicit-int -Wno-error=implicit-int -Wno-implicit-function-declaration'
          config.build_settings['GCC_WARN_ABOUT_IMPLICIT_FUNCTION_DECLARATIONS'] = 'NO'
          config.build_settings['WARNING_CFLAGS'] = '-Wno-everything'
        end
      end
    end

    installer.pods_project.targets.each do |target|
      if target.name == 'React-Core'
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'YES'
        end
      end
    end`;

          // Fix 1 — inject after react_native_post_install closing paren
          contents = contents.replace(
            /(react_native_post_install\([\s\S]*?^\s*\))/m,
            `$1${fix}`
          );

          // Fix 2 — add modular headers for React-Core pod
          contents = contents.replace(
            /config = use_native_modules!\(config_command\)/,
            `config = use_native_modules!(config_command)\n  pod 'React-Core', :modular_headers => true`
          );

          writeFileSync(podfilePath, contents);
          console.log("✅ Added Firebase compatibility fixes");
        } else {
          console.log("ℹ️ Fix already present");
        }const { withDangerousMod } = require("expo/config-plugins");
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
        if target.name.start_with?('RNFB')
          config.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-implicit-int -Wno-error=implicit-int -Wno-implicit-function-declaration'
          config.build_settings['GCC_WARN_ABOUT_IMPLICIT_FUNCTION_DECLARATIONS'] = 'NO'
          config.build_settings['WARNING_CFLAGS'] = '-Wno-everything'
        end
      end
    end

    installer.pods_project.targets.each do |target|
      if target.name == 'React-Core'
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'YES'
        end
      end
    end`;

          contents = contents.replace(
            /(react_native_post_install\([\s\S]*?^\s*\))/m,
            `$1${fix}`
          );

          writeFileSync(podfilePath, contents);
          console.log("✅ Added Firebase compatibility fixes");
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
      } catch (error) {
        console.error("❌ Error modifying Podfile:", error);
      }
      return cfg;
    },
  ]);
}

module.exports = withFirebaseFix;