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
    // 벤더링된 정적 자산 — MediaPipe의 emscripten 글루 JS가 여기 들어 있다.
    // 생성된 코드라 우리 규칙을 따르지 않으며, WebGL의 GLctx.useProgram()이
    // React 훅으로 오인돼 rules-of-hooks 오류까지 난다.
    "public/**",
  ]),
]);

export default eslintConfig;
