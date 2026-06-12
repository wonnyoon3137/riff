import js from "@eslint/js";
import globals from "globals";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

// `next lint`(deprecated) → ESLint CLI(flat config) 직접 호출.
// 과거 `eslint-config-next`의 core-web-vitals/typescript 프리셋은
// @rushstack/eslint-patch 를 통해 ESLint 를 패치하는데, 신형 Node loader 와
// 비호환이라 Node 25 로컬에서 `Failed to patch ESLint ...` 로 lint 가 죽었다.
// → patch 를 거치는 프리셋 대신 @next/eslint-plugin-next 등 플러그인을
//   flat config 에 직접 구성해 동일 규칙을 patch 없이 재현한다.
const eslintConfig = [
  // 산출물/외부 디렉터리 무시
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },

  // 기본 JS 권장 규칙
  js.configs.recommended,

  // TS/JS/JSX 공통: 파서·플러그인·환경
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      import: importPlugin,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // --- @typescript-eslint/recommended (next/typescript 대응) ---
      ...tsPlugin.configs.recommended.rules,
      // next/typescript 가 완화한 두 규칙(warn)
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",

      // --- react/recommended (next base 대응) ---
      ...reactPlugin.configs.recommended.rules,
      // --- react-hooks/recommended ---
      ...reactHooksPlugin.configs.recommended.rules,

      // --- @next/next recommended + core-web-vitals ---
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,

      // --- next/core-web-vitals base 가 명시한 규칙들(원본 그대로) ---
      "import/no-anonymous-default-export": "warn",
      "react/no-unknown-property": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-no-target-blank": "off",
      "jsx-a11y/alt-text": [
        "warn",
        { elements: ["img"], img: ["Image"] },
      ],
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",

      // --- Riff 프로젝트 규칙(M1) ---
      // D3/T-08: alert 금지 — 인라인 토스트(useToast) 사용
      "no-alert": "error",
    },
  },
];

export default eslintConfig;
