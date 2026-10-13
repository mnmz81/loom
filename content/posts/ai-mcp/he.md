---
title: "MCP: פרוטוקול ההקשר למודלים"
summary: "מה זה MCP, למה הוא קיים, hosts, clients ו-servers, כלים, משאבים ו-prompts, שני ה-transports, ושרת MCP קטן ב-Python."
date: 2026-10-13
tags: [ai, agents, mcp, tutorial]
series: { key: ai-agents, order: 2 }
---

הפוסט הקודם הגדיר כלי בתוך אפליקציה אחת. אם רוצים את אותו כלי ב-IDE, באפליקציית הצ'אט ובסוכן, צריך לכתוב את הדבק שלוש פעמים. **MCP** (Model Context Protocol) הוא תקן פתוח שפותר את זה: כותבים כלי פעם אחת כשרת MCP, וכל אפליקציה שמדברת MCP יכולה להשתמש בו.

העובדות מבוססות על [מפרט MCP](https://modelcontextprotocol.io/specification/latest) (גרסה 2026-07-28 בזמן הכתיבה) ועל המדריך הרשמי [Build a server](https://modelcontextprotocol.io/docs/develop/build-server). הקוד לא הורץ בשביל הפוסט.

## למה צריך פרוטוקול

בלי תקן, כל זוג של (אפליקציה, מקור נתונים) צריך אינטגרציה משלו. עם N אפליקציות ו-M מקורות, זה N × M חתיכות דבק. עם פרוטוקול משותף, כל אפליקציה מממשת MCP פעם אחת, וכל מקור מממש אותו פעם אחת.

המפרט מציין שההשראה שלו היא ה-Language Server Protocol, שעשה את אותו הדבר לשפות תכנות ולעורכים: language server אחד עובד בכל עורך שמדבר LSP.

## Hosts, clients ו-servers

המפרט מגדיר שלושה תפקידים:

- **Host**: האפליקציה שהמשתמש עובד בה, כמו IDE, אפליקציית צ'אט או סוכן. הוא מחזיק את השיחה ואת המודל, והוא מבקש מהמשתמש הסכמה.
- **Client**: מחבר בתוך ה-host. כל client מדבר עם server אחד בדיוק.
- **Server**: תוכנה שמציעה יכולות: קבצים, מסד נתונים, API חיצוני.

![host מריץ client אחד לכל server. שרתים יכולים להיות מקומיים דרך stdio או מרוחקים דרך Streamable HTTP](/images/ai-mcp/mcp-architecture.svg)

עיקרון תכנון אחד במפרט שווה תשומת לב: server לא אמור לקרוא את כל השיחה או "לראות לתוך" שרתים אחרים. ה-host מחליט מה כל שרת מקבל.

## מה שרת מציע

שרתים מציעים שלושה סוגי דברים, והם נבדלים במי ששולט בהם:

- **Tools**: פונקציות שהמודל יכול לקרוא להן, כמו הכלים מהפוסט הקודם. המודל מחליט מתי.
- **Resources**: נתונים כמו קבצים, רשומות או תגובות API, שהאפליקציה או המשתמש מצרפים כהקשר.
- **Prompts**: תבניות מוכנות שהמשתמש בוחר, הרבה פעמים כפקודת slash.

בכיוון ההפוך, שרת יכול לבקש דברים מה-client: **elicitation** (לבקש מהמשתמש מידע נוסף) ו-**sampling** (לבקש מהמודל של ה-host לייצר טקסט).

ההודעות הן JSON-RPC 2.0. המפרט מגדיר שני transports סטנדרטיים: **stdio**, שבו ה-host מפעיל את השרת כתת-תהליך והם מדברים דרך הקלט והפלט הסטנדרטיים, ו-**Streamable HTTP**, שבו כל הודעה היא HTTP POST ל-endpoint אחד. שרתים מקומיים משתמשים בדרך כלל ב-stdio, ושרתים מרוחקים ב-HTTP.

## שרת MCP קטן ב-Python

המדריך הרשמי משתמש ב-`uv` ובחבילה `mcp`:

```bash
uv init notes-server
cd notes-server
uv add "mcp[cli]"
```

שרת עם כלי אחד. ה-SDK בונה את סכמת הכלי מה-type hints ומה-docstring:

```python
import logging
from mcp.server import MCPServer

logger = logging.getLogger(__name__)
mcp = MCPServer("notes")

NOTES = {"shopping": "milk, eggs, bread", "ideas": "a blog series about AI"}

@mcp.tool()
def read_note(name: str) -> str:
    """Read one of the user's notes.

    Args:
        name: The note name, for example "shopping"
    """
    logger.info("reading note %s", name)  # הלוגים הולכים ל-stderr
    return NOTES.get(name, f"No note named {name!r}. Available: {', '.join(NOTES)}")

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

אזהרה אחת מהמדריך חשובה מאוד: בשרת stdio, **לעולם אל תכתבו ל-stdout**. ה-stdout נושא את הודעות ה-JSON-RPC, ו-`print()` אחד שנשכח משבש אותן. השתמשו במודול `logging`, שכותב ל-stderr.

## חיבור לאפליקציה

לכל host יש הגדרות משלו, אבל רובם בנויים באותה צורה: פקודה שמפעילה את השרת. ב-Claude Desktop, המדריך מוסיף את השרת ל-`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notes": {
      "command": "uv",
      "args": ["--directory", "/ABSOLUTE/PATH/TO/notes-server", "run", "server.py"]
    }
  }
}
```

אחרי הפעלה מחדש, ה-host מפעיל את השרת, מקבל את רשימת הכלים שלו ומציע אותם למודל. Claude Code, סביבות פיתוח ו-frameworks רבים לסוכנים תומכים בשרתי MCP בצורה דומה, ול-API של Claude יש MCP connector לשרתים מרוחקים.

## אבטחה

המפרט ישיר לגבי הסיכון: כלים "מייצגים הרצת קוד שרירותית, ויש להתייחס אליהם בזהירות המתאימה". העקרונות המרכזיים שלו:

- המשתמש חייב לתת הסכמה מפורשת לפני שכלי רץ או לפני שמידע משותף עם שרת.
- תיאורים ו-annotations של כלים משרת שאתם לא סומכים עליו צריכים להיחשב לא אמינים.
- מי שמממש צריך לבנות תהליכי הסכמה והרשאה ברורים.

בפועל: התקינו שרתי MCP רק ממקורות שאתם סומכים עליהם, קראו מה הכלים שלהם יכולים לעשות, ותנו להם את הגישה המצומצמת ביותר שעובדת. שרת זדוני, או מסמך זדוני ששרת מחזיר, יכולים לנסות לכוון את המודל. הפוסט על אבטחה מסביר את המתקפה הזו, prompt injection, לעומק.

הפוסט הבא עוסק בסוכנים: מה הופך מודל עם כלים לסוכן.
