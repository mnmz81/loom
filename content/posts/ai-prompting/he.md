---
title: "Prompting: איך לבקש ממודל"
summary: "ה-system prompt, הוראות ברורות עם סיבה, דוגמאות few-shot, תגיות XML ומסמכים ארוכים: טכניקות ה-prompting שהמדריך הרשמי ממליץ עליהן."
date: 2026-10-13
tags: [ai, llm]
series: { key: ai-basics, order: 5 }
---

ה-prompt הוא הדרך העיקרית לכוון מודל. הטכניקות כאן הן אלה שהמדריך [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) ממליץ עליהן לכל המודלים הנוכחיים.

הקוד לא הורץ בשביל הפוסט, ולכן בלוקי הפלט הם **פלט לדוגמה**.

## ה-system prompt

לבקשה יש שני מקומות להוראות. רשימת `messages` מחזיקה את השיחה. הפרמטר `system` מחזיק הוראות שחלות על כל השיחה: מי המודל, מה הוא צריך לעשות ומה לא, ובאיזה פורמט.

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    system="You are a helpful coding assistant specializing in Python.",
    messages=[{"role": "user", "content": "How do I sort a list of dictionaries by key?"}],
)
print(message.content[0].text)
```

```text
Use sorted() with a key function:

    people = [{"name": "Dana", "age": 31}, {"name": "Avi", "age": 25}]
    by_age = sorted(people, key=lambda p: p["age"])
...
```

המדריך אומר שהגדרת תפקיד ב-system prompt ממקדת את ההתנהגות ואת הטון, ו"אפילו משפט אחד עושה הבדל".

## להיות ברורים, ולהסביר למה

העצה המרכזית: להתייחס למודל כמו ל"עובד חדש ומבריק" שלא מכיר את הנורמות שלכם. כלל הזהב: להראות את ה-prompt לעמית בלי הקשר. אם הוא מתבלבל, גם המודל.

- כתבו בדיוק מה אתם רוצים, כולל הפורמט והמגבלות.
- כשהסדר חשוב, כתבו את השלבים כרשימה ממוספרת.
- תנו את הסיבה מאחורי כלל. הדוגמה של המדריך: במקום "לעולם אל תשתמש בשלוש נקודות", הסבירו שהתשובה תוקרא על ידי מנוע הקראה שלא יודע לבטא אותן. המודל מכליל מהסיבה.

## דוגמאות (few-shot)

דוגמאות הן אחת הדרכים האמינות ביותר לשלוט בפורמט ובטון. המדריך ממליץ על 3 עד 5 דוגמאות רלוונטיות, מגוונות מספיק כדי לכסות מקרי קצה, ועטופות בתגיות כדי שלא יתבלבלו עם ההוראות:

```text
Classify the sentiment of the review as positive, negative or mixed.

<examples>
<example>
Review: Fast delivery, but the box was crushed.
Sentiment: mixed
</example>
<example>
Review: Works exactly as described.
Sentiment: positive
</example>
<example>
Review: Stopped working after two days.
Sentiment: negative
</example>
</examples>

Review: {{REVIEW}}
```

אם כל הדוגמאות דומות זו לזו, המודל עלול להעתיק פרטים שלא התכוונתם אליהם, כמו האורך שלהן.

## תגיות XML למבנה

כש-prompt מערבב הוראות, הקשר, דוגמאות וקלט, עטפו כל סוג בתגית משלו (`<instructions>`, `<context>`, `<input>`) כדי לצמצם פרשנות שגויה. שמות התגיות אינם מילות מפתח: בחרו שמות ברורים והשתמשו בהם בעקביות.

## מסמכים ארוכים

לקלט של 20 אלף טוקנים ומעלה, שמים את המסמכים **בראש** ה-prompt ואת השאלה **בסוף**; לפי המדריך זה שיפר את האיכות "עד 30 אחוז". עם כמה מסמכים, עטפו כל אחד יחד עם המקור שלו:

```text
<documents>
  <document index="1">
    <source>annual_report_2025.pdf</source>
    <document_content>
      {{ANNUAL_REPORT}}
    </document_content>
  </document>
</documents>

Using only the report above, list the three biggest risks it mentions.
```

## מה השתנה במודלים הנוכחיים

שני טריקים ישנים כבר לא עובדים במודלי Claude הנוכחיים:

- **Prefill.** סיום רשימת `messages` בהודעת assistant חלקית, כדי לכפות את תחילת התשובה, נדחה ב-Claude Opus 4.6 ובמודלי Opus שאחריו, לפי מדריך המעבר. במקום זה השתמשו בפלט מובנה או בהוראות ב-system prompt.
- **פרמטרי דגימה**, שהוסברו בפוסט הקודם.
