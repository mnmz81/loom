---
title: "Kubernetes: אחסון, namespaces, דיבאג ו-Helm"
summary: "volumes קבועים ו-StatefulSets, ‏namespaces ו-contexts של kubectl, שגרת דיבאג עם הסטטוסים הנפוצים של Pod, ‏Kustomize ו-Helm, ורשימת בדיקה ל-production."
date: 2026-10-13
tags: [kubernetes, containers]
series: { key: devops, order: 53 }
---

החלק האחרון בסדרת Kubernetes: מה שצריך כש-`hello-app` כבר רץ עם [עדכונים, הגדרות ובדיקות בריאות](he/posts/kubernetes-zero-to-hero-rollouts-config/), ומתחילים לשמור נתונים, להריץ כמה סביבות ולתקן דברים שנשברים.

## נתונים: volumes ו-StatefulSets

מערכת הקבצים של קונטיינר נעלמת יחד איתו, בדיוק כמו ב-Docker. לנתונים שחייבים לשרוד, מבקשים אחסון עם **PersistentVolumeClaim** ‏(PVC):

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

**StorageClass** ברירת המחדל של הקלאסטר מקצה את הדיסק בפועל (דיסק בענן ב-EKS/GKE/AKS, תיקייה מקומית ב-kind). אחר כך Pod מחבר את ה-claim תחת `volumes` ו-`volumeMounts`.

לבסיסי נתונים ולאפליקציות אחרות שבהן כל עותק צריך זהות משלו ודיסק משלו, משתמשים ב-**StatefulSet** במקום ב-Deployment. זה נושא גדול: הרבה צוותים מריצים את בסיס הנתונים כשירות ענן מנוהל (כמו Amazon RDS) ומשאירים ב-Kubernetes רק אפליקציות בלי מצב.

## Namespaces ו-contexts

**namespace** הוא תיקייה לאובייקטים בתוך קלאסטר אחד: אחד לכל צוות, אפליקציה או סביבה. שמות צריכים להיות ייחודיים בתוך namespace, לא בכל הקלאסטר.

```bash
kubectl get namespaces
kubectl create namespace staging
kubectl apply -f k8s/ -n staging
kubectl get pods -n staging
kubectl get all -n staging             # every object type
kubectl get pods -A                    # all namespaces
```

מתחילים ב-`default`. רכיבי המערכת יושבים ב-`kube-system`, אז לא פורסים לשם אפליקציות.

כשיש יותר מקלאסטר אחד, `kubectl` בוחר קלאסטר לפי **context**, שנשמר ב-`~/.kube/config`:

```bash
kubectl config get-contexts
kubectl config current-context
kubectl config use-context kind-kind
```

בודקים את ה-context הנוכחי לפני כל פקודה שמוחקת משהו. להריץ `kubectl delete` מול production כשהתכוונתם ללפטופ זו קלאסיקה.

## ארגז הכלים לדיבאג

הולכים מבחוץ פנימה:

```bash
kubectl get pods -o wide                     # status, restarts, which node
kubectl describe pod <name>                  # details and, at the bottom, Events
kubectl logs <name>                          # the container's output (-f to follow)
kubectl logs <name> --previous               # output from the crash before the restart
kubectl exec -it <name> -- sh                # a shell inside the container
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl get endpointslices -l kubernetes.io/service-name=hello   # which Pods a Service sends to
```

החלק של **Events** בסוף `kubectl describe` מסביר את רוב הבעיות במילים פשוטות. הסטטוסים שתראו הכי הרבה:

| סטטוס | בדרך כלל אומר |
|---|---|
| `Pending` | לאף node אין מספיק CPU או זיכרון פנויים בשביל ה-requests, או שאי אפשר לחבר volume. |
| `ImagePullBackOff` / `ErrImagePull` | שם או תגית שגויים של אימג', ‏registry פרטי בלי הרשאות, או (ב-kind) אימג' ששכחתם לטעון עם `kind load`. |
| `CrashLoopBackOff` | הקונטיינר עולה ויוצא שוב ושוב. קוראים את `logs --previous`. |
| `OOMKilled` | הקונטיינר עבר את מגבלת הזיכרון שלו. |
| רץ אבל `0/1` מוכן | בדיקת ה-readiness נכשלת: נתיב או פורט שגויים, או שהאפליקציה עדיין עולה. |

אם Service לא מחזיר כלום, משווים את ה-`selector` שלו ל-labels של ה-Pods, ואת ה-`targetPort` לפורט שהאפליקציה מאזינה עליו. שגיאת הקלדה ב-label היא הסיבה הנפוצה ביותר.

## מעבר ל-kubectl apply: ‏Helm ו-Kustomize

אפליקציות אמיתיות צריכות את אותם מניפסטים עם הבדלים קטנים בין סביבות. שני כלים מטפלים בזה:

- **Kustomize** מובנה ב-`kubectl`. שומרים סט בסיס של מניפסטים ושכבות קטנות לכל סביבה (`staging`, `production`) שמשנות אותם. מריצים עם `kubectl apply -k <folder>`.
- **Helm** הוא מנהל חבילות ל-Kubernetes. ‏**chart** הוא סט מניפסטים עם תבניות וקובץ הגדרות `values.yaml`. רוב התוכנות של צד שלישי (בסיסי נתונים, ניטור, בקרים) מגיעות כ-chart:

```bash
helm install my-release <chart> -f my-values.yaml
helm upgrade my-release <chart> -f my-values.yaml
helm list
helm uninstall my-release
```

בצוותים, הצעד האחרון הוא בדרך כלל **GitOps**: כלי כמו Argo CD או Flux עוקב אחרי ריפוזיטורי ה-Git ומחיל את השינויים על הקלאסטר בעצמו, כך שמה שב-Git הוא תמיד מה שרץ.

## הרצה ב-production

- **משתמשים בקלאסטר מנוהל** ‏(EKS, ‏GKE, ‏AKS), אלא אם להריץ Kubernetes זו העבודה שלכם.
- **לפחות שני עותקים** של כל דבר שמשרת תעבורה, עם בדיקות readiness.
- **requests על כל קונטיינר**, ומגבלת זיכרון.
- **גרסאות אימג' נעוצות,** אף פעם לא `latest`.
- **בלי סודות ב-Git או באימג'ים:** מאגר סודות חיצוני, או לפחות הצפנה במנוחה ו-RBAC הדוק.
- **הרשאות מינימליות:** תפקידי RBAC לכל צוות, ‏NetworkPolicies, קונטיינרים שלא רצים כ-root.
- **מניפסטים ב-Git**, שמוחלים על ידי pipeline או כלי GitOps, לא מהלפטופ של מישהו.
- **לוגים לפלט הסטנדרטי**, שהקלאסטר אוסף.
- **נשארים על גרסאות נתמכות.** שלוש גרסאות minor בשנה, וכל אחת נתמכת בערך שנה. מתכננים שדרוגים.

## לאן ממשיכים

מעלים פרויקט משלכם ל-kind, שוברים בכוונה בדיקת בריאות, ומתקנים אותה עם `describe` ו-`logs`.

‏[Kubernetes Basics](https://kubernetes.io/docs/tutorials/kubernetes-basics/) ו[פרק המושגים](https://kubernetes.io/docs/concepts/) הם הקריאה הבאה הטובה ביותר. כדי לבנות ולדחוף את האימג' בכל מיזוג, ראו [GitHub Actions מאפס לגיבור](he/posts/github-actions-zero-to-hero/); ‏[AWS מאפס לגיבור](he/posts/aws-zero-to-hero/) מראה איפה EKS משתלב; ובתוך קונטיינר, ב[דף העזר לפקודות Linux](he/posts/linux-commands/) יש את מה שתקלידו.
