const { withPlugins } = require("expo/config-plugins");

function withFirebaseFix(config) {
  return withPlugins(config, []);
}

module.exports = withFirebaseFix;
