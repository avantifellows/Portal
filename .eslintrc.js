module.exports = {
  env: {
    node: true,
  },
  extends: ["eslint:recommended", "plugin:vue/vue3-recommended", "prettier"],
  rules: {
    "vue/multi-word-component-names": ["off"],
    "vue/require-default-prop": ["off"],
    "vue/attribute-hyphenation": ["off"],
  },
};
