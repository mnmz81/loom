---
title: "חמישה דפוסי workflow"
summary: "Prompt chaining, routing, parallelization, orchestrator-workers ו-evaluator-optimizer: הדפוסים שפותרים את רוב משימות ה-LLM בלי סוכן מלא, עם Python קצר לכל אחד."
date: 2026-10-13
tags: [ai, agents, tutorial]
series: { key: ai-agents, order: 4 }
---

הפוסט הקודם טען בעד הפתרון הפשוט ביותר שעובד. בין קריאה אחת לסוכן מלא יש אמצע: **workflows**, שבהם הקוד שלכם קובע את המבנה והמודל ממלא כל שלב. המאמר [Building effective agents](https://www.anthropic.com/research/building-effective-agents) של Anthropic מגדיר חמישה דפוסים שמכסים את רוב המקרים.

הקוד לא הורץ בשביל הפוסט, ולכן בלוק הפלט הוא **פלט לדוגמה**. כל הדוגמאות משתמשות בפונקציית עזר קטנה:

```python
import anthropic

client = anthropic.Anthropic()

def llm(prompt, system="", effort="low"):
    message = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=4000,
        system=system,
        output_config={"effort": effort},
        messages=[{"role": "user", "content": prompt}],
    )
    return next(b.text for b in message.content if b.type == "text")
```

![חמישה דפוסים: prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer](/images/ai-workflow-patterns/patterns.svg)

## 1. Prompt chaining

מפרקים את המשימה לשלבים קבועים, וכל קריאה מקבלת את הפלט של הקודמת. בין השלבים, הקוד יכול לבדוק את התוצאה ולעצור מוקדם. הדוגמה של המאמר: לכתוב ראשי פרקים, לבדוק אותם, ואז לכתוב את המסמך. משלמים בזמן ומרוויחים בדיוק, כי לכל קריאה יש עבודה פשוטה יותר.

```python
outline = llm(f"Write a 5-point outline for a blog post about: {topic}")

if outline.count("\n") < 4:
    raise ValueError("Outline too short, stopping before the expensive step")

post = llm(f"Write the blog post following this outline exactly:\n\n{outline}", effort="medium")
```

## 2. Routing

קודם מסווגים את הקלט, ואז שולחים אותו למטפל שנבנה לקטגוריה הזו. כל מטפל מקבל prompt ממוקד, ומקרים קלים יכולים ללכת למודל קטן וזול יותר:

```python
CATEGORIES = ["billing", "technical", "other"]

category = llm(
    f"Classify this support message as one of {CATEGORIES}. Answer with the word only.\n\n{ticket}"
).strip().lower()

handlers = {
    "billing": "You are a billing specialist. Be precise about amounts and dates.",
    "technical": "You are a support engineer. Ask for logs if something is unclear.",
}
answer = llm(ticket, system=handlers.get(category, "You are a helpful support agent."))
print(category)
```

```text
billing
```

ב-production, השתמשו בפלט מובנה לסיווג במקום לפענח מילה, כך שהקטגוריה תמיד תהיה תקינה.

## 3. Parallelization

מריצים קריאות בלתי תלויות במקביל ומאחדים את התוצאות בקוד. המאמר מונה שתי צורות:

- **Sectioning**: חלקים שונים של העבודה במקביל, למשל קריאה אחת עונה בזמן שאחרת בודקת את הקלט מול המדיניות שלכם.
- **Voting**: אותה משימה כמה פעמים, למשל שלוש סקירות של אותו קוד, ומסמנים בעיה אם אחת מהן מצאה.

```python
from concurrent.futures import ThreadPoolExecutor

checks = {
    "security": "List security problems in this code, or say NONE.",
    "performance": "List performance problems in this code, or say NONE.",
    "readability": "List readability problems in this code, or say NONE.",
}

with ThreadPoolExecutor() as pool:
    futures = {name: pool.submit(llm, f"{task}\n\n{code}") for name, task in checks.items()}
    reports = {name: f.result() for name, f in futures.items()}

problems = {name: r for name, r in reports.items() if r.strip() != "NONE"}
```

## 4. Orchestrator-workers

מודל מוביל קורא את המשימה, מחליט אילו תתי-משימות נדרשות, מעביר אותן לקריאות worker, ומאחד את התוצאות. בניגוד ל-parallelization, תתי-המשימות לא ידועות מראש. הדוגמה של המאמר היא שינוי קוד שנוגע במספר לא ידוע של קבצים. בקוד, ה-orchestrator מחזיר רשימת תתי-משימות (רצוי כפלט מובנה), הקוד שלכם מריץ worker לכל אחת, וקריאה אחרונה מאחדת את התוצאות. זה קרוב מאוד לסוכן, והפוסט על מערכות מרובות סוכנים נבנה על זה.

## 5. Evaluator-optimizer

קריאה אחת כותבת, ואחרת מעריכה לפי קריטריונים ברורים ונותנת משוב, בלולאה עד שזה עובר או עד מגבלה. המאמר אומר שזה מתאים כשקריטריוני ההערכה ברורים ושיפור חוזר עוזר באופן מדיד, כמו בתרגום:

```python
draft = llm(f"Translate to Hebrew:\n\n{text}", effort="medium")

for attempt in range(3):
    review = llm(
        "Review this translation for accuracy and natural Hebrew. "
        "Answer PASS if it is good, otherwise list concrete fixes.\n\n"
        f"Original:\n{text}\n\nTranslation:\n{draft}"
    )
    if review.strip().startswith("PASS"):
        break
    draft = llm(f"Apply these fixes to the translation:\n{review}\n\nTranslation:\n{draft}")
```

## איך בוחרים דפוס

- השלבים ידועים ובסדר קבוע ← **chaining**.
- קלטים מסוגים שונים בבירור ← **routing**.
- בדיקות בלתי תלויות, או שרוצים כמה דעות ← **parallelization**.
- תתי-המשימות לא ידועות עד שקוראים את המשימה ← **orchestrator-workers**.
- האיכות משתפרת עם משוב ואפשר לנסח את הקריטריונים ← **evaluator-optimizer**.

הדפוסים מתחברים זה לזה: router יכול לשלוח מקרים קשים ל-chain, ושלב ב-chain יכול להיות לולאת evaluator. התחילו מהפשוט ביותר, מדדו, והוסיפו מבנה רק איפה שהמדידות מראות שיפור.

הפוסט הבא עוסק בזיכרון ובניהול הקשר: איך סוכנים ממשיכים לעבוד כשמשימה גדלה מעבר לחלון ההקשר.
