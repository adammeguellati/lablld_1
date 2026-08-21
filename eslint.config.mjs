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
  // CLAUDE.md forbids console.* and, until now, nothing enforced it — the rule
  // lived in a document, which is the same shape of problem as a limit that
  // lives in a sentence. It is a lint error now, so a stray console.log cannot
  // reach main.
  {
    rules: { "no-console": "error" },
  },
  // The single exception, and the reason INFRA-billing-alerting could be built
  // without a vendor: one file may write to stderr, and everything that needs to
  // report routes through it. Widening this list is a decision, not a fix.
  {
    files: ["lib/ops-report.ts"],
    rules: { "no-console": "off" },
  },
]);

export default eslintConfig;
