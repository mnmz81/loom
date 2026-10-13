---
title: "Fine-tuning: מתי זה עוזר ואיך LoRA עובד"
summary: "מתי fine-tuning עדיף על prompting ו-RAG ומתי לא, איך נראים נתוני האימון, איך LoRA ו-QLoRA מאמנים מודל בזול, ואיך בודקים את התוצאה."
date: 2026-10-13
tags: [ai, fine-tuning, tutorial]
series: { key: ai-tuning, order: 1 }
---

**Fine-tuning** פירושו להמשיך לאמן מודל על הדוגמאות שלכם, כך שהמשקלות שלו משתנים. זו הדרך החזקה ביותר להתאים מודל, והיקרה ביותר לעשות נכון. הפוסט הזה מסביר מתי זה שווה את זה, ואיך LoRA הופך את זה לזול מספיק כדי לנסות.

חישובי ה-LoRA הורצו עם Python 3.9 והפלט שלהם אמיתי. קוד ה-PEFT מבוסס על [ה-quicktour של Hugging Face PEFT](https://huggingface.co/docs/peft/quicktour), ושורת הפלט שלו מצוטטת משם. Fine-tuning דורש מודל שאפשר לאמן את המשקלות שלו: מודל עם משקלות פתוחים, או מודל מתארח שהספק שלו מציע fine-tuning.

## קודם לנסות את האפשרויות הזולות

מדריכים מהשטח מסכימים על סדר: **קודם prompting, אחר כך RAG, ו-fine-tuning אחרון**. הסיבה היא מה כל שיטה משנה:

- **Prompting** משנה את ההוראות. מיידי לנסות, קל לשנות.
- **RAG** משנה את מה שהמודל יכול לקרוא. משתמשים בו כשחסר למודל **ידע**, במיוחד ידע שמשתנה. הכנסת עובדות למשקלות דרך fine-tuning פירושה לאמן מחדש בכל פעם שהן משתנות, והמודל עדיין יכול לבלבל ביניהן.
- **Fine-tuning** משנה את **ההתנהגות** של המודל: פורמט פלט קשיח, הסגנון והמינוח של תחום, משימה צרה שמבוצעת באותה צורה בכל פעם.

Fine-tuning נוטה להשתלם כשהמודל מבין את המשימה אבל לא מבצע אותה כמו שאתם צריכים, גם עם prompt טוב; כשצריך מודל קטן, זול ומהיר שיעשה עבודה אחת היטב; או כשהנתונים חייבים להישאר על החומרה שלכם. הוא נוטה לא להשתלם עם כמה עשרות דוגמאות בלבד, עם עובדות שמשתנות, או בלי דרך למדוד את התוצאה.

## איך נראים נתוני האימון

נתונים ל-fine-tuning מפוקח הם אוסף של שיחות לדוגמה: הקלט, והפלט המדויק שאתם רוצים. בדרך כלל שומרים אותם כ-JSONL, דוגמה אחת בכל שורה:

```json
{"messages": [{"role": "system", "content": "Classify the ticket. Answer with one label."}, {"role": "user", "content": "I was charged twice this month"}, {"role": "assistant", "content": "billing"}]}
{"messages": [{"role": "system", "content": "Classify the ticket. Answer with one label."}, {"role": "user", "content": "The app crashes when I upload a photo"}, {"role": "assistant", "content": "bug"}]}
```

איכות הנתונים קובעת את רוב התוצאה. מדריכים מהשטח מזהירים שמאגר קטן ומרושל מייצר מודל שטועה בביטחון בתחום שלכם. שאפו למאות עד אלפי דוגמאות נקיות ומגוונות שנראות כמו התעבורה האמיתית, ושמרו חלק בצד לבדיקה.

## LoRA: לאמן תוספת קטנה

Fine-tuning מלא מעדכן כל משקל במודל, וזה דורש כמעט כמו אימון המודל מלכתחילה בזיכרון GPU. **LoRA** (low-rank adaptation) מקפיא את המודל ומאמן במקום זה תוספת קטנה. למטריצת משקלות W, הוא לומד שתי מטריצות דקות A ו-B, והשכבה משתמשת ב-W + B·A. עם דרגה (`r`) קטנה, ב-A וב-B יש הרבה פחות מספרים מאשר ב-W.

החשבון ל-LoRA על שכבות ה-`q_proj` של Llama-3.2-1B (גודל נסתר 2048, 16 שכבות) עם `r=8`:

```python
# Llama-3.2-1B: גודל נסתר 2048, 16 שכבות; LoRA על q_proj (2048 x 2048) עם r=8
d_in, d_out, layers, r = 2048, 2048, 16, 8

full = d_in * d_out * layers            # המשקלות של כל מטריצות q_proj
lora = r * (d_in + d_out) * layers      # A (r x d_in) + B (d_out x r) בכל שכבה

print(f"q_proj weights: {full:,}")
print(f"LoRA weights:   {lora:,}  ({lora / full:.2%} of q_proj)")
```

```text
q_proj weights: 67,108,864
LoRA weights:   524,288  (0.78% of q_proj)
```

התוספת המאומנת (ה-**adapter**) קטנה מספיק כדי לשמור ולהחליף אותה: התיעוד של PEFT מזכיר adapter של כ-6 MB לצד מודל של כ-700 MB. מודל בסיס אחד יכול לשרת כמה adapters, אחד לכל משימה.

## LoRA עם Hugging Face PEFT

ספריית PEFT עוטפת מודל ב-LoRA בכמה שורות:

```python
from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-1B")
peft_config = LoraConfig(target_modules=["q_proj"], task_type=TaskType.CAUSAL_LM,
                         r=8, lora_alpha=32, lora_dropout=0.1)

peft_model = get_peft_model(model, peft_config)
peft_model.print_trainable_parameters()
```

```text
trainable params: 524,288 || all params: 1,236,338,688 || trainable%: 0.0424
```

ה-524,288 תואם לחשבון שלמעלה. מכאן מאמנים עם כל לולאת אימון רגילה (התיעוד משתמש ב-`Trainer` של Transformers), ושומרים רק את ה-adapter עם `peft_model.save_pretrained("output_dir")`.

## QLoRA: כשהזיכרון הוא המגבלה

**QLoRA** ([Dettmers et al., 2023](https://arxiv.org/abs/2305.14314)) טוען את מודל הבסיס הקפוא בדיוק של 4 ביט ומאמן מעליו adapters של LoRA. במאמר עשו fine-tuning למודל של 65 מיליארד פרמטרים על GPU אחד של 48 GB. הפוסט על מודלים מקומיים מסביר קוונטיזציה. בקצרה: משקלות של 4 ביט תופסים רבע מהזיכרון של משקלות 16 ביט, עם ירידה קטנה באיכות. בחרו ב-QLoRA כשזיכרון ה-GPU, ולא הזמן, הוא מה שעוצר אתכם.

## לבדוק את התוצאה

מודל אחרי fine-tuning חייב להיות מושווה, על אותו סט בדיקה, לאפשרויות הזולות: מודל הבסיס עם prompt טוב, ומודל הבסיס עם RAG. בודקים שני דברים:

- **משימת היעד השתפרה**, כשמודדים על דוגמאות שהמודל לא התאמן עליהן.
- **שום דבר אחר לא נשבר.** Fine-tuning על משימה צרה יכול לפגוע ביכולת של מודל לבצע הוראות כלליות שהוא ביצע קודם.

אם prompt כתוב היטב מגיע לאותו ציון, תשאירו את ה-prompt. מודלי בסיס ממשיכים להשתפר, ו-fine-tune הוא משהו שצריך לאמן מחדש ולתחזק. הפוסט על evals בסדרת הייצור מראה איך בונים את סט הבדיקה.

הפוסט הבא עוסק ב-distillation: לאמן מודל קטן לחקות מודל גדול.
