---
title: "גרסת API של Claude ‏2026-10-21: מה נשבר ואיך משדרגים"
summary: "גרסת ה-API החדשה הראשונה של Claude מאז 2023-06-01: אין יותר temperature, top_p ו-top_k, גרסאות major חדשות של ה-SDK שולחות אותה כברירת מחדל, ומפתח ה-API עובר ל-Authorization: Bearer."
date: 2026-10-23
tags: [ai, llm]
---

כל בקשה ל-API של Claude נושאת header בשם `anthropic-version`, ומאמצע 2023 הערך שלו היה `2023-06-01`. ב-21 באוקטובר 2026 Anthropic שחררו את `2026-10-21`, ואיתה גרסאות major חדשות של כל ה-SDK ושל ה-CLI ‏`ant`, ששולחות אותה כברירת מחדל.

העובדות מבוססות על [עמוד הגרסאות](https://platform.claude.com/docs/en/api/versioning) ועל [מדריך המעבר](https://platform.claude.com/docs/en/api/migration-2026-10-21) הרשמיים. דוגמת ה-Python הורצה עם Python 3.13 ו-`anthropic` 2.1.0.

## איזו גרסה הקוד שלכם שולח

SDK שולח את גרסת ה-API שהייתה עדכנית כשגרסת ה-major שלו יצאה. שדרוג בתוך אותו major נשאר על `2023-06-01`. אלה הגרסאות הראשונות ששולחות `2026-10-21`:

| SDK | הגרסה הראשונה על 2026-10-21 |
| --- | --- |
| Python `anthropic` | 2.0.0 |
| TypeScript `@anthropic-ai/sdk` | 1.0.0 |
| C# `Anthropic` | 13.0.0 |
| Go `anthropic-sdk-go/v2` | 2.0.0 |
| Java `anthropic-java` | 3.0.0 |
| PHP `anthropic-ai/sdk` | 1.0.0 |
| Ruby `anthropic` | 2.0.0 |
| `ant` CLI | 2.0.0 |

כך בודקים מה ה-client שלכם שולח:

```python
import anthropic

client = anthropic.Anthropic(api_key="sk-test")
print(anthropic.__version__)
print(client.default_headers["anthropic-version"])
print(client.auth_headers)
```

```text
2.1.0
2026-10-21
{'Authorization': 'Bearer sk-test'}
```

אותו קוד עם `anthropic` 1.17.0 מדפיס `2023-06-01` ו-`{'X-Api-Key': 'sk-test'}`. בלי SDK קובעים את ה-header בעצמכם: `-H "anthropic-version: 2026-10-21"`.

## מה נשבר ב-Messages API

השינויים חלים על `POST /v1/messages`, על ספירת טוקנים ועל כל בקשה ב-Message Batch שנוצר עם `2026-10-21`. כל אחד מהם מחזיר שגיאת 400:

- **`temperature`, `top_p` ו-`top_k` הוסרו**, בכל מודל, גם עם ערך ברירת המחדל. בלעדיהם המודל משתמש בברירות המחדל (`temperature` של 1.0). Claude 4.7 והמודלים שאחריו כבר מקבלים רק את ברירות המחדל, אז אצלם שום דבר לא משתנה. במודל כמו Claude Sonnet 4.6, בקשה שהורידה את `temperature` מאבדת את ההשפעה הזאת, ואין הגדרה אחרת שמחליפה אותה: מורידים את הפרמטר, או משאירים את הבקשה הזאת על `2023-06-01`.
- **בלוק `document` ישירות בהודעת `assistant`.** שולחים מסמכים בהודעות `user`. מסמך שמקונן בתוך בלוק אחר, למשל תוצאת web fetch ש-Claude החזיר, עדיין מתקבל.
- **בלוק `text` עם `citations` לא ריק בהודעת `user`**, כולל בתוך בלוק `search_result`. ציטוטים בהודעות `assistant` וההגדרה `"citations": {"enabled": true}` ממשיכים לעבוד.

## מה משתנה ב-SDK

הפרמטרים שהוסרו ושמות השדות הישנים נעלמו גם מהטיפוסים של ה-SDK, אז ה-type checker מוצא את רוב המקומות. השאר:

- **מפתח ה-API נשלח ב-`Authorization: Bearer`** במקום ב-`X-Api-Key`. ה-API מקבל את שניהם, אבל proxy, ‏gateway, פילטר לוגים או test stub שקוראים את `X-Api-Key` צריכים להשתנות.
- **ל-client יש credential אחד.** ב-Python, העברה של `api_key` וגם `auth_token` זורקת עכשיו `ValueError`.
- **`MessageParam` הוא union** של `UserMessageParam`, ‏`AssistantMessageParam` ו-`SystemMessageParam`. הודעה שכתובה כ-dict לא צריכה שינוי. קריאה ל-`MessageParam(role=..., content=...)` זורקת `TypeError`.
- **Text Completions הוסר** מה-SDK של TypeScript, ‏Go, ‏Java ו-Ruby ומה-CLI. עוברים ל-Messages API.
- **ה-CLI כבר לא מקבל `--api-key` ו-`--auth-token`**, כי ערך בשורת הפקודה נשאר בהיסטוריה של ה-shell. משתמשים ב-`ANTHROPIC_API_KEY`, ב-`--api-key-stdin` או ב-`ant auth login`.
- **ב-Go** יש נתיב מודול חדש, `github.com/anthropics/anthropic-sdk-go/v2`, והוא דורש Go 1.25 ומעלה.

ה-Admin API משנה שמות שדות: קבוצות RBAC מחזירות `role_ids` במקום `roles`, חברי קבוצה `rbac_group_id` במקום `group_id`, תפקידים `display_name` במקום `name`, מגבלות קצב `group.type` במקום `group_type`, ומפתחות API ‏`scope.workspace_id` במקום `workspace_id`.

## סדר השדרוג

הסדר במדריך: משדרגים את ה-SDK, מתקנים כל שינוי שובר שנוגע לכם, ובודקים מול `2026-10-21` לפני שמשחררים. ב-TypeScript מעבירים באותו שדרוג גם את `@anthropic-ai/bedrock-sdk`, ‏`vertex-sdk`, ‏`foundry-sdk`, ‏`aws-sdk` ו-`google-cloud-sdk` ל-v1, אחרת מנהל החבילות מתקין להם עותק שני וישן של `@anthropic-ai/sdk`.

```bash
pip install --upgrade "anthropic>=2"
npm install @anthropic-ai/sdk@^1
```

הגרסה החדשה זמינה ב-Claude API, ב-Claude Platform on AWS, ב-Microsoft Foundry וב-Google Cloud. ב-Amazon Bedrock היא עובדת רק עם Claude 4.7 והמודלים שאחריו. קריאות למודלים ישנים יותר שם נשארות על גרסת ה-SDK שאתם משתמשים בה היום.
