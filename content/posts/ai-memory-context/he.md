---
title: "זיכרון וניהול הקשר"
summary: "איך סוכנים ממשיכים לעבוד כשמשימה גדלה מעבר לחלון ההקשר: context engineering, דחיסה (compaction), ניקוי תוצאות כלים, הערות וכלי הזיכרון, עם טיפול בטוח בקבצים."
date: 2026-10-13
tags: [ai, agents]
series: { key: ai-agents, order: 5 }
---

למודל אין זיכרון בין בקשות. כל מה שהוא "זוכר" בשיחה הוא ההיסטוריה שהקוד שלכם שולח מחדש בכל תור. לצ'אט קצר זה בסדר. סוכן שרץ שעה, קורא קבצים וקורא לכלים, ממלא אפילו חלון של מיליון טוקנים, ונעשה גרוע יותר הרבה לפני שהחלון מלא. הפוסט הזה מסביר את הטכניקות לשתי הבעיות.

העובדות מבוססות על המאמר [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) של Anthropic ועל התיעוד הרשמי של [כלי הזיכרון](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool), של [compaction](https://platform.claude.com/docs/en/build-with-claude/compaction) ושל [context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing). בדיקת הנתיבים הורצה עם Python 3.9 והפלט שלה אמיתי. קוד ה-API לא הורץ.

## ההקשר הוא תקציב

הפוסט על טוקנים הציג את context rot: היכולת לשלוף מידע יורדת ככל שההקשר גדל. המאמר על context engineering מסיק מזה מסקנה מעשית: להתייחס להקשר כ"משאב מוגבל עם תשואה פוחתת", ולשאוף ל"קבוצה הקטנה ביותר האפשרית של טוקנים עם הרבה אות" שמשיגה את המטרה.

הוא קורא לזה **context engineering**: לא רק לכתוב את ה-prompt, אלא להחליט בכל תור של הסוכן מה נמצא בחלון, מה-system prompt והכלים ועד הנתונים שנשלפו וההיסטוריה. חלק מהעצות שלו:

- **System prompt בגובה הנכון**: מספיק ספציפי כדי להנחות, לא ערימה של כללי if-else קשיחים. מתחילים קטן ומוסיפים לפי הכשלים שנצפו.
- **מעט כלים ברורים**, שהתוצאות שלהם קצרות.
- **שליפה בדיוק בזמן** (just-in-time): שומרים הפניות (נתיבי קבצים, שאילתות) וטוענים את התוכן עם כלי כשצריך, במקום לטעון הכל מראש.

## דחיסה (compaction)

כששיחה מתארכת, מחליפים את התורות הישנים בסיכום וממשיכים. המאמר קורא לזה **compaction**, וממליץ לכוון את הסיכום "קודם לשליפה": עדיף לשמור פרט שיתברר כמיותר מאשר לאבד פרט שחשוב.

אפשר לכתוב את זה בעצמכם: לבקש מהמודל לסכם את ההיסטוריה עד עכשיו, ואז להתחיל שיחה חדשה עם הסיכום כהודעה הראשונה. ה-API של Claude מציע גם דחיסה בצד השרת, בבטא בזמן הכתיבה, שבה ה-API כותב את הסיכום ומחליף את התורות הישנים בשבילכם. הפרטים משתנים, אז עקבו אחרי [התיעוד של compaction](https://platform.claude.com/docs/en/build-with-claude/compaction) לפרמטרים העדכניים.

## ניקוי תוצאות כלים ישנות

בסוכן, רוב ההקשר הוא בדרך כלל תוצאות כלים: תוכן קבצים, תוצאות חיפוש, פלט של פקודות. אחרי שהמודל השתמש בתוצאה, הוא כמעט אף פעם לא צריך את כל הטקסט שוב. המאמר קורא לניקוי תוצאות כלים ישנות צורה "עדינה" של דחיסה. התכונה **context editing** של ה-API יכולה לעשות את זה אוטומטית לפי כלל. בלולאה שלכם, אפשר להחליף את התוכן של `tool_result` ישנים בהערה קצרה כמו "[file content removed, read it again if needed]".

## הערות וכלי הזיכרון

הטכניקה השלישית שומרת מידע **מחוץ** לחלון. הסוכן כותב הערות תוך כדי עבודה (יומן התקדמות, רשימת משימות, החלטות שהתקבלו) וקורא אותן אחר כך, גם בסשן חדש. המאמר קורא לזה structured note-taking.

**כלי הזיכרון** (memory tool) הוא הצורה המובנית של זה ב-Claude. המודל מבקש להציג, ליצור, לערוך, לשנות שם או למחוק קבצים תחת `/memories`, והקוד שלכם מבצע כל פעולה על אחסון שאתם שולטים בו. ה-SDK של Python כולל מימוש מוכן על מערכת הקבצים המקומית:

```python
import anthropic
from anthropic.tools import BetaLocalFilesystemMemoryTool

client = anthropic.Anthropic()
memory = BetaLocalFilesystemMemoryTool(base_path="./memory")

runner = client.beta.messages.tool_runner(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Remember that customer Acme Corp prefers email follow-ups."}],
    tools=[memory],
)
final_message = runner.until_done()
```

בשיחה מאוחרת יותר עם אותו כלי ואותה תיקייה, המודל בודק קודם את הזיכרון שלו. לפי התיעוד, כשהכלי קיים בבקשה, ה-API מוסיף הוראה לעיין בתיקיית הזיכרון לפני כל דבר אחר.

## לשמור את הזיכרון בתוך התיקייה שלו

אם אתם כותבים מטפל זיכרון משלכם, התיעוד מזהיר במיוחד ממתקפה אחת: נתיב כמו `/memories/../../secrets.env` יכול לברוח מתיקיית הזיכרון. תפענחו כל נתיב לצורה המלאה שלו ובדקו שהוא נשאר בפנים:

```python
from pathlib import Path

BASE = Path("memory").resolve()

def to_real_path(memory_path):
    if not memory_path.startswith("/memories"):
        raise ValueError("must start with /memories")
    relative = memory_path[len("/memories"):].lstrip("/")
    real = (BASE / relative).resolve()
    real.relative_to(BASE)  # זורק ValueError אם real מחוץ ל-BASE
    return real

for p in ["/memories/notes.md", "/memories/../../secrets.env"]:
    try:
        print("ok     ", to_real_path(p).relative_to(BASE.parent))
    except ValueError:
        print("blocked", p)
```

```text
ok      memory/notes.md
blocked /memories/../../secrets.env
```

התיעוד מוסיף עוד אמצעי הגנה: להגביל את גודל הקבצים, למחוק קבצי זיכרון ישנים, ולא לתת למידע רגיש להיכתב לזיכרון.

## איזו טכניקה מתי

- צ'אט ארוך ← דחיסה.
- סוכן שקורא הרבה קבצים או מריץ הרבה פקודות ← ניקוי תוצאות כלים ישנות.
- עבודה שנמשכת על פני סשנים או ימים ← הערות או כלי הזיכרון.
- תתי-משימות שדורשות הרבה קריאה ← להעביר אותן לסוכני משנה (subagents), שעובדים בהקשר משלהם ומחזירים רק סיכום. זה הפוסט הבא.

הטכניקות מתחברות: התיעוד של כלי הזיכרון ממליץ לשלב דחיסה (כדי לשמור על הקשר פעיל קטן) עם זיכרון (כדי לשמור את מה שחייב לשרוד את הסיכום).
