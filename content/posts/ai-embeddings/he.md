---
title: "Embeddings וחיפוש סמנטי"
summary: "מה זה embedding, איך cosine similarity מוצא טקסטים שאומרים את אותו הדבר, איך יוצרים embeddings עם Voyage AI, ואיפה שומרים אותם."
date: 2026-10-13
tags: [ai, rag, tutorial]
series: { key: ai-rag, order: 1 }
---

סדרת היסודות הסתיימה בבעיה: מודל יודע רק מה שהיה בנתוני האימון שלו. כדי לענות על שאלות על המסמכים שלכם, צריך קודם למצוא בהם את החלקים הנכונים. חיפוש לפי מילות מפתח מפספס טקסטים שאומרים את אותו הדבר במילים אחרות. **Embeddings** פותרים את זה, והם הבסיס של RAG.

דוגמת הדמיון הורצה עם Python 3.9, והפלט שלה אמיתי. הקוד של Voyage AI מבוסס על [מדריך ה-embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings) בתיעוד של Claude ולא הורץ, ולכן הפלט שלו הוא **פלט לדוגמה**.

## מה זה embedding

**Embedding** הוא רשימה של מספרים (וקטור) שמייצגת את המשמעות של טקסט. מודל embeddings מאומן כך שטקסטים עם משמעות דומה יקבלו וקטורים שמצביעים לכיוונים דומים. "How do I reset my password?" ו-"I forgot my login credentials" כמעט לא חולקים מילים, אבל הווקטורים שלהם יוצאים קרובים.

ל-embeddings אמיתיים יש מאות או אלפי מספרים. למספר בודד אין משמעות. רק המרחקים בין הווקטורים חשובים.

## מדידת דמיון

המדד הנפוץ הוא **cosine similarity**: הקוסינוס של הזווית בין שני וקטורים. 1 פירושו אותו כיוון, 0 פירושו שאין קשר. דוגמת צעצוע עם וקטורים בשלושה ממדים:

```python
import math

# "embeddings" צעצוע בשלושה ממדים (לאמיתיים יש בערך 1,000 ממדים)
vectors = {
    "How do I reset my password?": [0.9, 0.1, 0.0],
    "I forgot my login credentials": [0.8, 0.2, 0.1],
    "What is the refund policy?": [0.1, 0.9, 0.2],
    "Best pizza in Tel Aviv": [0.0, 0.1, 0.9],
}

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))

query = vectors["How do I reset my password?"]
for text, vec in vectors.items():
    print(f"{cosine(query, vec):.2f}  {text}")
```

```text
1.00  How do I reset my password?
0.98  I forgot my login credentials
0.21  What is the refund policy?
0.01  Best pizza in Tel Aviv
```

**חיפוש סמנטי** הוא בדיוק זה: הופכים את השאילתה ל-embedding, משווים אותה לווקטורים השמורים של המסמכים, ומחזירים את הקרובים ביותר. מודלי embeddings רבים מחזירים וקטורים מנורמלים לאורך 1, ואז המכפלה הסקלרית שווה ל-cosine similarity ומהירה יותר לחישוב.

## יצירת embeddings אמיתיים

ל-Anthropic אין מודל embeddings משלה. התיעוד של Claude מפנה ל-Voyage AI כספק אחד, וממליץ להשוות כמה ספקים. הדפוס זהה בכל ספק: יוצרים embeddings למסמכים פעם אחת, ולכל שאילתה כשהיא מגיעה.

```python
import numpy as np
import voyageai

vo = voyageai.Client()  # קורא את VOYAGE_API_KEY

documents = [
    "Apple's conference call is scheduled for Thursday, November 2, 2023 at 2:00 p.m. PT.",
    "Photosynthesis converts light energy into glucose.",
    "Shakespeare's works endure in literature.",
]
doc_vectors = vo.embed(documents, model="voyage-4", input_type="document").embeddings

query = "When is Apple's conference call scheduled?"
query_vector = vo.embed([query], model="voyage-4", input_type="query").embeddings[0]

scores = np.dot(doc_vectors, query_vector)
print(documents[int(np.argmax(scores))])
```

```text
Apple's conference call is scheduled for Thursday, November 2, 2023 at 2:00 p.m. PT.
```

שימו לב ל-`input_type`. התיעוד מבקש להגדיר אותו תמיד: `"document"` באינדוקס ו-`"query"` בחיפוש, כי המודל מקודד את השניים קצת אחרת כדי לשפר את השליפה. שמות מודלים משתנים, אז בדקו במדריך את הרשימה העדכנית.

## איפה שומרים וקטורים

לכמה אלפי וקטורים מספיק מערך NumPy בזיכרון. מעבר לזה כדאי **מסד נתונים וקטורי** או אינדקס וקטורי במסד נתונים שכבר רץ אצלכם. אפשרויות נפוצות הן pgvector (הרחבה ל-PostgreSQL), Chroma, Qdrant, Pinecone, והחיפוש הווקטורי של MongoDB Atlas או Elasticsearch.

כולם עושים את אותה עבודה בסיסית: שומרים וקטורים עם הטקסט והמטא-דאטה שלהם, ומחזירים במהירות את השכנים הקרובים של וקטור שאילתה, בעזרת חיפוש מקורב שנשאר מהיר גם במיליוני וקטורים.

## המגבלות של embeddings

Embeddings תופסים משמעות, וזו גם נקודת התורפה שלהם:

- **מונחים מדויקים.** קוד שגיאה, מק"ט של מוצר או שם נדיר לא תמיד יהיו קרובים למשהו במרחב הווקטורי. חיפוש מילות מפתח מוצא אותם בקלות.
- **הקשר שהולך לאיבוד.** קטע קצר ממסמך ("revenue grew 3%") לא אומר על איזו חברה או איזה רבעון מדובר.
- **תחום.** מודל כללי עלול לא להבחין בין מונחים שחשובים במשפט, ברפואה או בקוד. לחלק מהתחומים יש מודלים ייעודיים.

הפוסטים הבאים מטפלים בכל אחת מהבעיות. הבא בונה את ה-pipeline המלא של RAG.
