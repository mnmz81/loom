---
title: "עלות וזמני תגובה: prompt caching, batches ובחירת מודל"
summary: "לאן הולכים הכסף והזמן במערכת LLM, והמנופים שמקצצים אותם: המודל וה-effort הנכונים, פלט קצר יותר, prompt caching, ה-Batch API ו-streaming."
date: 2026-10-13
tags: [ai, llmops]
series: { key: ai-production, order: 3 }
---

אתם משלמים על טוקנים, ומחכים לטוקנים. טוקני קלט זולים יותר ומעובדים מהר. טוקני פלט (כולל חשיבה) יקרים יותר ומגיעים אחד אחד. כמעט כל שיפור בעלות ובזמן תגובה הוא שליחה של פחות טוקנים, יצירה של פחות טוקנים, או שימוש חוזר בעבודה.

חישוב העלות הורץ עם Python 3.9 והפלט שלו אמיתי. הוא משתמש במחירים שמופיעים ב[סקירת המודלים](https://platform.claude.com/docs/en/models/overview) ובמכפילים שבתיעוד של [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) בזמן הכתיבה, ומחירים משתנים. קוד ה-API מבוסס על התיעוד של [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) ושל [batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) ולא הורץ.

## המנופים הגדולים

בסדר השפעה משוער:

1. **המודל.** מודל קטן יותר יכול לעלות הרבה פחות לטוקן ועונה מהר יותר. נתבו בקשות קלות למודל קטן ושמרו את הגדול לבקשות קשות (דפוס ה-routing). בדקו עם eval שהאיכות נשמרת.
2. **Effort ואורך הפלט.** חשיבה ותשובות ארוכות הן טוקני פלט. הורידו את ה-`effort` איפה שה-eval מאפשר, בקשו תשובות קצרות ב-prompt, והגדירו `max_tokens` למגבלה הגיונית.
3. **גודל הקלט.** שלחו את ה-chunks שהמשימה צריכה, לא מסמכים שלמים. בסוכנים, קצצו תוצאות כלים ישנות.
4. **שימוש חוזר**: prompt caching לקידומות שחוזרות, batches לעבודה שיכולה לחכות.

## Prompt caching

הרבה אפליקציות שולחות את אותה קידומת גדולה שוב ושוב: system prompt ארוך, הגדרות כלים, מסמך שהמשתמש שואל עליו כמה שאלות. **Prompt caching** שומר את הקידומת הזו אחרי הבקשה הראשונה, כך שבקשות מאוחרות יותר קוראות אותה מה-cache, בזול ובמהירות. הצורה הפשוטה ביותר היא הגדרה אחת ברמה העליונה:

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    cache_control={"type": "ephemeral"},
    system=LONG_SYSTEM_PROMPT,
    messages=[{"role": "user", "content": "What is the refund policy for annual plans?"}],
)

u = response.usage
print(u.cache_creation_input_tokens, u.cache_read_input_tokens, u.input_tokens)
```

```text
0 20000 300
```

בפלט לדוגמה הזה, 20,000 טוקנים נקראו מה-cache, ורק 300 טוקנים חדשים עובדו במחיר מלא. התיעוד מפרט את הכללים: כברירת מחדל ה-cache חי 5 דקות וכל פגיעה מרעננת אותו (יש גם אפשרות לשעה); כתיבה ל-cache עולה פי 1.25 ממחיר הקלט, וקריאה עולה חלק קטן ממנו (10% ברוב המודלים, 5% ב-Opus 5.5 וב-Sonnet 5.5); והקידומת חייבת להיות **זהה**, כך שחותמת זמן או שם משתמש לפני החלק השמור שוברים אותו. שימו תוכן יציב בהתחלה ותוכן משתנה בסוף.

## כמה caching חוסך

בוט תמיכה עם system prompt של 20,000 טוקנים, שעונה על 10,000 שאלות של 300 טוקנים כל אחת עם תשובות של 400 טוקנים, במחירי המחירון של Opus 5.5 בזמן הכתיבה:

```python
# מחירים בדולר למיליון טוקנים (Claude Opus 5.5, מסקירת המודלים בזמן הכתיבה)
INPUT, OUTPUT = 4.00, 20.00
CACHE_WRITE = INPUT * 1.25   # כתיבה ל-cache של 5 דקות
CACHE_READ = INPUT * 0.05    # קריאה מה-cache ב-Opus 5.5

requests = 10_000
system_prompt, question, answer = 20_000, 300, 400   # טוקנים לבקשה

def per_million(tokens, price):
    return tokens / 1_000_000 * price

plain = requests * (per_million(system_prompt + question, INPUT) + per_million(answer, OUTPUT))
cached = (per_million(system_prompt, CACHE_WRITE)                       # הבקשה הראשונה כותבת ל-cache
          + (requests - 1) * per_million(system_prompt, CACHE_READ)     # השאר קוראות ממנו
          + requests * (per_million(question, INPUT) + per_million(answer, OUTPUT)))

print(f"no caching:   ${plain:,.2f}")
print(f"with caching: ${cached:,.2f}")
print(f"batch, no caching: ${plain * 0.5:,.2f}")
```

```text
no caching:   $892.00
with caching: $132.10
batch, no caching: $446.00
```

החישוב מניח שה-cache נשאר חם, כלומר שבקשות מגיעות מספיק תכופות. כשהתעבורה דלילה, השתמשו ב-cache של שעה או קבלו כמה החטאות.

## ה-Batch API

עבודה שלא צריכה תשובה מיידית, כמו דוחות לילה, סיווג של צבר פניות, או יצירת נתונים ל-eval או ל-distillation, יכולה לעבור דרך ה-**Message Batches API**. התיעוד מציין הנחה של 50%, כשרוב ה-batches מסתיימים תוך שעה, עם מגבלה של 24 שעות:

```python
batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": f"ticket-{i}",
            "params": {
                "model": "claude-opus-5-5",
                "max_tokens": 200,
                "messages": [{"role": "user", "content": f"Classify this ticket: {text}"}],
            },
        }
        for i, text in enumerate(tickets)
    ]
)
print(batch.id, batch.processing_status)
```

בודקים עד ש-`processing_status` הוא `ended`, ואז קוראים את התוצאות עם `client.messages.batches.results(batch.id)`. כל תוצאה נושאת את ה-`custom_id` שלה, כי הסדר לא מובטח. לפי התיעוד, התוצאות זמינות 29 יום.

## זמן התגובה שהמשתמש מרגיש

חלק מזמן התגובה אי אפשר להוריד, אבל אפשר להסתיר אותו או להריץ במקביל:

- **Streaming** של התשובה, כך שהמילים הראשונות מופיעות תוך שנייה בערך, במקום אחרי כל התשובה.
- **קריאות בלתי תלויות במקביל** (דפוס ה-parallelization), במקום אחת אחרי השנייה.
- **Effort נמוך יותר** לפיצ'רים אינטראקטיביים. effort גבוה שומרים לעבודת רקע.
- **Caching** של הקידומת הארוכה: המאמר של Anthropic על contextual retrieval מדווח ש-caching קיצר את זמן התגובה ביותר מפי 2 ב-prompt גדול, ולא רק הוזיל.
- **העברת משימות פשוטות ובנפח גבוה** למודל קטן, או למודל מקומי.

מדדו לפני ואחרי עם ה-traces מהפוסט הקודם. הפוסט הבא עוסק באבטחה: מה יכול להשתבש כש-LLM קורא טקסט לא אמין ומבצע פעולות.
