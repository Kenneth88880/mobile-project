const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withGoogleMapsWorkaround(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let podfileContent = fs.readFileSync(podfilePath, "utf-8");

      // Modify the existing post_install hook instead of adding a new one
      const additionalConfig = `
    # Allow static binaries in dynamic frameworks (for Google Maps)
    installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
      target_installation_result.native_target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

      // Find the post_install block and add our config before the final 'end'
      if (
        !podfileContent.includes(
          "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES",
        )
      ) {
        // Find the post_install block
        const postInstallRegex =
          /(post_install do \|installer\|[\s\S]*?)(  end\s*$)/m;

        if (postInstallRegex.test(podfileContent)) {
          podfileContent = podfileContent.replace(
            postInstallRegex,
            `$1${additionalConfig}$2`,
          );
          fs.writeFileSync(podfilePath, podfileContent);
        }
      }

      return config;
    },
  ]);
};
