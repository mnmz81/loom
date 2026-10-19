---
title: "פלט מובנה ו-streaming"
summary: "איך מקבלים JSON שתמיד תואם לסכמה בעזרת structured outputs ו-Pydantic, ואיך מציגים את התשובה תוך כדי כתיבה בעזרת streaming."
date: 2026-10-13
tags: [ai, llm]
series: { key: ai-basics, order: 6 }
---

הקוד מבוסס על התיעוד הרשמי של [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) ושל [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming). הוא לא הורץ בשביל הפוסט, ולכן בלוקי הפלט הם **פלט לדוגמה**.

## למה "תענה ב-JSON" לא מספיק

אפשר לבקש JSON ב-prompt, וברוב המקרים תקבלו אותו. לפעמים תקבלו JSON עטוף במשפט, שדה חסר, או מחרוזת במקום שציפיתם לבוליאני. בקוד שמפענח את התשובה, "ברוב המקרים" זה באג.

**פלט מובנה** (structured outputs) פותר את זה במקור: נותנים ל-API סכמת JSON, והפלט של המודל מוגבל כך שיתאים לה. התיעוד מגדיר את זה בהגדרה `output_config.format` מסוג `json_schema`.

## פלט מובנה עם Pydantic

ה-SDK של Python יודע לבנות את הסכמה ממודל Pydantic ולאמת את התשובה בשבילכם, בעזרת `messages.parse()`:

```python
from pydantic import BaseModel
import anthropic

class ContactInfo(BaseModel):
    name: str
    email: str
    plan_interest: str
    demo_requested: bool

client = anthropic.Anthropic()

response = client.messages.parse(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "Extract the key information from this email: "
                   "John Smith (john@example.com) is interested in our Enterprise plan "
                   "and wants to schedule a demo for next Tuesday at 2pm.",
    }],
    output_format=ContactInfo,
)

contact = response.parsed_output
print(contact.name, contact.email, contact.demo_requested)
```

```text
John Smith john@example.com True
```

`parsed_output` הוא מופע של `ContactInfo`, כך שהעורך מכיר את השדות שלו והטיפוסים כבר נבדקו. כדי לשלוח סכמה גולמית בלי Pydantic, העבירו `output_config={"format": {"type": "json_schema", "schema": {...}}}` ל-`messages.create()` ופענחו את בלוק הטקסט עם `json.loads`.

## מגבלות שכדאי להכיר

התיעוד מפרט מגבלות על הסכמה ועל הפלט:

- כל אובייקט צריך `additionalProperties: false`, וסכמות רקורסיביות לא נתמכות.
- מגבלות מספריות ומגבלות אורך כמו `minimum` או `maxLength` לא נאכפות ב-API. ה-helper של Pydantic מעביר אותן לתיאורים ובודק אותן בקוד שלכם.
- אם המודל מסרב (`stop_reason: "refusal"`) או שנגמרים לו הטוקנים (`stop_reason: "max_tokens"`), הפלט עלול לא להתאים לסכמה. בדקו את `stop_reason`.
- הבקשה הראשונה עם סכמה חדשה איטית יותר, כי הסכמה עוברת קומפילציה. אחר כך היא נשמרת ב-cache ל-24 שעות.

אותו מנגנון קיים גם לכלים: הוספת `"strict": True` להגדרת כלי מבטיחה שהקלט שלו יתאים לסכמה. כלים מוסברים בסדרת הסוכנים.

## Streaming

בלי streaming, ה-API מחזיר את כל התשובה בסוף, ובתשובה ארוכה זה יכול לקחת הרבה שניות. עם streaming, ה-SDK מוסר לכם את הטקסט ברגע שהוא מגיע:

```python
with client.messages.stream(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain streaming in two sentences."}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

    final = stream.get_final_message()

print()
print(final.usage.output_tokens)
```

```text
Streaming sends the answer in small pieces as the model writes it, instead of waiting
for the full response. The user starts reading almost immediately.
38
```

`stream.get_final_message()` אוסף הכל לאובייקט הודעה רגיל, כך שבסוף עדיין יש לכם `usage` ו-`stop_reason`.

## מה עובר על הקו

מתחת למכסה המנוע, streaming משתמש ב-server-sent events. התיעוד מפרט את סדר האירועים:

```text
message_start          a message with empty content
content_block_start    a block begins (text, thinking, tool_use)
content_block_delta    a piece of the block: text_delta, input_json_delta, ...
content_block_stop     the block ends
message_delta          final fields such as stop_reason and usage
message_stop           the end
```

ברוב המקרים ה-SDK מטפל באירועים האלה בשבילכם. תצטרכו אותם כשאתם מזרימים לדפדפן בעצמכם, או כשאתם רוצים להציג קריאות לכלים וחשיבה בזמן אמת.
