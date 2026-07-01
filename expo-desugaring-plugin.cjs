const { withAppBuildGradle } = require("expo/config-plugins");

function withCoreLibraryDesugaring(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("coreLibraryDesugaringEnabled")) {
      const ignoreIdx = contents.indexOf("ignoreAssetsPattern");
      if (ignoreIdx !== -1) {
        const closeIdx = contents.indexOf("\n    }", ignoreIdx);
        if (closeIdx !== -1) {
          contents =
            contents.slice(0, closeIdx + 6) +
            "\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }" +
            contents.slice(closeIdx + 6);
        }
      }
    }

    if (!contents.includes("desugar_jdk_libs")) {
      contents = contents.replace(
        /^dependencies \{/m,
        "dependencies {\n    coreLibraryDesugaring('com.android.tools:desugar_jdk_libs:2.1.3')"
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withCoreLibraryDesugaring;
