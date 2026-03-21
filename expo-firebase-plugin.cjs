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

        if (!contents.includes("modular_headers")) {
          const podOverrides = `
  pod 'Firebase', '~> 11.0', :modular_headers => true
  pod 'FirebaseAuth', '~> 11.0', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true
  pod 'FirebaseFirestore', '~> 11.0', :modular_headers => true
  pod 'FirebaseStorage', '~> 11.0', :modular_headers => true
  pod 'GoogleUtilities', :modular_headers => true
  pod 'FirebaseAuthInterop', :modular_headers => true
  pod 'FirebaseAppCheckInterop', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true
  pod 'FirebaseFirestoreInternal', :modular_headers => true
`;
          contents = contents.replace(
            "  config = use_native_modules!(config_command)",
            podOverrides + "\n  config = use_native_modules!(config_command)"
          );
          writeFileSync(podfilePath, contents);
          console.log("✅ Added Firebase version pins and modular headers");
        } else {
          console.log("ℹ️ Firebase overrides already present");
        }
      } catch (error) {
        console.error("❌ Error modifying Podfile:", error);
      }

      return cfg;
    },
  ]);
}

module.exports = withFirebaseFix;
