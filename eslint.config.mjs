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
    // Board tooling, ported from OsteoJP and recorded in docs/board/PORT-NOTES.md
    // as byte-for-byte upstream except for the patches listed there. Linting it
    // to this app's standard would mean editing it away from upstream.
    "docs/**",
    // Untracked design bundle: absent in CI, so linting it locally only makes
    // local disagree with CI. Tracked by CHORE-design-bundle-location.
    "design_handoff_lablld_dashboard/**",
  ]),
]);

export default eslintConfig;
