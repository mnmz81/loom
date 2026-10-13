---
title: "Tools ו-function calling"
summary: "איך מודל קורא לפונקציות שלכם: הגדרת כלי, לולאת השימוש בכלים, תוצאות ושגיאות, ה-JSON הגולמי על הקו, ה-tool runner של ה-SDK, ואיך כותבים כלים טובים."
date: 2026-10-13
tags: [ai, agents, tutorial]
series: { key: ai-agents, order: 1 }
---

מודל לבדו יודע רק לכתוב טקסט. **כלים** (tools, נקרא גם function calling) מאפשרים לו לפעול: לבדוק מזג אוויר, לשאול מסד נתונים, לפתוח טיקט. המודל אף פעם לא מריץ דבר בעצמו. הוא מבקש מהקוד שלכם להריץ פונקציה, והקוד שלכם מחליט אם ואיך. הלולאה הזו היא הבסיס של כל סוכן בסדרה.

הקוד מבוסס על התיעוד הרשמי של [tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) ושל [tool runner](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner). הוא לא הורץ בשביל הפוסט, ולכן בלוקי הפלט הם **פלט לדוגמה**.

## הגדרת כלי

לכלי יש שלושה חלקים: `name`, `description` שאומר למודל מתי ואיך להשתמש בו, ו-`input_schema` ב-JSON Schema שמתאר את הארגומנטים שלו:

```python
tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a given location.",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City and state, e.g. San Francisco, CA",
                }
            },
            "required": ["location"],
        },
    }
]
```

המודל רואה את הגדרות הכלים כחלק מה-prompt, ולכן הן עולות טוקני קלט ונספרות בחלון ההקשר. התיאור חשוב כאן יותר מכל דבר אחר: לפיו המודל מחליט לקרוא לכלי.

## לולאת השימוש בכלים

כשהמודל רוצה כלי, הוא עוצר ועונה עם `stop_reason: "tool_use"` ועם בלוק `tool_use` אחד או יותר, ולכל אחד `id`, שם הכלי (`name`) והקלט (`input`). הקוד שלכם מריץ את הכלי ומחזיר בלוק `tool_result` עם אותו id, בהודעת משתמש חדשה. אז קוראים שוב למודל. הלולאה נגמרת כשהמודל עונה עם `end_turn`.

![לולאת הכלים: האפליקציה שולחת הודעות וכלים, המודל עונה עם tool_use, האפליקציה מריצה את הכלי ושולחת tool_result, עד end_turn](/images/ai-tools-function-calling/tool-loop.svg)

לולאה מלאה שמטפלת בכמה קריאות לכלים בתור אחד ומדווחת שגיאות בחזרה למודל:

```python
import anthropic

client = anthropic.Anthropic()

def get_weather(location):
    return "15 degrees Celsius, partly cloudy"  # כאן תבוא הבדיקה האמיתית

TOOL_FUNCTIONS = {"get_weather": get_weather}

def run(user_text):
    messages = [{"role": "user", "content": user_text}]
    while True:
        response = client.messages.create(
            model="claude-opus-5-5",
            max_tokens=4096,
            tools=tools,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return next(b.text for b in response.content if b.type == "text")

        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            print(f"Claude called {block.name} with {block.input}")
            try:
                output = TOOL_FUNCTIONS[block.name](**block.input)
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
            except Exception as error:
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": str(error), "is_error": True})
        messages.append({"role": "user", "content": results})

print(run("What's the weather in San Francisco?"))
```

```text
Claude called get_weather with {'location': 'San Francisco, CA'}
The current weather in San Francisco is 15 degrees Celsius with partly cloudy skies.
```

שלושה פרטים הופכים את הלולאה לנכונה:

- ה-`content` של ה-assistant מתווסף **בלי שינוי**. הוא יכול להכיל בלוקי חשיבה, ואותם צריך להחזיר כמו שהם.
- כל בלוקי ה-`tool_result` של תור אחד חוזרים בהודעת משתמש **אחת**. המודל יכול לבקש כמה כלים בבת אחת (parallel tool use).
- שגיאות חוזרות כ-`tool_result` עם `is_error: True`. המודל קורא את השגיאה ויכול לנסות שוב עם קלט אחר, במקום שהתוכנית שלכם תקרוס.

## מה עובר על הקו

מתחת ל-SDK, הבקשה של המודל לכלי היא JSON רגיל בגוף התגובה. כך נראה החלק של `tool_use` בתגובה:

```json
{
  "stop_reason": "tool_use",
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_01A09q90qw90lq917835lq9",
      "name": "get_weather",
      "input": { "location": "San Francisco, CA" }
    }
  ]
}
```

כל שפה שיודעת לשלוח HTTP POST ולפענח JSON יכולה להריץ את הלולאה הזו. ה-SDK רק חוסך הקלדה.

## שליטה במתי כלים נקראים

כברירת מחדל (`tool_choice` עם `auto`), המודל מחליט בכל תור אם לקרוא לכלי או לענות. התיעוד מפרט את האפשרויות האחרות: `any` (חייב לקרוא לכלי כלשהו), `tool` עם שם (חייב לקרוא לכלי הזה), ו-`none`. גם ה-system prompt מכוון את זה: התיעוד מציע "Use the tools to investigate before responding." כדי להגביר את השימוש בכלים.

הוספת `"strict": True` להגדרת כלי מבטיחה שהקלט של המודל יתאים לסכמה בדיוק, באותו מנגנון של פלט מובנה.

## ה-tool runner

ל-SDK של Python יש helper בבטא שמריץ את הלולאה בשבילכם. הדקורטור `@beta_tool` בונה את הסכמה מה-type hints ומה-docstring:

```python
from anthropic import Anthropic, beta_tool

client = Anthropic()

@beta_tool
def get_weather(location: str) -> str:
    """Get the current weather for a given location.

    Args:
        location: City and state, e.g. San Francisco, CA
    """
    return "15 degrees Celsius, partly cloudy"

runner = client.beta.messages.tool_runner(
    model="claude-opus-5-5",
    max_tokens=1024,
    tools=[get_weather],
    messages=[{"role": "user", "content": "What's the weather in Paris?"}],
)
final_message = runner.until_done()
print(final_message.content[-1].text)
```

השתמשו ב-runner למקרים פשוטים. כתבו את הלולאה בעצמכם כשאתם צריכים אישור אנושי לפני שכלי רץ, לוגים מותאמים, או הגבלות על מה מותר לקרוא.

## איך כותבים כלים טובים

המאמר [Building effective agents](https://www.anthropic.com/research/building-effective-agents) של Anthropic אומר את זה כך: להשקיע בהגדרות הכלים כמו ב-prompts. בפועל:

- כתבו את התיאור כמו לעמית חדש: מה הכלי עושה, מתי להשתמש בו, מה הוא מחזיר, ומה המגבלות שלו.
- הקשו על טעויות. הדוגמה מהמאמר: דרישה לנתיבי קבצים מוחלטים העלימה סוג שלם של שגיאות עם נתיבים יחסיים.
- החזירו תוצאות שימושיות וקצרות. dump של 5,000 שורות JSON ממלא את חלון ההקשר. החזירו את מה שהמודל צריך, והודעת שגיאה שאומרת איך לתקן את הקריאה.
- שמרו על סט קטן ומובחן. שני כלים עם תיאורים חופפים מבלבלים את המודל.
- אל תסמכו בעיניים עצומות על הקלט של כלי. המודל יכול לטעות או להיות מתופעל, אז בדקו את הקלט והגבילו את מה שכלי יכול לעשות. הפוסט על אבטחה מרחיב.

הפוסט הבא עוסק ב-MCP: דרך סטנדרטית לארוז כלים כך שכל אפליקציה תוכל להשתמש בהם.
