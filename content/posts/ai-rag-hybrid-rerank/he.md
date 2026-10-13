---
title: "שליפה טובה יותר: חיפוש היברידי, reranking ו-chunks עם הקשר"
summary: "שלוש טכניקות שמתקנות את רוב כשלי השליפה ב-RAG: שילוב חיפוש מילות מפתח עם חיפוש וקטורי, דירוג מחדש של המועמדים, והוספת הקשר לכל chunk."
date: 2026-10-13
tags: [ai, rag]
series: { key: ai-rag, order: 3 }
---

הפוסט הקודם הסתיים בשני סוגי כשל של RAG. הפוסט הזה עוסק בראשון: ה-chunk הנכון בכלל לא נשלף. שלוש טכניקות מתקנות את רוב המקרים האלה, והן מצטברות.

דוגמת מיזוג הדירוגים הורצה עם Python 3.9, והפלט שלה אמיתי. קוד ה-reranking מבוסס על [ה-quick start של Voyage AI](https://www.mongodb.com/docs/voyageai/quickstart/) ולא הורץ, ולכן הפלט שלו הוא **פלט לדוגמה**. המספרים לקוחים מהמאמר [Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) של Anthropic.

## חיפוש מילות מפתח עדיין חשוב

Embeddings מוצאים משמעות, אבל הם יכולים לפספס מחרוזות מדויקות: קוד שגיאה כמו `ERR_401`, מספר מוצר, שם של אדם. חיפוש מילות מפתח קלאסי טוב בדיוק בזה. האלגוריתם הסטנדרטי הוא **BM25**: הוא נותן ל-chunk ציון גבוה יותר כשהוא מכיל את מילות השאילתה, במיוחד מילים נדירות, ומתקן לפי האורך של ה-chunk.

רוב מנועי החיפוש ומסדי נתונים רבים תומכים ב-BM25 מהקופסה (Elasticsearch, OpenSearch, חיפוש טקסט מלא ב-PostgreSQL עם הרחבה, וספריות כמו `rank_bm25` ל-Python).

## חיפוש היברידי

**חיפוש היברידי** מריץ את שני החיפושים וממזג את שתי רשימות התוצאות. הציונים של שתי השיטות בסקאלות שונות, ולכן דרך נפוצה למזג היא להתעלם מהציונים ולהשתמש רק במקומות בדירוג. **Reciprocal rank fusion** (RRF) נותן לכל מסמך `1 / (k + rank)` מכל רשימה שהוא מופיע בה, כש-`k` הוא בדרך כלל 60:

```python
def rrf(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, doc in enumerate(ranking, start=1):
            scores[doc] = scores.get(doc, 0) + 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)

vector_results = ["doc_login", "doc_reset", "doc_2fa"]
keyword_results = ["doc_err_401", "doc_reset", "doc_login"]

print(rrf([vector_results, keyword_results]))
```

```text
['doc_login', 'doc_reset', 'doc_err_401', 'doc_2fa']
```

מסמכים ששני החיפושים מצאו עולים למעלה, ו-`doc_err_401`, שרק חיפוש מילות המפתח מצא, עדיין נכנס לרשימה.

## Reranking

חיפוש embeddings משווה שני וקטורים שחושבו בנפרד, וזה מהיר אבל גס. **Reranker** הוא מודל שקורא את השאילתה ואת המועמד יחד, ונותן ציון לכמה המועמד עונה על השאילתה. הוא איטי יותר, ולכן הוא רץ רק על המועמדים מהחיפוש הראשון:

```python
import voyageai

vo = voyageai.Client()

query = "What are my company's goals this quarter?"
candidates = [
    "This quarter, our company is focused on building new products and cutting costs.",
    "20th-century innovations centered on electronic advancements.",
    "Photosynthesis converts light energy into glucose.",
]

reranked = vo.rerank(query, candidates, model="rerank-3", top_k=2)
for r in reranked.results:
    print(f"{r.relevance_score:.2f}  {r.document[:50]}")
```

```text
0.84  This quarter, our company is focused on building
0.25  20th-century innovations centered on electronic
```

הדפוס המקובל הוא קודם רחב, אחר כך צר: שולפים הרבה מועמדים בזול, ואז מדרגים מחדש עד לכמה שתשלחו. בניסוי של Anthropic הם שלפו את 150 ה-chunks המובילים ודירגו אותם מחדש עד 20.

## Chunks עם הקשר

הרבה פעמים chunk לא מובן לבד. הדוגמה של Anthropic: "The company's revenue grew by 3% over the previous quarter." איזו חברה? איזה רבעון? לא embeddings ולא BM25 יצליחו להתאים את ה-chunk הזה לשאלה שמזכירה את שם החברה.

**Contextual retrieval** פותר את זה בזמן האינדוקס. לכל chunk, מודל כותב הקשר קצר (בדרך כלל 50 עד 100 טוקנים) שממקם את ה-chunk במסמך שלו, וההקשר הזה מתווסף ל-chunk לפני שנבנים גם ה-embedding וגם אינדקס ה-BM25. prompt ברוח המאמר:

```text
<document>
{{WHOLE_DOCUMENT}}
</document>

Here is a chunk from the document above:
<chunk>
{{CHUNK}}
</chunk>

Write a short context that situates this chunk within the overall document,
to improve search retrieval of the chunk. Answer only with the context.
```

מכיוון שכל המסמך נשלח שוב לכל chunk, prompt caching מוזיל את זה מאוד: חלק המסמך נשמר ב-cache, ורק ה-chunk משתנה.

## כמה זה עוזר

Anthropic מדדו באיזו תדירות ה-chunk הנכון חסר מ-20 התוצאות המובילות, בממוצע על כמה מאגרי נתונים:

| הגדרה | כשלי שליפה |
|---|---|
| embeddings בלבד | 5.7% |
| contextual embeddings | 3.7% (35% פחות) |
| contextual embeddings + contextual BM25 | 2.9% (49% פחות) |
| כל הנ"ל + reranking | 1.9% (67% פחות) |

המספרים האלה מגיעים מהנתונים והמודלים שלהם. מה שעובר אליכם הוא הכיוון: כל שכבה עוזרת. מדדו על השאלות שלכם לפני ואחרי כל שינוי.

הפוסט הבא עוסק בצעד האחרון: לתת למודל להחליט איך ומתי לחפש, ושליפה מבוססת גרף.
