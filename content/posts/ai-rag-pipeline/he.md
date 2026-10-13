---
title: "RAG: שליפה שמעשירה את התשובה"
summary: "ה-pipeline המלא של RAG: מתי צריך אותו, פיצול מסמכים ל-chunks, שליפת הקרובים ביותר, ובניית prompt שעונה רק מתוכם."
date: 2026-10-13
tags: [ai, rag, tutorial]
series: { key: ai-rag, order: 2 }
---

**RAG** (retrieval-augmented generation) היא הדרך הנפוצה ביותר לתת למודל לענות מתוך המסמכים שלכם. הרעיון פשוט: לפני ששואלים את המודל, מחפשים במסמכים את החלקים הרלוונטיים ושמים אותם ב-prompt. המודל עונה מטקסט שהוא רואה, ולא מהזיכרון.

דוגמת הפיצול הורצה עם Python 3.9, והפלט שלה אמיתי. קוד ה-API מבוסס על התיעוד הרשמי ולא הורץ, ולכן הפלט שלו הוא **פלט לדוגמה**. המספרים על איכות השליפה לקוחים מהמאמר [Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) של Anthropic.

## האם צריך RAG בכלל?

לא תמיד. המאמר של Anthropic אומר שאם בסיס הידע שלכם קטן מבערך 200 אלף טוקנים (כ-500 עמודים), אפשר לשים את כולו ב-prompt ולוותר על שליפה. עם prompt caching, בקשות חוזרות על אותו טקסט נעשות זולות ומהירות הרבה יותר.

צריך RAG כשהמסמכים לא נכנסים, כשהם משתנים לעיתים קרובות, או כשרוצים לציין בדיוק מאיזה מקור הגיעה כל תשובה. רוב בסיסי הידע בחברות מגיעים לשם.

## ה-pipeline

ל-RAG יש שני מסלולים. **אינדוקס** רץ פעם אחת, ושוב בכל פעם שהמסמכים משתנים. **מענה** רץ לכל שאלה.

![אינדוקס: מסמכים, chunks, embeddings, מאגר וקטורים. מענה: שאלה, embedding, ה-chunks הקרובים ביותר, prompt ל-LLM](/images/ai-rag-pipeline/rag-pipeline.svg)

הפוסט הקודם הסביר embeddings ומאגרי וקטורים. הפוסט הזה מסביר את שני החלקים שקובעים את רוב האיכות: הפיצול וה-prompt.

## פיצול ל-chunks

מסמכים מפוצלים ל-**chunks** לפני יצירת ה-embeddings, משתי סיבות: וקטור אחד לא מייצג היטב מסמך של 50 עמודים, ורוצים לשלוח למודל רק את החלקים הרלוונטיים. המאמר של Anthropic אומר ש-chunks הם בדרך כלל לא יותר מכמה מאות טוקנים.

השיטה הפשוטה ביותר היא chunks בגודל קבוע עם **חפיפה** (overlap), כך שמשפט שנחתך בגבול עדיין מופיע שלם באחד ה-chunks:

```python
def chunk_words(text, size, overlap):
    words = text.split()
    step = size - overlap
    return [" ".join(words[i:i + size]) for i in range(0, len(words), step) if words[i:i + size]]

text = "one two three four five six seven eight nine ten eleven twelve"
for c in chunk_words(text, size=5, overlap=2):
    print(c)
```

```text
one two three four five
four five six seven eight
seven eight nine ten eleven
ten eleven twelve
```

מערכות אמיתיות מפצלות בדרך כלל לפי המבנה של המסמך עצמו: כותרות, פסקאות, פונקציות בקוד. שמרו מטא-דאטה עם כל chunk (הקובץ, הסעיף, התאריך), כדי שתוכלו להציג את המקור ולסנן לפיו בהמשך.

## בניית ה-prompt

אחרי השליפה יש לכם את ה-chunks המובילים. ה-prompt שם אותם בראש, בתוך תגיות, ומבקש מהמודל לענות רק מתוכם, בעזרת הטכניקות מהפוסטים על prompting ועל הזיות:

```python
import anthropic

client = anthropic.Anthropic()

def answer(question, chunks):
    docs = "\n".join(
        f'<document index="{i}"><source>{c["source"]}</source>'
        f'<document_content>{c["text"]}</document_content></document>'
        for i, c in enumerate(chunks, start=1)
    )
    prompt = (
        f"<documents>\n{docs}\n</documents>\n\n"
        "Answer the question using only the documents above. "
        "Cite the document index for each claim. "
        "If the documents do not contain the answer, say so.\n\n"
        f"Question: {question}"
    )
    message = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

chunks = [
    {"source": "hr/vacation.md", "text": "Employees get 20 vacation days per year."},
    {"source": "hr/sick.md", "text": "Sick days do not count as vacation days."},
]
print(answer("How many vacation days do I get?", chunks))
```

```text
You get 20 vacation days per year [1]. Sick days are counted separately [2].
```

## כמה chunks לשלוח

מעט מדי chunks והתשובה עלולה להיות חסרה. יותר מדי, ואתם משלמים על רעש ומסתכנים ב-context rot. בניסויים של Anthropic, שליחה של 20 ה-chunks המובילים עבדה טוב יותר מ-5 או 10. התייחסו לזה כנקודת התחלה ומדדו על השאלות שלכם.

## כש-RAG נותן תשובה גרועה

יש שני כשלים שונים, ולכל אחד תיקון אחר:

- **השליפה נכשלה**: ה-chunk הנכון לא היה בתוצאות. מתקנים את הפיצול, את ה-embeddings או את החיפוש. הפוסט הבא מסביר חיפוש היברידי ו-reranking.
- **הכתיבה נכשלה**: ה-chunk הנכון היה שם, אבל המודל התעלם ממנו או הוסיף דברים. מתקנים את ה-prompt.

כדי להבחין ביניהם, שמרו בלוג את ה-chunks שנשלפו עם כל תשובה. הפוסט על evals מראה איך מודדים את שניהם.

הפוסט הבא משפר את השליפה עם חיפוש מילות מפתח, reranking ו-chunks עם הקשר.
