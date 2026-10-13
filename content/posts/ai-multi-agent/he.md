---
title: "מערכות מרובות סוכנים וסוכני משנה"
summary: "מתי כמה סוכנים עדיפים על אחד: מבנה ה-orchestrator וסוכני המשנה, מה Anthropic מדדו במערכת המחקר שלהם, עלות הטוקנים, וסוכני משנה ב-Claude Agent SDK."
date: 2026-10-13
tags: [ai, agents, tutorial]
series: { key: ai-agents, order: 6 }
---

סוכן אחד עם חלון הקשר אחד נתקל בסוף במגבלות מהפוסט הקודם: יותר מדי לקרוא, יותר מדי לזכור. **מערכת מרובת סוכנים** (multi-agent) מחלקת את העבודה: סוכן מוביל מתכנן ומאציל, ו**סוכני משנה** (subagents) עושים חלקים ממוקדים מהעבודה, כל אחד בהקשר נקי משלו, ומחזירים רק תוצאה קצרה.

המספרים לקוחים מהמאמר [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) של Anthropic. הקוד מבוסס על [התיעוד של subagents ב-Agent SDK](https://code.claude.com/docs/en/agent-sdk/subagents) ולא הורץ בשביל הפוסט.

## ה-orchestrator וסוכני המשנה

מערכת המחקר משתמשת בדפוס orchestrator-workers מהפוסט על workflows, עם סוכנים במקום קריאות בודדות:

- **סוכן מוביל** קורא את השאלה, מכין תוכנית, שומר אותה בזיכרון, ומפעיל כמה סוכני משנה.
- כל **סוכן משנה** מחפש על החלק שלו בשאלה, במקביל לאחרים, ומחזיר סיכום מתומצת.
- הסוכן המוביל מאחד את הסיכומים, אולי מפעיל עוד סוכני משנה, וכותב את התשובה. שלב נפרד מוסיף ציטוטים.

היתרון המרכזי הוא **בידוד הקשר**. סוכן משנה יכול לקרוא עשרות עמודים, אבל הסוכן המוביל רואה רק את הסיכום הקצר שלו, ולכן ההקשר של המוביל נשאר קטן וממוקד.

## מה זה הרוויח, ומה זה עלה

המאמר מדווח שמערכת עם Claude Opus 4 כמוביל וסוכני משנה של Claude Sonnet 4 "עקפה את Claude Opus 4 כסוכן יחיד ב-90.2%" בהערכת המחקר הפנימית שלהם.

גם צד העלות ברור. בנתונים שלהם, סוכנים צרכו בערך פי 4 טוקנים מצ'אט, ומערכות מרובות סוכנים בערך **פי 15**. במבחן אחד, כמות הטוקנים לבדה הסבירה 80% מההבדל בביצועים. מערכות מרובות סוכנים מנצחות בעיקר כי הן מוציאות יותר טוקנים, במקביל, על פני חלונות הקשר נפרדים.

## מתי זה מתאים, ומתי לא

המאמר מונה איפה מבנה מרובה סוכנים לא מתאים:

- משימות שהערך שלהן לא מצדיק בערך פי 15 טוקנים.
- משימות שבהן כל הסוכנים צריכים את אותו הקשר, או שהחלקים תלויים מאוד זה בזה.
- רוב משימות הקוד, שיש בהן פחות חלקים מקבילים באמת מאשר במחקר.

זה מתאים לעבודה רחבה ומקבילית: מחקר על פני הרבה מקורות, סקירה של בסיס קוד מכמה זוויות (אבטחה, בדיקות, סגנון), או ניתוח של הרבה מסמכים באופן בלתי תלוי.

## לקחים מהבנייה

הלקחים ההנדסיים מהמאמר תקפים לכל מערכת מרובת סוכנים:

- **כתבו תדריך מפורט** לסוכני המשנה: המטרה, פורמט הפלט, הכלים והגבולות. תדריכים מעורפלים הובילו לעבודה כפולה.
- **התאימו את המאמץ לשאלה.** גרסאות מוקדמות הפעילו הרבה סוכני משנה לשאלות פשוטות. כללים מפורשים תיקנו את זה.
- **חפשו קודם רחב, ואז צמצמו.**
- **תנו לכלים מטרות ברורות ונפרדות.** כשהמודל כתב מחדש תיאורי כלים פגומים, זמן המשימה ירד ב-40% בבדיקות שלהם.
- **העריכו מוקדם** עם סט קטן של כ-20 שאלות מציאותיות ושופט LLM, ועוד בדיקה אנושית למקרי קצה.

## סוכני משנה ב-Claude Agent SDK

ה-Agent SDK מאפשר להגדיר סוכני משנה בקוד. לכל אחד יש `description` (מתי להשתמש בו), `prompt` (ה-system prompt שלו), ואופציונלית רשימה מוגבלת של `tools` ו-`model`:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async def main():
    async for message in query(
        prompt="Review the authentication module for security issues",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Grep", "Glob", "Agent"],
            agents={
                "code-reviewer": AgentDefinition(
                    description="Expert code review specialist. Use for quality and security reviews.",
                    prompt="You are a code review specialist. Identify security vulnerabilities "
                           "and suggest specific fixes. Be thorough but concise.",
                    tools=["Read", "Grep", "Glob"],  # קריאה בלבד
                    model="sonnet",
                ),
                "test-runner": AgentDefinition(
                    description="Runs and analyzes test suites.",
                    prompt="You run tests and report failing tests with a likely cause.",
                    tools=["Bash", "Read", "Grep"],
                ),
            },
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

הסוכן הראשי מפעיל סוכן משנה דרך הכלי `Agent`, לפי התיאור. התיעוד מונה ארבעה יתרונות: בידוד הקשר, עבודה במקביל, הוראות מותאמות, והגבלת כלים (הסוקר שלמעלה יכול לקרוא אבל לעולם לא לערוך).

## לשמור על העץ בשליטה

סוכן משנה יכול להפעיל סוכני משנה משלו, כך ש-prompt אחד יכול לצמוח לעץ של סוכנים. ל-SDK יש מגבלות לעומק, למקביליות ולהוצאה:

```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Grep", "Glob", "Agent"],
    env={
        "CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH": "1",   # סוכני משנה לא יכולים להפעיל משלהם
        "CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS": "5",
    },
    max_budget_usd=5.0,                                # עוצר את כל השאילתה ב-5 דולר
)
```

הגדירו אותן לפני שאתם מריצים מערכת מרובת סוכנים על משימה אמיתית. הפוסט הבא עוסק בסוכנים שפועלים על מסך של מחשב, וב-skills שאורזים מומחיות לסוכנים.
