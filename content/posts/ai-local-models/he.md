---
title: "הרצת מודלים מקומית: Ollama וקוונטיזציה"
summary: "למה להריץ מודל עם משקלות פתוחים על המחשב שלכם, כמה זיכרון הוא צריך, מה עושה קוונטיזציה, ואיך קוראים למודל מקומי עם Ollama, כולל מה-SDK של Anthropic."
date: 2026-10-13
tags: [ai, llm, tutorial]
series: { key: ai-tuning, order: 3 }
---

מודלים מתארחים רצים על השרתים של הספק. מודלים עם **משקלות פתוחים** (open-weight) מפרסמים את המשקלות שלהם, כך שאפשר להוריד ולהריץ אותם בעצמכם: על לפטופ, על שרת או על טלפון. הפוסט הזה מסביר למה כדאי, איזו חומרה צריך, ואיך עושים את זה עם Ollama.

דוגמאות הזיכרון והקוונטיזציה הורצו עם Python 3.9 והפלט שלהן אמיתי. הפקודות של Ollama מבוססות על התיעוד הרשמי של [ה-quickstart](https://docs.ollama.com/quickstart), של [ה-chat API](https://docs.ollama.com/api/chat) ושל [התאימות ל-Anthropic](https://docs.ollama.com/api/anthropic-compatibility), ולא הורצו, ולכן הפלט שלהן הוא **פלט לדוגמה**.

## למה להריץ מודל מקומית

- **פרטיות**: המידע לא יוצא מהמחשב או מהרשת שלכם.
- **עבודה בלי אינטרנט**, ובלי תלות בשירות חיצוני.
- **עלות בכמויות גדולות**: אין חשבון לפי טוקן, רק החומרה שלכם.
- **שליטה**: גרסת מודל קבועה, adapters שאימנתם בעצמכם, כל הגדרות הדגימה.

המחיר: המודלים הפתוחים שאפשר להריץ על חומרה רגילה קטנים יותר, ובדרך כלל פחות מוכשרים מהגדולים שבמודלים המתארחים. הם חזקים במשימות ממוקדות (סיווג, חילוץ, סיכום, עזרה פשוטה בקוד) וחלשים יותר בחשיבה ארוכה וקשה.

## כמה זיכרון מודל צריך

המשקלות צריכים להיכנס לזיכרון (זיכרון GPU, או זיכרון מאוחד ב-Apple Silicon). הגודל הוא בערך מספר הפרמטרים כפול מספר הבתים לפרמטר:

```python
params = 7_000_000_000  # מודל עם 7 מיליארד פרמטרים

for name, bits in [("16-bit", 16), ("8-bit", 8), ("4-bit", 4)]:
    gb = params * bits / 8 / 1e9
    print(f"{name}: {gb:.1f} GB for the weights alone")
```

```text
16-bit: 14.0 GB for the weights alone
8-bit: 7.0 GB for the weights alone
4-bit: 3.5 GB for the weights alone
```

מעבר למשקלות, המודל צריך זיכרון להקשר שהוא מעבד, וזה גדל עם אורך ההקשר. כך שמודל ש"נכנס" עם prompt קצר עלול לא להיכנס עם מסמך ארוך.

## קוונטיזציה

**קוונטיזציה** (quantization) שומרת כל משקל עם פחות ביטים. צורה פשוטה ממפה את המשקלות למספרים שלמים של 8 ביט בעזרת מקדם קנה מידה אחד:

```python
weights = [0.42, -1.37, 0.05, 0.91, -0.26]

scale = max(abs(w) for w in weights) / 127   # ממפים את המשקל הגדול ביותר ל-127
quantized = [round(w / scale) for w in weights]
restored = [q * scale for q in quantized]

print("int8:    ", quantized)
print("restored:", [round(r, 3) for r in restored])
```

```text
int8:     [39, -127, 5, 84, -24]
restored: [0.421, -1.37, 0.054, 0.906, -0.259]
```

הערכים המשוחזרים קרובים אבל לא מדויקים. שיטות אמיתיות חכמות יותר (מקדם לכל קבוצת משקלות, פורמטים מיוחדים של 4 ביט), אבל הפשרה זהה: פחות זיכרון וטעינה מהירה יותר, תמורת ירידה קטנה באיכות שגדלה ככל שמספר הביטים קטן. כלים מקומיים מספקים בדרך כלל מודלים שכבר עברו קוונטיזציה, הרבה פעמים בפורמט הקבצים GGUF של llama.cpp. השם או התגית של המודל אומרים מה הדיוק.

## Ollama

**Ollama** מוריד, מריץ ומגיש מודלים פתוחים עם פקודה אחת:

```bash
ollama run gemma4:e2b
```

הפקודה מורידה את המודל ופותחת צ'אט בטרמינל (מקלידים `/bye` כדי לצאת). Ollama גם מריץ שרת מקומי על פורט 11434. ה-chat API שלו מקבל את אפשרויות הדגימה מהפוסט על temperature, שמודלי Claude המתארחים הנוכחיים כבר לא מקבלים:

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "gemma4:e2b",
  "messages": [{"role": "user", "content": "Suggest a name for a coffee shop."}],
  "stream": false,
  "options": {"temperature": 0.7, "top_p": 0.9, "seed": 42}
}'
```

הגדרת `seed` הופכת את הפלט לניתן לשחזור עבור אותו מודל, prompt ואפשרויות, וזה שימושי בבדיקות.

## אותו קוד למקומי ולמתארח

Ollama חושף גם endpoint שתואם ל-Anthropic, כך שה-SDK של `anthropic` מהסדרה הזו יכול לדבר עם מודל מקומי רק משינוי הכתובת. התיעוד אומר שמפתח ה-API "נדרש אבל לא נבדק":

```python
import anthropic

client = anthropic.Anthropic(
    base_url="http://localhost:11434",
    api_key="ollama",  # נדרש אבל לא נבדק
)

message = client.messages.create(
    model="gemma4:e2b",
    max_tokens=200,
    temperature=0.2,
    messages=[{"role": "user", "content": "In one sentence, what is quantization?"}],
)
print(message.content[0].text)
```

```text
Quantization stores a model's weights with fewer bits to save memory and speed it up.
```

תיעוד התאימות מפרט מה עובד (הודעות, streaming, system prompts, כלים, תמונות ב-base64, חשיבה) ומה לא (ספירת טוקנים, `tool_choice`, prompt caching, batches, ציטוטים ומסמכי PDF). זה מקל לפתח מול מודל מקומי ולעבור למתארח, או לשלוח בקשות פשוטות למודל מקומי וקשות למודל מתארח, דפוס ה-routing מסדרת הסוכנים.

כאן מסתיימת הסדרה על התאמת מודלים. הסדרה האחרונה עוסקת במה שנדרש כדי להריץ את כל זה ב-production: evals, observability, עלות, אבטחה ו-guardrails.
