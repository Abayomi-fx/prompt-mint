import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
// import reactDOM from "eslint-plugin-react-dom";
// import reactHooks from "eslint-plugin-react-hooks";
// import reactRefresh from "eslint-plugin-react-refresh";
// import reactX from "eslint-plugin-react-x";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
  globalIgnores([
    "dist",
    "packages",
    "server",
    "api",
    "src/test/e2e",
    "src/debug/**",
    "src/pages/Debugger.tsx",
    "src/contracts/*",
    "!src/contracts/util.ts",
  ]),
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/tabindex-no-positive": "error",
      "jsx-a11y/no-autofocus": "error",
    },
  },
  {
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/require-await": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "prefer-const": "warn",
      "no-useless-assignment": "warn",
      "preserve-caught-error": "warn",
    },
  },
  {
    extends: [
      jsx.configs.recommended,
      tseslint.configs.recommended,
    ],
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  }
]);