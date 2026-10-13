---
title: "סוכנים: מודל עם כלים בלולאה"
summary: "מה הופך מערכת לסוכן, במה הוא שונה מ-workflow, מתי סוכן שווה את זה ומתי לא, סוכן מינימלי ב-Python, ו-Claude Agent SDK."
date: 2026-10-13
tags: [ai, agents]
series: { key: ai-agents, order: 3 }
---

"סוכן" (agent) היא המילה הכי עמוסה ב-AI כרגע. הפוסט הזה משתמש בהגדרה מהמאמר [Building effective agents](https://www.anthropic.com/research/building-effective-agents) של Anthropic: סוכן הוא מערכת שבה המודל "מכוון באופן דינמי את התהליכים שלו ואת השימוש שלו בכלים". בפועל, זו לולאת הכלים משני פוסטים קודם, שרצה עד שהמשימה נגמרת, כשהמודל בוחר כל צעד.

הקוד מבוסס על התיעוד הרשמי ולא הורץ בשביל הפוסט, ולכן בלוק הפלט הוא **פלט לדוגמה**. הדוגמה של ה-Agent SDK מבוססת על [ה-quickstart של Agent SDK](https://code.claude.com/docs/en/agent-sdk/quickstart).

## מה זה סוכן

המאמר מתחיל מ**LLM מועשר** (augmented LLM): מודל עם שליפה, כלים וזיכרון, שיכול לכתוב שאילתות חיפוש משלו, לבחור כלים ולהחליט מה לשמור. סוכן מריץ את ה-LLM המועשר הזה בלולאה:

1. המודל מסתכל על המשימה ועל כל מה שראה עד עכשיו.
2. הוא בוחר פעולה: לקרוא לכלי, או לסיים.
3. הקוד שלכם מריץ את הכלי ומחזיר את התוצאה, "האמת מהסביבה".
4. חזרה לשלב 1.

המודל רואה את התוצאה האמיתית של כל פעולה, כמו בדיקה שנכשלה או קובץ שלא קיים, ומתאים את עצמו. לולאת המשוב הזו היא מה שמאפשר לסוכן לטפל במשימות שאי אפשר לתכנן את הצעדים שלהן מראש.

## Workflow או סוכן

המאמר מבחין בין שני סוגים של מערכות סוכניות:

- **Workflows**: המודל והכלים מתוזמרים "דרך מסלולי קוד מוגדרים מראש". הקוד שלכם מחליט על הצעדים.
- **סוכנים**: המודל מחליט על הצעדים.

![Workflow: הקוד קובע מסלול קבוע של צעדים. סוכן: המודל מחליט, פועל, צופה בתוצאה ומחליט שוב](/images/ai-agents/workflow-vs-agent.svg)

שניהם שימושיים. Workflow צפוי, זול יותר וקל יותר לבדיקה. סוכן גמיש, אבל הוא עולה יותר, לוקח יותר זמן, והטעויות שלו יכולות להצטבר לאורך הרבה צעדים.

## מתי לבנות סוכן

העצה המרכזית של המאמר היא למצוא את "הפתרון הפשוט ביותר האפשרי" ולהוסיף מורכבות רק כשצריך, וזה "עשוי להיות לא לבנות מערכות סוכניות בכלל". כלל אצבע טוב:

- **קריאה אחת** עם שליפה טובה ודוגמאות מספיקה לרוב המשימות: מענה, סיכום, חילוץ.
- **Workflow** מתאים כשהמשימה מתפרקת לשלבים ידועים. הפוסט הבא מציג את הדפוסים הנפוצים.
- **סוכן** מתאים לבעיות פתוחות שאי אפשר לחזות כמה צעדים הן ידרשו, וכשאפשר לסמוך על הבחירות של המודל: תיקון באג לאורך בסיס קוד שלם, מחקר שאלה מתוך הרבה מקורות.

## סוכן מינימלי

סוכן הוא לולאת הכלים, ועוד מטרה, כמה כלים ומגבלה קשיחה על מספר הצעדים. כאן הסוכן יכול להציג ולקרוא קבצים בתיקייה אחת:

```python
import pathlib
import anthropic

client = anthropic.Anthropic()
ROOT = pathlib.Path("./project").resolve()

def safe_path(name):
    path = (ROOT / name).resolve()
    if ROOT not in path.parents and path != ROOT:
        raise ValueError("path is outside the project folder")
    return path

def list_files(folder="."):
    return "\n".join(p.name for p in safe_path(folder).iterdir())

def read_file(name):
    return safe_path(name).read_text()[:5000]

TOOL_FUNCTIONS = {"list_files": list_files, "read_file": read_file}
tools = [
    {"name": "list_files", "description": "List the files in a folder of the project.",
     "input_schema": {"type": "object", "properties": {"folder": {"type": "string"}}}},
    {"name": "read_file", "description": "Read a text file from the project (first 5000 characters).",
     "input_schema": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}},
]

def agent(task, max_steps=10):
    messages = [{"role": "user", "content": task}]
    for step in range(max_steps):
        response = client.messages.create(model="claude-opus-5-5", max_tokens=8000,
                                          tools=tools, messages=messages)
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return next(b.text for b in response.content if b.type == "text")
        results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"step {step}: {block.name}({block.input})")
                try:
                    output = TOOL_FUNCTIONS[block.name](**block.input)
                    results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
                except Exception as error:
                    results.append({"type": "tool_result", "tool_use_id": block.id,
                                    "content": f"Error: {error}", "is_error": True})
        messages.append({"role": "user", "content": results})
    return "Stopped: step limit reached."

print(agent("Which Python version does this project require? Check the config files."))
```

```text
step 0: list_files({})
step 1: read_file({'name': 'pyproject.toml'})
The project requires Python 3.12 or newer (requires-python = ">=3.12" in pyproject.toml).
```

שימו לב מה הקוד שולט בו והמודל לא: אילו כלים קיימים, באיזו תיקייה מותר להם לגעת (`safe_path`), כמה כלי מחזיר, וכמה צעדים הסוכן מקבל. המודל רק בוחר בתוך הגבולות האלה.

## Frameworks לסוכנים

לא חייבים לכתוב את הלולאה בעצמכם. **Claude Agent SDK** נותן את אותה לולאת סוכן, כלים מובנים (קריאה, עריכה, חיפוש, הרצת פקודות, חיפוש ברשת), הרשאות וניהול הקשר שמפעילים את Claude Code, כספרייה ל-Python או TypeScript:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def main():
    async for message in query(
        prompt="Review utils.py for bugs that would cause crashes. Fix any issues you find.",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Glob"],
            permission_mode="acceptEdits",
        ),
    ):
        if isinstance(message, ResultMessage):
            print(f"Done: {message.subtype}")

asyncio.run(main())
```

`allowed_tools` קובע מה הסוכן רשאי לעשות בלי לשאול, ו-`permission_mode` כמה הוא צריך לשאול. העצה של המאמר לגבי frameworks עדיין תקפה: הם עוזרים להתחיל, אבל הם מסתירים את ה-prompts והתגובות שמתחת, אז הבינו מה רץ למטה לפני שאתם נשענים על אחד.

## מעקות בטיחות לסוכנים

מכיוון שסוכן פועל לבד, הגבולות הם האחריות שלכם:

- **מגבלת צעדים ועלות**: מספר מקסימלי של תורות ותקציב. סוכן שנתקע בלולאה שורף כסף.
- **הרשאה מינימלית**: רק הכלים שהמשימה צריכה, עם הגישה הצרה ביותר (תיקייה אחת, קריאה בלבד כשאפשר).
- **נקודות אישור אנושיות** לפני פעולות בלתי הפיכות: מחיקה, שליחה, תשלום, פריסה.
- **Sandbox** לכל מה שמריץ קוד: קונטיינר או VM, לא הלפטופ שלכם ולא production.
- **לוגים** של כל צעד, כדי שתוכלו לראות מה הסוכן עשה ולמה. הפוסט על observability מרחיב.

הפוסט הבא מציג את חמשת דפוסי ה-workflow מאותו מאמר, שפותרים הרבה בעיות בלי סוכן מלא.
