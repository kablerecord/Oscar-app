import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Rule overrides for code quality
  {
    rules: {
      // Allow unused vars prefixed with underscore (common pattern for intentionally unused params)
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      // Downgrade unescaped entities to warnings (apostrophes/quotes in JSX text)
      "react/no-unescaped-entities": "warn",
      // Downgrade explicit any to warning - some library types need any
      "@typescript-eslint/no-explicit-any": "warn",
      // Downgrade require imports to warning - some dynamic imports need require
      "@typescript-eslint/no-require-imports": "warn",
      // Downgrade setState in effect to warning - needed for auth patterns
      "react-hooks/set-state-in-effect": "warn",
      // Downgrade ts-comment rule to warning
      "@typescript-eslint/ban-ts-comment": "warn",
      // Downgrade prefer-const to warning
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
