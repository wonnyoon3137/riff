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
      // import/no-restricted-paths(레이어 룰)가 `@/*` 별칭과 TS 확장자를
      // 해석하려면 TypeScript resolver 가 필요하다(없으면 경로 매칭이 조용히 실패).
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
        node: { extensions: [".js", ".jsx", ".ts", ".tsx"] },
      },
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
      // --- jsx-a11y recommended 전체 룰셋 (#2 P-2 a11y 확장) ---
      // 기존엔 next 기본이 켠 6개 룰만 warn 이었다. 권장 룰셋 전체를 error 로
      // 승격해 키보드 이동/포커스/대체텍스트/라벨 결합을 기계적으로 강제한다.
      ...jsxA11yPlugin.flatConfigs.recommended.rules,
      // next 의 Image 컴포넌트를 img 로 취급(원본 유지). recommended 가 덮어쓰므로 재선언.
      "jsx-a11y/alt-text": ["error", { elements: ["img"], img: ["Image"] }],

      // --- Riff 프로젝트 규칙(M1) ---
      // D3/T-08: alert 금지 — 인라인 토스트(useToast) 사용
      "no-alert": "error",

      // --- #18 T-07: 레이어 의존 방향 강제 (ARCHITECTURE §2/§6) ---
      // 레이어: Types → Config(src/domain) → Repo/Service(src/server)
      //         → Runtime/BFF(src/app/api) → UI(src/components, src/hooks, app/(pages))
      // 상위는 하위만 import. 역방향·레이어 점프 금지.
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // domain(Types/Config) 은 상위 레이어를 import 할 수 없다.
            {
              target: "./src/domain",
              from: "./src/server",
              message:
                "레이어 위반(§6): domain(Config) → server 금지. 의존은 아래→위 한 방향만 허용.",
            },
            {
              target: "./src/domain",
              from: "./src/app",
              message:
                "레이어 위반(§6): domain(Config) → app 금지. 의존은 아래→위 한 방향만 허용.",
            },
            {
              target: "./src/domain",
              from: "./src/components",
              message:
                "레이어 위반(§6): domain(Config) → components 금지. 의존은 아래→위 한 방향만 허용.",
            },
            {
              target: "./src/domain",
              from: "./src/hooks",
              message:
                "레이어 위반(§6): domain(Config) → hooks 금지. 의존은 아래→위 한 방향만 허용.",
            },
            // server(Repo/Service) 는 UI/Runtime 을 import 할 수 없다.
            {
              target: "./src/server",
              from: "./src/app",
              message:
                "레이어 위반(§6): server(Repo/Service) → app 금지. Runtime/UI는 상위 레이어.",
            },
            {
              target: "./src/server",
              from: "./src/components",
              message:
                "레이어 위반(§6): server(Repo/Service) → components 금지. UI는 상위 레이어.",
            },
            {
              target: "./src/server",
              from: "./src/hooks",
              message:
                "레이어 위반(§6): server(Repo/Service) → hooks 금지. UI는 상위 레이어.",
            },
            // UI(components/hooks/pages) 는 server(Repo/Service)를 직접 import 금지.
            // 레이어 점프 방지 — 반드시 Runtime(BFF, app/api)을 경유한다(§2/§6, D9).
            {
              target: "./src/components",
              from: "./src/server",
              message:
                "레이어 점프 금지(§6): UI(components) → server 직접 호출 불가. BFF(app/api) 경유.",
            },
            {
              target: "./src/hooks",
              from: "./src/server",
              message:
                "레이어 점프 금지(§6): UI(hooks) → server 직접 호출 불가. BFF(app/api) 경유.",
            },
            {
              target: "./src/app/(pages)",
              from: "./src/server",
              message:
                "레이어 점프 금지(§6): UI(pages) → server 직접 호출 불가. BFF(app/api) 경유.",
            },
          ],
        },
      ],

      // --- #2 P-2: raw hex 색상 금지 (M3 디자인 토큰만) ---
      // TS/TSX 안의 hex 리터럴(#rgb·#rrggbb·#rrggbbaa)을 막는다.
      // 색상은 design-tokens.css 의 --md-* 토큰(var(...))으로만 참조.
      // CSS 파일의 hex 회귀 방지는 scripts/check-no-hex.mjs 가 담당
      // (design-tokens.css 만 예외 = M3 토큰 SSOT). 보고서 §hex 참조.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message:
            "raw hex 색상 금지. design-tokens.css 의 M3 토큰(var(--md-...))을 사용하라.",
        },
        {
          selector:
            "TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
          message:
            "raw hex 색상 금지. design-tokens.css 의 M3 토큰(var(--md-...))을 사용하라.",
        },
      ],
    },
  },

  // --- #18 T-07: 미검증 KOPIS 코드값 하드코딩 금지 ---
  // 검증된 코드값(장르 shcate, 공연상태, 시도)은 docs/api/kopis-codes.md 기반
  // src/domain/kopis-codes.ts(Config 레이어)에만 존재해야 한다.
  // 장르 shcate 코드는 4글자 고유 패턴(AAAA/BBBC/...)이라 정적 검출이 안전하다.
  // 이 블록은 SSOT 파일(kopis-codes.ts)을 제외한 전 영역에 적용된다.
  // (한계: 공연상태 "01"/"02"/"03", 시도 "11"/"26" 등 2자리 숫자 코드는
  //  일반 숫자 리터럴과 구분 불가 → 정적 검출 제외. kopis-codes.ts 경유 강제는
  //  구조/리뷰 컨벤션으로 보완. 보고서 §미검증코드 참조.)
  //
  // NOTE: flat config 에서 같은 룰을 다시 선언하면 객체가 덮어쓰이므로(merge 아님),
  // 이 블록은 hex 금지(상위 블록과 동일)를 다시 포함해 함께 적용한다.
  // SSOT 파일(kopis-codes.ts)은 ignores 로 제외 → 그 파일은 상위 블록의 hex 룰만 받는다.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/domain/kopis-codes.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message:
            "raw hex 색상 금지. design-tokens.css 의 M3 토큰(var(--md-...))을 사용하라.",
        },
        {
          selector:
            "TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
          message:
            "raw hex 색상 금지. design-tokens.css 의 M3 토큰(var(--md-...))을 사용하라.",
        },
        {
          selector:
            "Literal[value=/^(AAAA|BBBC|BBBE|CCCA|CCCC|CCCD|EEEA|EEEB|GGGA)$/]",
          message:
            "미검증 KOPIS 코드값 하드코딩 금지(§6). 장르 shcate 코드는 domain/kopis-codes.ts(GENRE_TO_SHCATE 등)에서만 다룬다.",
        },
      ],
    },
  },
];

export default eslintConfig;
