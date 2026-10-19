---
title: "Kubernetes: עדכונים מתגלגלים, הגדרות, בדיקות בריאות וסקיילינג אוטומטי"
summary: "מעדכנים את hello-app בלי השבתה וחוזרים אחורה, מעבירים הגדרות עם ConfigMaps ו-Secrets, מוסיפים בדיקות readiness ו-liveness, מגדירים requests ו-limits, ומגדילים עם HPA."
date: 2026-10-13
tags: [kubernetes, containers]
series: { key: devops, order: 21 }
---

החלק הזה ממשיך מה-Deployment וה-Service בשם `hello` שבתיקייה `k8s/`, מ[Deployments, ‏Services והכנסת תעבורה מבחוץ](he/posts/kubernetes-zero-to-hero-deployments-services/). כל שינוי כאן הוא עריכה של `k8s/deployment.yaml` ואחריה `kubectl apply`.

## עדכונים מתגלגלים וחזרה לאחור

משנים את הקוד, בונים `hello-app:1.1`, טוענים אותו ל-kind, ומשנים את האימג' ב-`deployment.yaml`:

```bash
docker build -t hello-app:1.1 .
kind load docker-image hello-app:1.1
# edit k8s/deployment.yaml: image: hello-app:1.1
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/hello
```

‏Kubernetes לא עוצר הכול ומתחיל מחדש. הוא מבצע **עדכון מתגלגל** (rolling update): מפעיל Pod חדש, מחכה שיהיה מוכן, מסיר ישן, וחוזר על זה. כברירת מחדל מותר ליצור עד 25% Pods נוספים (`maxSurge`) ועד 25% יכולים להיות לא זמינים (`maxUnavailable`); עם 3 עותקים זה Pod חדש אחד בכל פעם, ואף אחד לא חסר.

![עדכון מתגלגל של שלושה Pods מ-v1 ל-v2. ‏Pod של v2 עולה; כשהוא מוכן, Pod אחד של v1 מוסר; וכך שוב עד שכל השלושה מריצים v2. כל Pod חדש חייב לעבור את בדיקת ה-readiness שלו לפני שישן נעלם.](/images/kubernetes-zero-to-hero/rolling-update.svg)

עדכון מתחיל רק כשתבנית ה-Pod (`.spec.template`) משתנה, למשל האימג' או משתנה סביבה. סקיילינג לא מתחיל עדכון.

אם הגרסה החדשה גרועה, חוזרים אחורה:

```bash
kubectl rollout history deployment/hello
kubectl rollout undo deployment/hello
kubectl rollout undo deployment/hello --to-revision=1
```

כברירת מחדל Deployment שומר בשביל זה 10 ReplicaSets ישנים (`revisionHistoryLimit`). אחרי undo מתקנים גם את הקובץ, אחרת ה-`apply` הבא מחזיר את הגרסה הגרועה.

## הגדרות: ConfigMaps ו-Secrets

מוציאים הגדרות מהאימג', כדי שאותו אימג' ירוץ בכל סביבה. ‏**ConfigMap** מחזיק הגדרות רגילות, ו-**Secret** מחזיק הגדרות רגישות:

```bash
kubectl create configmap hello-config --from-literal=LOG_LEVEL=info
kubectl create secret generic hello-secret --from-literal=DB_PASSWORD=dev-only
```

מעבירים אותם לקונטיינר כמשתני סביבה, בתבנית ה-Pod:

```yaml
      containers:
        - name: hello
          image: hello-app:1.1
          envFrom:
            - configMapRef:
                name: hello-config
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: hello-secret
                  key: DB_PASSWORD
```

‏`envFrom` טוען את כל המפתחות של ה-ConfigMap. ‏`secretKeyRef` בוחר מפתח אחד מה-Secret. (השרת הקטן שלנו קורא רק את `PORT`; הם כאן כדי להראות את החיבור.) אפשר גם לחבר ConfigMaps ו-Secrets כקבצים.

השם מטעה. ‏[התיעוד של Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) מזהיר ש-Secrets נשמרים כברירת מחדל לא מוצפנים ב-etcd, והערכים ב-YAML רק מקודדים ב-base64, שכל אחד יכול לפענח. מפעילים הצפנה במנוחה (encryption at rest), מגבילים עם RBAC מי קורא Secrets, ושוקלים מאגר סודות חיצוני. אף פעם לא מעלים ל-Git מניפסט של Secret עם ערכים אמיתיים.

## בדיקות בריאות: probes

‏Kubernetes יודע אם התהליך בקונטיינר רץ, לא אם האפליקציה עובדת. ‏**Probes** אומרים לו. ‏[התיעוד של probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/) מגדיר שלושה:

- **Readiness:** האם הקונטיינר מוכן לקבל תעבורה? אם הבדיקה נכשלת, ה-Pod מוסר מה-endpoints של ה-Service, אבל לא מופעל מחדש.
- **Liveness:** האם הקונטיינר עדיין תקין? אם הבדיקה נכשלת מספיק פעמים, ה-kubelet מפעיל את הקונטיינר מחדש.
- **Startup:** האם אפליקציה איטית סיימה לעלות? בדיקות liveness ו-readiness מחכות עד שהיא מצליחה.

מוסיפים אותם לקונטיינר:

```yaml
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            periodSeconds: 10
            failureThreshold: 3
```

‏readiness הופך עדכונים מתגלגלים לבטוחים: Pod חדש מקבל תעבורה רק אחרי שהוא עונה. באפליקציה אמיתית מכוונים את הבדיקות ל-endpoint קל כמו `/healthz`, ומשאירים את ה-liveness פשוט: אם הוא תלוי בבסיס הנתונים ובסיס הנתונים מגמגם, Kubernetes מפעיל מחדש את כל ה-Pods בבת אחת.

## משאבים: requests ו-limits

אומרים ל-Kubernetes כמה CPU וזיכרון כל קונטיינר צריך:

```yaml
          resources:
            requests:
              cpu: 100m
              memory: 64Mi
            limits:
              memory: 128Mi
```

- **Requests** הם מה שה-scheduler שומר. ‏Pod ממוקם רק על node שיש בו כמות פנויה כזו. ‏`100m` הם 100 millicores, עשירית CPU.
- **Limits** הם התקרה. קונטיינר שעובר את מגבלת הזיכרון נהרג (`OOMKilled`) ומופעל מחדש. מעבר למגבלת CPU רק מאט אותו.

בלי requests ה-scheduler מנחש, ו-Pod רעב אחד יכול להרעיב את השכנים שלו, אז מגדירים אותם בכל מקום.

## סקיילינג אוטומטי

**HorizontalPodAutoscaler** ‏(HPA) משנה בשבילכם את `replicas` לפי העומס:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hello
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hello
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

היעד הוא 70% בממוצע מה-CPU *שהתבקש*, ולכן requests של CPU חייבים להיות מוגדרים. ה-HPA צריך גם **Metrics Server**, ש-kind לא כולל ורוב העננים המנוהלים כן ([המדריך של HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)). כש-HPA מנהל Deployment, מוחקים את `replicas` מהקובץ של ה-Deployment, אחרת כל `apply` מאפס אותו.
