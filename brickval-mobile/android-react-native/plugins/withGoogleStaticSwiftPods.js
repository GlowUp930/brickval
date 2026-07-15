const { withPodfile } = require("@expo/config-plugins");

const POD_INSERT = [
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
].join("\n");

module.exports = function withGoogleStaticSwiftPods(config) {
  return withPodfile(config, (mod) => {
    if (mod.modResults.contents.includes("pod 'GoogleUtilities', :modular_headers => true")) {
      return mod;
    }

    mod.modResults.contents = mod.modResults.contents.replace(
      /target 'Brickvalue' do\n\s+use_expo_modules!\n/,
      (match) => `${match}\n${POD_INSERT}\n`
    );

    return mod;
  });
};
