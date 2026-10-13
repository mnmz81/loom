---
title: "Computer use ו-Agent Skills"
summary: "סוכנים שמפעילים שולחן עבודה דרך צילומי מסך, עכבר ומקלדת, ו-skills: תיקיות של הוראות וסקריפטים שנותנות לסוכן מומחיות רק כשהוא צריך אותה."
date: 2026-10-13
tags: [ai, agents]
series: { key: ai-agents, order: 7 }
---

הפוסט האחרון בסדרת הסוכנים עוסק בשתי יכולות שמרחיבות את מה שסוכן יכול לעשות. **Computer use** מאפשר למודל להפעיל שולחן עבודה גרפי, לתוכנות שאין להן API. **Agent Skills** אורזים מומחיות (הוראות, סקריפטים וקבצי עזר) כך שסוכן טוען אותה רק כשמשימה צריכה אותה.

העובדות מבוססות על התיעוד הרשמי של [computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) ושל [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview). הקוד לא הורץ בשביל הפוסט.

## Computer use: שולחן עבודה ככלי

Computer use הוא שוב לולאת הכלים, עם מסך בתור הסביבה. המודל מבקש פעולה, כמו צילום מסך, לחיצה במיקום מסוים, הקלדת טקסט או לחיצה על מקש. האפליקציה שלכם מבצעת אותה בסביבת שולחן עבודה שאתם שולטים בה ומחזירה את התוצאה, בדרך כלל צילום מסך חדש. המודל מסתכל על הצילום ובוחר את הפעולה הבאה.

התיעוד מפרט את הפעולות שהכלי הנוכחי מציע: צילום מסך והגדלה, פעולות עכבר (לחיצות, גרירה, הזזה, גלילה), פעולות מקלדת (הקלדה, מקש, החזקת מקש) והמתנה. במודלים הנוכחיים סוג הכלי הוא `computer_toolset_20260801`, והוא לא דורש beta header:

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    tools=[{"type": "computer_toolset_20260801"}],
    messages=[{"role": "user", "content": "Open the settings app and turn on dark mode."}],
)
```

מכאן הקוד שלכם מריץ את הלולאה הרגילה: מבצע כל פעולה שהתבקשה, מחזיר תוצאה אחת לכל פעולה (תמונה לצילומי מסך), וקורא שוב למודל. הקואורדינטות מתייחסות לפיקסלים של צילומי המסך ששלחתם, אז אם הקטנתם צילומים, המירו את הקואורדינטות בחזרה למסך האמיתי.

## Computer use מסוכן

מודל שיכול ללחוץ על כל דבר יכול גם ללחוץ על הדבר הלא נכון, או להיות מרומה. התיעוד ממליץ:

- להריץ ב-**VM או קונטיינר ייעודי** עם הרשאות מינימליות, אף פעם לא על המחשב שלכם כשהחשבונות שלכם מחוברים.
- להרחיק ממנו **מידע רגיש ופרטי התחברות**.
- להגביל את הגישה לאינטרנט ל**רשימה מותרת** של דומיינים.
- לדרוש **אישור אנושי** לפעולות משמעותיות כמו תשלומים או אישור תנאים.

התיעוד מזהיר גם מפני **prompt injection**: המודל עלול לבצע הוראות שהוא רואה בדף אינטרנט או בתמונה, גם כשהן סותרות את שלכם. Anthropic מוסיפים מסווגים שסורקים את תוצאות הכלים, אבל לפי התיעוד הם לא מחליפים את אמצעי הזהירות האלה.

השתמשו ב-computer use כשאין API. כשיש, כלי רגיל מהיר, זול ואמין הרבה יותר.

## Agent Skills

System prompt צריך להחזיק הכל מראש, ותקציב ההקשר מהפוסטים הקודמים מגביל כמה זה יכול להיות. **Skills** פותרים את זה עם תיקיות. Skill הוא תיקייה עם קובץ `SKILL.md`, ואופציונלית עוד הוראות, סקריפטים וקבצי עזר:

```text
pdf-processing/
├── SKILL.md        name, description, main instructions
├── FORMS.md        extra guide, read only when filling forms
├── REFERENCE.md    detailed reference
└── scripts/
    └── fill_form.py
```

`SKILL.md` מתחיל ב-YAML frontmatter. ה-`description` אומר מה ה-skill עושה **ו**מתי להשתמש בו, כי לפיו המודל מתאים בקשות:

```markdown
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
---

# PDF Processing

## Quick start

Use pdfplumber to extract text from PDFs. For form filling, see FORMS.md.
```

## חשיפה הדרגתית

Skills נטענים בשלוש רמות, כך שהתקנה של הרבה מהם עולה מעט:

1. **מטא-דאטה** (השם והתיאור, בערך 100 טוקנים ל-skill) נמצא תמיד ב-system prompt.
2. **הוראות** (הגוף של `SKILL.md`, מתחת ל-5 אלף טוקנים לפי התיעוד) נטענות רק כשבקשה מתאימה ל-skill.
3. **משאבים** נטענים רק כשההוראות מפנות אליהם. סקריפטים מורצים, ורק הפלט שלהם נכנס להקשר, אף פעם לא הקוד שלהם.

זה הרעיון של שליפה בדיוק בזמן מהפוסט על זיכרון, מיושם על ידע מקצועי במקום על נתונים.

## איפה skills רצים

Skills צריכים סביבה עם מערכת קבצים והרצת קוד. התיעוד מונה את המקומות: ה-API של Claude (עם כלי הרצת הקוד, כולל skills מוכנים ל-PowerPoint, Excel, Word ו-PDF), Claude Code (תיקיות ב-`~/.claude/skills/` או ב-`.claude/skills/`), ה-Agent SDK, ו-claude.ai. Skills מותאמים אישית לא מסתנכרנים בין המקומות האלה.

התייחסו ל-skills כמו להתקנת תוכנה. התיעוד אומר להשתמש רק ב-skills שכתבתם בעצמכם או שקיבלתם ממקור אמין, ולבדוק כל קובץ ב-skill לא מוכר: skill זדוני יכול לגרום לסוכן להריץ קוד או להדליף מידע.

הפוסט האחרון בסדרה עוסק ב-WebMCP, הצעה שמאפשרת לאתרים לתת לסוכנים כלים אמיתיים במקום פיקסלים ללחוץ עליהם.
