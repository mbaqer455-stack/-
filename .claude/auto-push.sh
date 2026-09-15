#!/usr/bin/env bash
# ============================================================================
# رفع تلقائي بعد كل مهمة — يُشغَّل من Stop hook (انظر .claude/settings.local.json)
#
# لماذا عند نهاية المهمة لا عند كل تعديل ملف: حتى لا يصل لشريكك شغل نصف
# مكتمل. وقبل الرفع نتأكد أن TypeScript يمرّ، فلا يسحب شريكك كودًا مكسورًا —
# التعديل يُحفظ محليًا على كل حال ويُرفع مع أول مهمة ناجحة بعدها.
# ============================================================================
set -u

# رسالة تظهر للمستخدم في الطرفية. node يتكفّل بترميز JSON بأمان.
say() { node -e 'process.stdout.write(JSON.stringify({systemMessage:process.argv[1]}))' "$1"; }

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

# دمج أو rebase غير مكتمل ⇒ لا نلمس شيئًا
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ]; then
  say "الرفع التلقائي متوقّف: هناك دمج أو rebase غير مكتمل."
  exit 0
fi

branch=$(git symbolic-ref --quiet --short HEAD) || { say "الرفع التلقائي متوقّف: HEAD منفصل."; exit 0; }
git remote get-url origin >/dev/null 2>&1 || exit 0

dirty=$(git status --porcelain)
ahead=$(git rev-list --count "origin/$branch..HEAD" 2>/dev/null || echo 0)
[ -z "$dirty" ] && [ "$ahead" = 0 ] && exit 0

# بوّابة الجودة: لا نرفع كودًا لا يمرّ من فاحص الأنواع
if ! out=$(npx --no-install tsc --noEmit 2>&1); then
  say "لم يُرفع: TypeScript فيه أخطاء. العمل محفوظ محليًا ويُرفع مع أول مهمة تمرّ.
$(printf '%s\n' "$out" | head -5)"
  exit 0
fi

if [ -n "$dirty" ]; then
  git add -A
  count=$(git diff --cached --name-only | wc -l | tr -d ' ')
  files=$(git diff --cached --name-only | head -6 | sed 's/^/  · /')
  git commit -q -F - <<MSG || true
تحديث تلقائي — $(date '+%Y-%m-%d %H:%M')

الملفات المعدَّلة ($count):
$files

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
fi

if err=$(git push origin "$branch" 2>&1); then
  say "رُفع إلى origin/$branch ✓"
else
  say "تعذّر الرفع إلى origin/$branch — العمل محفوظ محليًا:
$(printf '%s\n' "$err" | tail -3)"
fi
exit 0
