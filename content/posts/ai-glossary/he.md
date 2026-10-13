---
title: "מילון מונחי AI: דף העזר שלי"
summary: "המונחים מסדרת ה-AI במקום אחד, לפי נושא, עם הגדרה של שורה וקישור לפוסט שמסביר: טוקנים, RAG, כלים, MCP, סוכנים, LoRA, evals ועוד."
date: 2026-10-13
tags: [ai, llm, cheatsheet]
---

כל מונח מסדרת ה-AI במקום אחד, עם הגדרה של שורה וקישור לפוסט שמסביר אותו. לסדרה חמישה חלקים: [יסודות](he/posts/ai-what-is-llm/), [ידע ו-RAG](he/posts/ai-embeddings/), [כלים וסוכנים](he/posts/ai-tools-function-calling/), [התאמת מודל](he/posts/ai-fine-tuning/) ו[ייצור](he/posts/ai-evals/).

## מודלים וטוקנים

- **LLM** (מודל שפה גדול): מודל שאומן על כמות עצומה של טקסט כדי לנבא את הטוקן הבא. [מה זה LLM](he/posts/ai-what-is-llm/)
- **טוקן**: היחידה שמודל קורא וכותב, בדרך כלל מילה או חלק ממילה. [טוקנים וחלון ההקשר](he/posts/ai-tokens-context-window/)
- **Tokenizer**: מפרק טקסט לטוקנים. שונה בין משפחות מודלים. [טוקנים וחלון ההקשר](he/posts/ai-tokens-context-window/)
- **חלון הקשר** (context window): כל מה שהמודל רואה בבקשה אחת, כולל התשובה שלו. [טוקנים וחלון ההקשר](he/posts/ai-tokens-context-window/)
- **Context rot**: הדיוק והשליפה יורדים ככל שההקשר גדל. [טוקנים וחלון ההקשר](he/posts/ai-tokens-context-window/)
- **Transformer ו-attention**: הארכיטקטורה של LLM. ה-attention מאפשר לכל טוקן להישען על הטוקנים שלפניו. [איך בונים מודל שפה](he/posts/ai-how-models-are-built/)
- **אימון מקדים** (pretraining): אימון על כמות עצומה של טקסט לניבוי הטוקן הבא. יוצר מודל בסיס. [איך בונים מודל שפה](he/posts/ai-how-models-are-built/)
- **SFT, RLHF, DPO**: fine-tuning מפוקח על שיחות לדוגמה, ואחריו אימון לפי העדפות של אנשים או של AI. [איך בונים מודל שפה](he/posts/ai-how-models-are-built/)
- **תאריך ידע** (knowledge cutoff): התאריך שאחריו המודל לא יודע כלום. [איך בונים מודל שפה](he/posts/ai-how-models-are-built/)
- **מודל עם משקלות פתוחים**: מודל שהמשקלות שלו פורסמו, כך שאפשר להריץ אותו בעצמכם. [הרצת מודלים מקומית](he/posts/ai-local-models/)

## יצירה ו-prompting

- **Logits ו-softmax**: ציונים גולמיים לכל טוקן, שהופכים להסתברויות. [Temperature, top-p והזיות](he/posts/ai-parameters-hallucinations/)
- **Temperature, top-p, top-k**: כפתורים שקובעים איך נבחר הטוקן הבא. [Temperature, top-p והזיות](he/posts/ai-parameters-hallucinations/)
- **הזיה** (hallucination): תשובה בטוחה בעצמה ושגויה. [Temperature, top-p והזיות](he/posts/ai-parameters-hallucinations/)
- **System prompt**: הוראות שחלות על כל השיחה. [Prompting](he/posts/ai-prompting/)
- **Few-shot**: כיוון המודל בעזרת כמה דוגמאות ב-prompt. [Prompting](he/posts/ai-prompting/)
- **Prefill**: להתחיל בעצמכם את התשובה של המודל. נדחה במודלי Claude הנוכחיים. [Prompting](he/posts/ai-prompting/)
- **פלט מובנה** (structured outputs): פלט שמוגבל לסכמת JSON. [פלט מובנה ו-streaming](he/posts/ai-structured-outputs-streaming/)
- **Streaming**: קבלת התשובה חלק אחרי חלק בזמן שהיא נכתבת. [פלט מובנה ו-streaming](he/posts/ai-structured-outputs-streaming/)
- **חשיבה / מודל חשיבה**: מודל שעובד על הבעיה לפני שהוא עונה. [מודלי חשיבה](he/posts/ai-reasoning-models/)
- **Effort**: הגדרה שמאזנת בין יסודיות לבין מהירות ועלות. [מודלי חשיבה](he/posts/ai-reasoning-models/)
- **מולטימודלי**: קלט מעבר לטקסט, כמו תמונות ו-PDF. [מולטימודלי](he/posts/ai-multimodal/)
- **stop_reason**: למה המודל עצר: `end_turn`, `max_tokens`, `tool_use`, `refusal` ועוד. [מה זה LLM](he/posts/ai-what-is-llm/)

## ידע ושליפה

- **Embedding**: וקטור שמייצג את המשמעות של טקסט. [Embeddings וחיפוש סמנטי](he/posts/ai-embeddings/)
- **Cosine similarity**: מדד לכמה שני וקטורים מצביעים לאותו כיוון. [Embeddings וחיפוש סמנטי](he/posts/ai-embeddings/)
- **מסד נתונים וקטורי**: שומר וקטורים ומוצא במהירות את הקרובים ביותר. [Embeddings וחיפוש סמנטי](he/posts/ai-embeddings/)
- **RAG** (retrieval-augmented generation): שולפים טקסט רלוונטי ושמים אותו ב-prompt. [RAG](he/posts/ai-rag-pipeline/)
- **Chunking**: פיצול מסמכים לחלקים קטנים לפני האינדוקס. [RAG](he/posts/ai-rag-pipeline/)
- **BM25**: האלגוריתם הקלאסי לדירוג לפי מילות מפתח. [שליפה טובה יותר](he/posts/ai-rag-hybrid-rerank/)
- **חיפוש היברידי ו-RRF**: שילוב חיפוש מילות מפתח עם חיפוש וקטורי, הרבה פעמים עם reciprocal rank fusion. [שליפה טובה יותר](he/posts/ai-rag-hybrid-rerank/)
- **Reranker**: מודל שנותן ציון לשאילתה ולמועמד יחד, כדי לסדר מחדש את התוצאות. [שליפה טובה יותר](he/posts/ai-rag-hybrid-rerank/)
- **Contextual retrieval**: הוספת הקשר קצר לכל chunk לפני האינדוקס. [שליפה טובה יותר](he/posts/ai-rag-hybrid-rerank/)
- **Agentic RAG**: המודל מחפש ככלי, כמה פעמים שהוא צריך. [Agentic RAG ו-GraphRAG](he/posts/ai-agentic-rag-graphrag/)
- **גרף ידע ו-GraphRAG**: עובדות כישויות מקושרות. GraphRAG מסכם קהילות בגרף כדי לענות על שאלות גלובליות. [Agentic RAG ו-GraphRAG](he/posts/ai-agentic-rag-graphrag/)

## כלים וסוכנים

- **כלי / function calling**: המודל מבקש מהקוד שלכם להריץ פונקציה. [Tools ו-function calling](he/posts/ai-tools-function-calling/)
- **tool_use ו-tool_result**: הבקשה של המודל, והתוצאה שהקוד שלכם מחזיר. [Tools ו-function calling](he/posts/ai-tools-function-calling/)
- **MCP** (Model Context Protocol): תקן פתוח לאריזת כלים, משאבים ו-prompts כשרתים. [MCP](he/posts/ai-mcp/)
- **סוכן**: מודל שבוחר את הצעדים שלו בעצמו, עם כלים בלולאה. [סוכנים](he/posts/ai-agents/)
- **Workflow**: צעדים שקבועים בקוד, כשהמודל ממלא כל אחד מהם. [חמישה דפוסי workflow](he/posts/ai-workflow-patterns/)
- **Prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer**: חמשת דפוסי ה-workflow. [חמישה דפוסי workflow](he/posts/ai-workflow-patterns/)
- **Context engineering**: ההחלטה מה נכנס להקשר בכל תור. [זיכרון וניהול הקשר](he/posts/ai-memory-context/)
- **דחיסה** (compaction): החלפת תורות ישנים בסיכום. [זיכרון וניהול הקשר](he/posts/ai-memory-context/)
- **כלי הזיכרון**: קבצים שהמודל קורא וכותב כדי לזכור בין סשנים. [זיכרון וניהול הקשר](he/posts/ai-memory-context/)
- **סוכן משנה / מרובה סוכנים**: סוכן מוביל מאציל עבודה ממוקדת לסוכנים עם הקשר משלהם. [מערכות מרובות סוכנים](he/posts/ai-multi-agent/)
- **Computer use**: מודל שמפעיל שולחן עבודה דרך צילומי מסך, עכבר ומקלדת. [Computer use ו-Agent Skills](he/posts/ai-computer-use-skills/)
- **Agent Skills**: תיקיות של הוראות וסקריפטים שנטענות רק כשצריך. [Computer use ו-Agent Skills](he/posts/ai-computer-use-skills/)
- **WebMCP**: הצעה ל-API של הדפדפן שמאפשר לדף אינטרנט לרשום כלים לסוכנים עם `document.modelContext`. [WebMCP](he/posts/ai-webmcp/)

## התאמת מודלים

- **Fine-tuning**: אימון נוסף על הדוגמאות שלכם, שמשנה את המשקלות. [Fine-tuning](he/posts/ai-fine-tuning/)
- **LoRA ו-adapter**: אימון של תוספת קטנה במקום המודל כולו. [Fine-tuning](he/posts/ai-fine-tuning/)
- **QLoRA**: LoRA מעל מודל בסיס ב-4 ביט. [Fine-tuning](he/posts/ai-fine-tuning/)
- **Distillation**: אימון מודל תלמיד קטן לחקות מודל מורה גדול. [Distillation](he/posts/ai-distillation/)
- **Soft targets**: כל התפלגות ההסתברויות של המורה, שמשמשת לאימון התלמיד. [Distillation](he/posts/ai-distillation/)
- **קוונטיזציה**: שמירת משקלות עם פחות ביטים כדי לחסוך זיכרון. [הרצת מודלים מקומית](he/posts/ai-local-models/)
- **Ollama ו-GGUF**: כלי להרצת מודלים פתוחים מקומית, ופורמט קבצים נפוץ להם. [הרצת מודלים מקומית](he/posts/ai-local-models/)

## ייצור

- **Eval**: מקרי בדיקה ועוד דרך לתת ציון לפלט. [Evals](he/posts/ai-evals/)
- **LLM-as-judge**: מודל שנותן ציון לפלט לפי רובריקה. [Evals](he/posts/ai-evals/)
- **Trace ו-span**: כל הצעדים של בקשה אחת, וכל צעד בתוכה. [Observability](he/posts/ai-observability/)
- **Prompt caching**: שימוש חוזר בקידומת prompt שחוזרת, בזול ובמהירות. [עלות וזמני תגובה](he/posts/ai-cost-latency/)
- **Batch API**: בקשות אסינכרוניות בהנחה. [עלות וזמני תגובה](he/posts/ai-cost-latency/)
- **Prompt injection**: טקסט לא אמין שמנסה להתנהג כמו הוראה, ישירות או בעקיפין. [אבטחה](he/posts/ai-security/)
- **סמכויות עודפות** (excessive agency): למודל יש יותר כלים או הרשאות ממה שהמשימה צריכה. [אבטחה](he/posts/ai-security/)
- **Guardrails**: בדיקות סביב המודל, על הקלט, הפלט והפעולות. [Guardrails](he/posts/ai-guardrails/)
- **Red-teaming**: לתקוף את המערכת של עצמכם בכוונה לפני שתוקפים יעשו את זה. [אבטחה](he/posts/ai-security/)
