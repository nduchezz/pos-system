#!/bin/bash

OUTPUT_DIR=~/pos-system/audit-results
mkdir -p "$OUTPUT_DIR"
DATE=$(date +%Y-%m-%d_%H-%M)
REPORT="$OUTPUT_DIR/audit-$DATE.txt"

echo "═══════════════════════════════════════════════════════" | tee "$REPORT"
echo "  POS SYSTEM AUDIT — $DATE" | tee -a "$REPORT"
echo "═══════════════════════════════════════════════════════" | tee -a "$REPORT"

# ═══ BACKEND ═══
echo "" | tee -a "$REPORT"
echo "═══════════ BACKEND ═══════════" | tee -a "$REPORT"
cd ~/pos-system/backend

echo "" | tee -a "$REPORT"
echo "── TypeScript Check ──" | tee -a "$REPORT"
npx tsc --noEmit 2>&1 | tee -a "$REPORT" || echo "❌ Type errors found" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── ESLint ──" | tee -a "$REPORT"
npx eslint src --ext .ts 2>&1 | tee -a "$REPORT" || echo "❌ Lint issues found" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── Dead Code (unused exports) ──" | tee -a "$REPORT"
npx ts-prune 2>&1 | grep -v "used in module" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── Unused Dependencies ──" | tee -a "$REPORT"
npx depcheck 2>&1 | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── npm audit (production only) ──" | tee -a "$REPORT"
npm audit --omit=dev 2>&1 | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── Test Summary ──" | tee -a "$REPORT"
npm test 2>&1 | tail -15 | tee -a "$REPORT"

# ═══ MOBILE ═══
echo "" | tee -a "$REPORT"
echo "═══════════ MOBILE ═══════════" | tee -a "$REPORT"
cd ~/pos-system/mobile

echo "" | tee -a "$REPORT"
echo "── TypeScript Check ──" | tee -a "$REPORT"
npx tsc --noEmit 2>&1 | tee -a "$REPORT" || echo "❌ Type errors found" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── ESLint ──" | tee -a "$REPORT"
npx eslint src --ext .ts,.tsx 2>&1 | tee -a "$REPORT" || echo "❌ Lint issues found" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── Dead Code ──" | tee -a "$REPORT"
npx ts-prune 2>&1 | grep -v "used in module" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── npm audit (production only) ──" | tee -a "$REPORT"
npm audit --omit=dev 2>&1 | tee -a "$REPORT"

# ═══ SECURITY SCAN ═══
echo "" | tee -a "$REPORT"
echo "═══════════ SECURITY HARDENING CHECK ═══════════" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── .env files tracked by git? ──" | tee -a "$REPORT"
cd ~/pos-system
git ls-files | grep -E '\.env' | tee -a "$REPORT" || echo "✅ No .env tracked" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── Hardcoded secrets search ──" | tee -a "$REPORT"
grep -rn "your_super_secret\|pos_password_123" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  ~/pos-system/backend/src ~/pos-system/mobile/src 2>/dev/null \
  | tee -a "$REPORT" || echo "✅ No hardcoded secrets found" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── console.log in production code ──" | tee -a "$REPORT"
grep -rn "console\.log" \
  --include="*.ts" --include="*.tsx" \
  ~/pos-system/backend/src ~/pos-system/mobile/src 2>/dev/null \
  | tee -a "$REPORT" || echo "✅ No console.log found" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "── Raw SQL usage (should be empty) ──" | tee -a "$REPORT"
grep -rn "executeRawUnsafe\|queryRawUnsafe" \
  --include="*.ts" \
  ~/pos-system/backend/src 2>/dev/null \
  | grep -v "test" | tee -a "$REPORT" || echo "✅ No unsafe raw SQL in src/" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "═══════════════════════════════════════════════════════" | tee -a "$REPORT"
echo "  AUDIT COMPLETE — $REPORT" | tee -a "$REPORT"
echo "═══════════════════════════════════════════════════════" | tee -a "$REPORT"

echo ""
echo ""
echo "📄 Report saved to: $REPORT"
echo "📄 To convert to PDF: pandoc \"$REPORT\" -o audit.pdf"
