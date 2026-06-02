/**
 * ESLint rule: no-inline-kr-progress
 *
 * Proíbe o cálculo inline de progresso de KR (padrão
 * `((current - baseline) / (target - baseline)) * 100`) fora dos arquivos
 * canônicos. Todo consumidor DEVE usar `calculateProgress()` do frontend
 * (`@/modules/okrs/utils/progressCalculation`) ou `calculateKrProgress()`
 * do edge (`_shared/okr-progress.ts`).
 *
 * Ver mem://features/okrs/okrs-master-standard
 */

const ALLOWED_SUFFIXES = [
  "src/modules/okrs/utils/progressCalculation.ts",
  "supabase/functions/_shared/okr-progress.ts",
];

function isCurrentLike(name) {
  return /^(current|current_value|currentValue)$/.test(name);
}
function isBaseline(name) {
  return name === "baseline";
}
function isTarget(name) {
  return /^(target|target_value)$/.test(name);
}

/** Identifier or MemberExpression like `kr.current_value`. */
function nameOf(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && node.property?.type === "Identifier") {
    return node.property.name;
  }
  return null;
}

/** Matches `(A - B)` where A/B are identifier-likes. */
function isSubBetween(node, predA, predB) {
  if (!node || node.type !== "BinaryExpression" || node.operator !== "-") return false;
  const a = nameOf(node.left);
  const b = nameOf(node.right);
  return a && b && predA(a) && predB(b);
}

/** Matches `(numer) / (denom)` where numer/denom are the progress subtractions. */
function isProgressDivision(node) {
  if (!node || node.type !== "BinaryExpression" || node.operator !== "/") return false;
  // up: (current - baseline) / (target - baseline)
  const upNumer = isSubBetween(node.left, isCurrentLike, isBaseline);
  const upDenom = isSubBetween(node.right, isTarget, isBaseline);
  if (upNumer && upDenom) return true;
  // down: (baseline - current) / (baseline - target)
  const downNumer = isSubBetween(node.left, isBaseline, isCurrentLike);
  const downDenom = isSubBetween(node.right, isBaseline, isTarget);
  return downNumer && downDenom;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Proíbe cálculo inline de progresso de KR. Use calculateProgress() (frontend) ou calculateKrProgress() (_shared/okr-progress.ts).",
    },
    schema: [],
    messages: {
      inline:
        "Cálculo de progresso de KR inline é proibido. Use calculateProgress() (frontend) ou _shared/okr-progress.ts (edge). Ver mem://features/okrs/okrs-master-standard.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename?.() || "";
    const normalized = filename.replace(/\\/g, "/");
    if (ALLOWED_SUFFIXES.some((s) => normalized.endsWith(s))) {
      return {};
    }
    return {
      BinaryExpression(node) {
        // Pattern: (division) * 100  OR  100 * (division)
        if (node.operator !== "*") return;
        const isHundred = (n) => n?.type === "Literal" && n.value === 100;
        const div =
          isHundred(node.right) && isProgressDivision(node.left)
            ? node.left
            : isHundred(node.left) && isProgressDivision(node.right)
            ? node.right
            : null;
        if (div) {
          context.report({ node, messageId: "inline" });
        }
      },
    };
  },
};
