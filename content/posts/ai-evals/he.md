---
title: "Evals: למדוד מערכת LLM"
summary: "למה כל מערכת LLM צריכה סט הערכה, איך בונים אחד, בדיקות בקוד, LLM-as-judge עם רובריקה, ואיך משתמשים ב-evals כדי להשוות prompts, מודלים והגדרות."
date: 2026-10-13
tags: [ai, llmops]
series: { key: ai-production, order: 1 }
---

כמעט כל פוסט בסדרה הסתיים ב"תמדדו". הפוסט הזה מסביר איך. **Eval** הוא סט של מקרי בדיקה עם דרך לתת ציון לפלט, שמריצים בכל פעם שמשנים את ה-prompt, את המודל, את השליפה או הגדרה כלשהי. בלי eval, כל שינוי הוא ניחוש, ואת הרגרסיות מגלים מהמשתמשים.

ה-harness הקטן הורץ עם Python 3.9 והפלט שלו אמיתי. הקריאה למודל בתוכו היא תחליף, כדי שאפשר יהיה לבדוק את ה-harness עצמו. קוד השופט מבוסס על המדריך הרשמי ל[פיתוח בדיקות](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) ולא הורץ.

## מה הופך eval לטוב

המדריך הרשמי נותן ארבעה עקרונות:

- **קריטריונים ספציפיים ומדידים.** לא "פלט בטוח", אלא, בדוגמה של המדריך, "פחות מ-0.1% מהפלטים מתוך 10,000 ניסיונות מסומנים כרעילים".
- **מקרים ספציפיים למשימה** שמשקפים את התעבורה האמיתית, כולל מקרי קצה: קלט לא רלוונטי, קלט ארוך מאוד, בקשות עמומות.
- **אוטומציה כשאפשר**, כדי שתוכלו להריץ בכל שינוי.
- **כמות לפני ליטוש.** המדריך אומר ש"יותר שאלות עם ציון אוטומטי באות מעט נמוך יותר עדיפות על פחות שאלות עם ציון אנושי באיכות גבוהה".

התחילו מדוגמאות אמיתיות: שאלות שמשתמשים שאלו, פניות שהגיעו, מסמכים שאתם מעבדים. המאמר של Anthropic על מערכת מרובת סוכנים התחיל מכ-20 שאלות מציאותיות. כמה עשרות מקרים טובים כבר תופסים את רוב הרגרסיות.

## ציון בקוד

כשאפשר לבדוק את התשובה בקוד, בודקים בקוד. זה מהיר, זול ומדויק. eval לסיווג עם התאמה מדויקת:

```python
# eval זעיר: לכל מקרה יש קלט ותווית צפויה
cases = [
    {"input": "I was charged twice", "expected": "billing"},
    {"input": "App crashes on upload", "expected": "bug"},
    {"input": "How do I change my email?", "expected": "account"},
    {"input": "Refund for last month please", "expected": "billing"},
]

def classify(text):
    # תחליף לקריאה למודל, כדי שאפשר יהיה לבדוק את ה-harness עצמו
    fake_answers = {"I was charged twice": "Billing", "App crashes on upload": "bug",
                    "How do I change my email?": "billing", "Refund for last month please": "billing"}
    return fake_answers[text]

def exact_match(output, expected):
    return output.strip().lower() == expected.lower()

failures = []
for case in cases:
    output = classify(case["input"])
    if not exact_match(output, case["expected"]):
        failures.append((case["input"], case["expected"], output))

passed = len(cases) - len(failures)
print(f"passed {passed}/{len(cases)} ({passed / len(cases):.0%})")
for text, expected, got in failures:
    print(f"FAIL: {text!r}: expected {expected!r}, got {got!r}")
```

```text
passed 3/4 (75%)
FAIL: 'How do I change my email?': expected 'account', got 'billing'
```

בדיקות קוד נוספות מהמדריך: האם מחרוזת מופיעה, JSON תקין מול סכמה, דמיון embeddings בין תשובות (לעקביות), ו-ROUGE לסיכומים. ב-RAG, בדקו גם את השליפה בנפרד: האם ה-chunk הנכון היה בתוצאות המובילות?

## LLM-as-judge

טון, מועילות ונאמנות למסמך אי אפשר לבדוק עם התאמה מדויקת. לאלה, מודל שני נותן ציון לפלט לפי **רובריקה**:

```python
import anthropic

client = anthropic.Anthropic()

def judge(question, answer, documents):
    prompt = f"""Grade the answer using only the documents.

<documents>{documents}</documents>
<question>{question}</question>
<answer>{answer}</answer>

Rubric:
- 1: every claim in the answer is supported by the documents
- 0: at least one claim is not supported, or the answer contradicts the documents

Think about each claim first, then end with a line "SCORE: 0" or "SCORE: 1"."""
    reply = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in reply.content if b.type == "text")
    return int(text.strip().splitlines()[-1].removeprefix("SCORE:").strip())
```

מה הופך שופט לאמין:

- **רובריקה מפורטת** עם רמות ברורות, לא "האם זה טוב?". סקאלות בינאריות או קטנות (0/1, 1 עד 5) עקביות יותר מציונים פתוחים.
- **נימוק לפני הציון**, כדי שהשופט יבחן כל טענה לפני שהוא מחליט.
- **מודל שונה מזה שנבדק**, מה שהמדריך מכנה "בדרך כלל best practice".
- **לבדוק את השופט** מול כמה עשרות מקרים שדירגתם ביד. אם הוא חולק עליכם הרבה, תקנו את הרובריקה לפני שאתם סומכים על המספרים שלו.

## איך משתמשים ב-evals

Eval הוא כלי להחלטות:

- **לפני שינוי**: מריצים ושומרים את הציון. אחרי: מריצים שוב ומשווים. מסתכלים על המקרים שהתהפכו, לא רק על הסך הכל.
- **בחירת מודל או רמת effort**: התיעוד ממליץ שוב ושוב על effort sweep, הרצה של אותו eval בכמה רמות ובחירה בזולה ביותר ששומרת על האיכות.
- **ב-CI**: eval קטן ומהיר בכל שינוי ב-prompt, כמו בדיקות יחידה. eval גדול יותר לפני release.
- **מה-production**: כשמשתמש מדווח על תשובה גרועה, מוסיפים אותה כמקרה. ה-eval גדל מכשלים אמיתיים.

זכרו שפלט של LLM משתנה בין הרצות. להחלטות חשובות, הריצו כל מקרה יותר מפעם אחת והשוו ממוצעים, לא תוצאות בודדות.

הפוסט הבא עוסק ב-observability: לראות מה המערכת שלכם עושה בפועל ב-production.
