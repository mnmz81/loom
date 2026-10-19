---
title: "Agentic RAG ו-GraphRAG"
summary: "שני צעדים מעבר ל-pipeline קבוע של RAG: לתת למודל לחפש ככלי, כמה פעמים שצריך, ולבנות גרף ידע לשאלות שחוצות הרבה מסמכים."
date: 2026-10-13
tags: [ai, rag]
series: { key: ai-rag, order: 4 }
---

ה-pipeline של RAG מהפוסטים הקודמים רץ באותה צורה לכל שאלה: חיפוש אחד, ואז תשובה אחת. זה עובד לשאלות כמו "כמה ימי חופשה מגיעים לי?".

דוגמת הגרף הורצה עם Python 3.9, והפלט שלה אמיתי. הגדרת הכלי מבוססת על [התיעוד של tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), והתיאור של GraphRAG מבוסס על המאמר [From Local to Global](https://arxiv.org/abs/2404.16130).

## איפה pipeline קבוע נשבר

שלושה סוגי שאלות קשים ל-RAG של חיפוש אחד:

- **שאלות בכמה שלבים**: "אילו שירותים שלנו תלויים במסד הנתונים שנפל בשבוע שעבר?" קודם מוצאים את התקלה, אחר כך את מסד הנתונים, ואז את השירותים.
- **שאלות בניסוח לא מוצלח**: המילים של המשתמש לא תואמות למילים במסמכים, וחיפוש אחד מפספס.
- **שאלות גלובליות**: "מהן התלונות העיקריות בפניות התמיכה השנה?" אין chunk אחד שמחזיק את התשובה.

## Agentic RAG: חיפוש ככלי

ב-**agentic RAG**, השליפה מפסיקה להיות שלב קבוע והופכת ל**כלי** שהמודל יכול לקרוא לו. המודל מחליט מה לחפש, קורא את התוצאות, ומחליט אם לחפש שוב עם שאילתה טובה יותר, לחפש במקום אחר, או לענות. הכלי מוגדר עם שם, תיאור וסכמת JSON לקלט שלו:

```python
search_tool = {
    "name": "search_docs",
    "description": (
        "Search the company knowledge base. Returns the 10 most relevant chunks "
        "with their source. Use short, specific queries. Call it again with a "
        "different query if the results do not answer the question."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The search query"},
            "source": {"type": "string", "enum": ["wiki", "tickets", "code"]},
        },
        "required": ["query"],
    },
}
```

הקוד שלכם מריץ את החיפוש בפועל (החיפוש ההיברידי וה-reranking מהפוסט הקודם) בכל פעם שהמודל מבקש. סדרת הכלים, שבאה בהמשך, מראה את הלולאה המלאה.

## גרפי ידע

**גרף ידע** (knowledge graph) שומר עובדות כקשרים בין ישויות: (נושא, קשר, מושא). שאלות שקופצות מעובדה לעובדה הופכות להליכה לאורך הקשתות:

```python
# עובדות שחולצו ממסמכים בצורה (נושא, קשר, מושא)
triples = [
    ("Dana", "manages", "Payments team"),
    ("Payments team", "owns", "checkout-service"),
    ("checkout-service", "depends on", "postgres-main"),
    ("Avi", "manages", "Search team"),
]

def neighbors(entity):
    return [(rel, obj) for subj, rel, obj in triples if subj == entity]

# שאלה בכמה קפיצות: במה הצוות של Dana תלוי בסופו של דבר?
entity = "Dana"
for _ in range(3):
    rel, entity = neighbors(entity)[0]
    print(f"--{rel}--> {entity}")
```

```text
--manages--> Payments team
--owns--> checkout-service
--depends on--> postgres-main
```

כל אחת מהעובדות האלה יכולה לשבת במסמך אחר, ולכן לא סביר שחיפוש דמיון לבדו יביא את שלושתן לתוצאות המובילות.

## GraphRAG

**GraphRAG** היא שיטה שחוקרים ב-Microsoft תיארו במאמר [From Local to Global](https://arxiv.org/abs/2404.16130). היא משתמשת ב-LLM כדי לבנות את הגרף, ואז מסכמת אותו:

1. LLM קורא את המסמכים ומחלץ ישויות ואת הקשרים ביניהן.
2. ישויות שקשורות זו לזו מקובצות לקהילות.
3. LLM כותב מראש סיכום לכל קהילה.
4. כדי לענות על שאלה גלובלית, כל סיכום קהילה רלוונטי מפיק תשובה חלקית, והתשובות החלקיות מתאחדות לתשובה אחת.

המאמר מכוון לשאלות של "הבנה גלובלית" על קורפוס שלם, כמו הנושאים המרכזיים במאגר נתונים, ומדווח על תשובות מקיפות ומגוונות יותר מ-RAG רגיל במאגרים של כמיליון טוקנים.

## מתי להשתמש במה

- **RAG רגיל**: רוב התעבורה של שאלות ותשובות על מסמכים. מתחילים כאן.
- **Agentic RAG**: שאלות שצריכות כמה חיפושים או כמה מקורות, כשהאיכות חשובה יותר מזמן ההמתנה ומהעלות.
- **GraphRAG**: שאלות על קשרים ונושאים לאורך אוסף גדול. בנייה ועדכון של הגרף עולים הרבה קריאות ל-LLM, אז השתמשו בו כשהשאלות האלה הן הלב של המוצר.

בכל מקרה, מדדו: סט קטן של שאלות אמיתיות עם תשובות ידועות יגיד לכם איזו גישה באמת עוזרת. סדרת הייצור מסבירה איך.
