---
title: "Observability: לראות מה מערכת LLM עושה"
summary: "מה לרשום בכל קריאה למודל ובכל צעד של סוכן, traces ו-spans, tracer קטן ב-Python, המדדים ששווה לעקוב אחריהם, פרטיות, והפיכת כשלים ב-production ל-evals."
date: 2026-10-13
tags: [ai, llmops]
series: { key: ai-production, order: 2 }
---

Eval אומר לכם איך המערכת מתפקדת על מקרים שהכנתם. **Observability** אומר לכם מה היא עושה על המקרים שלא הכנתם: משתמשים אמיתיים, מסמכים אמיתיים, ריצות אמיתיות של סוכנים. מערכות LLM צריכות את זה יותר מרוב התוכנות, כי אותו קוד יכול לתת תשובה אחרת, לעבור מסלול אחר בין הכלים, או לעלות פי עשרה בבקשה הבאה.

ה-tracer הורץ עם Python 3.9 והפלט שלו אמיתי. הקריאות למודל ולחיפוש בתוכו הן תחליפים, וערכי האלפיות-שנייה משתנים בכל הרצה.

## מה לרשום

לכל קריאה למודל, רשמו לפחות:

- **מה נכנס**: המודל, תבנית ה-prompt והגרסה שלה, ההגדרות (effort, max_tokens), והקלט (או הפניה אליו, ראו פרטיות בהמשך).
- **מה יצא**: הטקסט או הקריאות לכלים, ו-`stop_reason`.
- **כמה זה עלה**: `usage.input_tokens`, `usage.output_tokens`, ושדות ה-cache כשמשתמשים ב-caching.
- **כמה זמן זה לקח**, וכל שגיאה.

בסוכנים, רשמו גם כל קריאה לכלי: הכלי, הקלט שלו, גרסה מקוצרת של התוצאה, והאם הוא נכשל. כשסוכן נותן תשובה גרועה, הסיבה כמעט תמיד נראית ברצף הזה: חיפוש שלא החזיר כלום, קובץ שהוא אף פעם לא פתח, שגיאה שהוא קרא לא נכון.

## Traces ו-spans

בקשה של משתמש יכולה להפעיל הרבה צעדים: שליפה, דירוג מחדש, כמה קריאות למודל, כמה כלים. **Trace** מקבץ את כולם תחת מזהה אחד, וכל צעד הוא **span** עם התזמון והנתונים שלו. ה-trace המלא עונה על "למה הבקשה הזו הייתה איטית?" או "למה היא עלתה 2 דולר?".

tracer מינימלי מראה את הרעיון: כל צעד רושם שורת JSON אחת עם מזהה ה-trace:

```python
import json, time

def traced(step_name):
    def wrap(fn):
        def inner(*args, trace_id, **kwargs):
            start = time.perf_counter()
            result = fn(*args, **kwargs)
            span = {
                "trace_id": trace_id,
                "step": step_name,
                "ms": round((time.perf_counter() - start) * 1000),
                "input_tokens": result.get("input_tokens"),
                "output_tokens": result.get("output_tokens"),
            }
            print(json.dumps(span))
            return result
        return inner
    return wrap

@traced("retrieve")
def retrieve(question):
    time.sleep(0.02)  # תחליף לחיפוש וקטורי
    return {"chunks": ["..."]}

@traced("generate")
def generate(question, chunks):
    time.sleep(0.05)  # תחליף לקריאה למודל
    return {"text": "...", "input_tokens": 1830, "output_tokens": 212}

trace_id = "req-0001"  # ב-production: מזהה ייחודי לכל בקשה
chunks = retrieve("How many vacation days?", trace_id=trace_id)["chunks"]
generate("How many vacation days?", chunks, trace_id=trace_id)
```

```text
{"trace_id": "req-0001", "step": "retrieve", "ms": 23, "input_tokens": null, "output_tokens": null}
{"trace_id": "req-0001", "step": "generate", "ms": 57, "input_tokens": 1830, "output_tokens": 212}
```

## להשתמש בתקן ולא לכתוב לבד

במערכת אמיתית, השתמשו ב-**OpenTelemetry**, התקן הפתוח ל-traces, מדדים ולוגים, שרוב כלי הניטור מבינים. יש לו סט של [מוסכמות סמנטיות ל-generative AI](https://github.com/open-telemetry/semantic-conventions-genai) שמגדירות שמות סטנדרטיים לקריאות למודל, לשימוש בטוקנים ולצעדי סוכן. הן עדיין מתפתחות, אז בדקו את הגרסה העדכנית. הרבה frameworks ל-LLM וכלי observability ייעודיים ל-LLM (בקוד פתוח ומתארחים) שולחים את ה-traces האלה בשבילכם, ומציגים אותם כציר זמן לכל בקשה.

## מדדים ששווה לעקוב אחריהם

- **זמן תגובה (latency)**, במיוחד p95 ו-p99, לא רק הממוצע. לסוכנים יש זנבות ארוכים.
- **טוקנים ועלות לבקשה**, ולכל משתמש או פיצ'ר. שינוי ב-prompt שמכפיל את טוקני הקלט מופיע כאן ראשון.
- **התפלגות `stop_reason`**: עלייה ב-`max_tokens` אומרת שתשובות נקטעות. עלייה ב-`refusal` אומרת שמשהו בקלט השתנה.
- **שיעור שגיאות בכלים** ו**מספר צעדים לריצת סוכן**. סוכן שפתאום צריך פי שניים צעדים מתקשה.
- **משוב משתמשים** (לייק או דיסלייק, עריכות, ניסיונות חוזרים), מקושר ל-trace.

התריעו על שינויים פתאומיים, לא רק על גבולות מוחלטים.

## פרטיות

Prompts ותשובות מכילים הרבה פעמים מידע אישי. החליטו מה לרשום לפני שאתם רושמים: הסתירו או השמיטו שדות אישיים, שמרו טקסט גולמי רק איפה שצריך ורק כמה זמן שצריך, הגבילו מי יכול לקרוא traces, ועקבו אחרי כללי שמירת המידע שלכם. הפוסט על guardrails מראה פונקציית השחרה פשוטה.

## לסגור את המעגל

Observability מזין את ה-evals. כש-trace מראה תשובה גרועה, מסלול איטי או סוכן מבולבל, הפכו אותו למקרה eval, תקנו את המערכת, ואשרו את התיקון עם ה-eval. עם הזמן, סט ה-eval הופך לתיעוד של כל הדרכים שבהן המערכת נכשלה.

הפוסט הבא עוסק בעלות ובזמני תגובה: איך הופכים את המערכת לזולה ומהירה יותר ברגע שאפשר למדוד אותה.
