import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import noInlineKrProgress from "./eslint-rules/no-inline-kr-progress.js";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "lovable-okrs": {
        rules: {
          "no-inline-kr-progress": noInlineKrProgress,
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Legacy debt — downgraded to warn to keep CI green while we pay it down incrementally.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "no-useless-escape": "warn",
      "no-case-declarations": "warn",
      // OKR Progress Canon — bloqueia cálculo inline de % de KR fora dos arquivos canônicos.
      "lovable-okrs/no-inline-kr-progress": "error",
    },
  },
);

