---
title: "מולטימודלי: תמונות ו-PDF"
summary: "איך שולחים למודל תמונות ו-PDF, איך סופרים טוקנים של תמונה, במה ראייה ממוחשבת עדיין חלשה, ומה עושים עם אודיו."
date: 2026-10-13
tags: [ai, llm]
series: { key: ai-basics, order: 8 }
---

המודלים הנוכחיים קוראים יותר מטקסט. כל מודלי Claude הנוכחיים מקבלים תמונות, ו-PDF נקרא עמוד אחר עמוד, גם כטקסט וגם כתמונה של כל עמוד. הפוסט הזה מראה איך שולחים אותם, כמה זה עולה, ואיפה הגבולות.

קוד ה-API מבוסס על התיעוד הרשמי של [vision](https://platform.claude.com/docs/en/build-with-claude/vision) ושל [תמיכה ב-PDF](https://platform.claude.com/docs/en/build-with-claude/pdf-support) ולא הורץ, ולכן הפלט שלו הוא **פלט לדוגמה**. חישוב הטוקנים הורץ עם Python 3.9, והפלט שלו אמיתי.

## שליחת תמונה

תמונה היא בלוק תוכן בהודעת המשתמש, לצד בלוק טקסט. המקור יכול להיות URL, נתוני base64, או `file_id` מה-Files API:

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "url",
                "url": "https://platform.claude.com/docs/images/vision-example.jpg"}},
            {"type": "text", "text": "Describe this image in one sentence."},
        ],
    }],
)
print(message.content[0].text)
```

```text
A wide landscape photo of a mountain range under a clear sky.
```

התיעוד ממליץ לשים תמונות **לפני** השאלה, בדיוק כמו מסמכים ארוכים. כשיש כמה תמונות, תנו להן תוויות ("Image 1:", "Image 2:") כדי שתוכלו להתייחס אליהן. הפורמטים הנתמכים הם JPEG, PNG, GIF (רק הפריים הראשון) ו-WebP.

## כמה טוקנים עולה תמונה

המודל רואה תמונה כרשת של ריבועים בגודל 28×28 פיקסלים, וכל ריבוע הוא טוקן אחד. התיעוד נותן את הנוסחה `⌈width / 28⌉ × ⌈height / 28⌉`:

```python
import math

def image_tokens(width, height):
    return math.ceil(width / 28) * math.ceil(height / 28)

for w, h in [(200, 200), (1000, 1000), (1920, 1080)]:
    print(f"{w}x{h}: {image_tokens(w, h)} tokens")
```

```text
200x200: 64 tokens
1000x1000: 1296 tokens
1920x1080: 2691 tokens
```

תמונות שגדולות מהמגבלה של המודל מוקטנות קודם, וזה מגביל את העלות. ב-Claude 4.7 ובמודלים שאחריו המגבלה היא 2576 פיקסלים בצלע הארוכה ו-4784 טוקנים. במודלים ישנים המגבלה נמוכה יותר. אם אתם לא צריכים את הפרטים, הקטינו תמונות לפני השליחה: זה זול ומהיר יותר.

## PDF

PDF הוא בלוק מסוג `document`. המודל מקבל את הטקסט שחולץ **וגם** תמונה של כל עמוד, כך שהוא יכול לקרוא גרפים, טבלאות ועמודים סרוקים:

```python
message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "document", "source": {"type": "url",
                "url": "https://example.com/annual-report.pdf"}},
            {"type": "text", "text": "What are the key findings in this document?"},
        ],
    }],
)
```

בזמן הכתיבה התיעוד מציין מגבלה של 600 עמודים ו-32 MB לבקשה (100 עמודים במודלים עם חלון הקשר קטן יותר), ובלי קבצים מוצפנים או מוגני סיסמה. מכיוון שכל עמוד הוא גם תמונה, PDF צפוף יכול למלא את חלון ההקשר עוד לפני שהוא מגיע למגבלת העמודים.

## במה ראייה ממוחשבת עדיין חלשה

התיעוד מונה מגבלות שכדאי להכיר לפני שבונים על תמונות:

- תמונות קטנות, מטושטשות או מסובבות (מתחת לכ-200 פיקסלים) גורמות לטעויות.
- ספירה של הרבה עצמים קטנים היא משוערת.
- קואורדינטות ומיקומים הם משוערים.
- הוא לא יודע לזהות אם תמונה נוצרה ב-AI.
- הוא לא מזהה אנשים לפי הפנים.
- הוא רק **מבין** תמונות. הוא לא יוצר ולא עורך אותן.

## אודיו

מודלי Claude הנוכחיים מקבלים טקסט ותמונות כקלט, ולא אודיו. כדי לעבוד עם הקלטות, המירו קודם דיבור לטקסט בעזרת מודל או שירות speech-to-text, ואז שלחו את התמלול. אותו דבר לגבי וידאו: חלצו פריימים כתמונות, או תמלול.

הסדרה הבאה עוסקת בידע: איך נותנים למודל גישה למסמכים שלכם בעזרת embeddings ו-RAG.
