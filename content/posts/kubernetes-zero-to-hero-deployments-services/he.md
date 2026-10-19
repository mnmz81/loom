---
title: "Kubernetes: ‏Deployments, ‏Services והכנסת תעבורה מבחוץ"
summary: "מריצים את hello-app כ-Deployment ששומר על שלושה עותקים, נותנים לו כתובת קבועה עם Service, משווים בין סוגי Service, ומנתבים תעבורה מבחוץ עם Gateway API או Ingress."
date: 2026-10-13
tags: [kubernetes, containers]
series: { key: devops, order: 51 }
---

החלק הזה צריך את הקלאסטר של kind ואת יסודות המניפסטים מ[Kubernetes מאפס לגיבור](he/posts/kubernetes-zero-to-hero/), ואת האימג' `hello-app` מ[Docker מאפס לגיבור](he/posts/docker-zero-to-hero/): שרת Node קטן על פורט 3000.

## Deployments: שומרים על N עותקים רצים

בונים את האימג' עם תגית גרסה אמיתית וטוענים אותו לקלאסטר של kind (אחרת ה-nodes של kind לא רואים את האימג'ים המקומיים שלכם):

```bash
docker build -t hello-app:1.0 .
kind load docker-image hello-app:1.0
```

למה `1.0` ולא `latest`? ‏Kubernetes תמיד מנסה למשוך `:latest` מ-registry, והאימג' שלנו קיים רק מקומית. תגית גרסה גם אומרת בדיוק מה רץ.

יוצרים תיקייה `k8s/` וקובץ `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
  labels:
    app: hello
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello
  template:
    metadata:
      labels:
        app: hello
    spec:
      containers:
        - name: hello
          image: hello-app:1.0
          ports:
            - containerPort: 3000
```

קוראים את זה כמו משפט: *תשמור על 3 עותקים של Pods עם התווית `app: hello`, והנה התבנית ליצירת אחד.* ה-`selector` חייב להתאים ל-labels שב-`template`, אחרת ה-API דוחה אותו.

```bash
kubectl apply -f k8s/deployment.yaml
kubectl get deployments
kubectl get pods -l app=hello
```

```text
NAME    READY   UP-TO-DATE   AVAILABLE   AGE
hello   3/3     3            3           20s
```

מאחורי הקלעים ה-Deployment יצר **ReplicaSet**, וה-ReplicaSet יצר את ה-Pods. מנהלים את ה-Deployment, ומשאירים לו את כל השאר.

![Deployment בשם hello מנהל ReplicaSet, ששומר על שלושה Pods עם התווית app: hello. ‏Service בשם hello בוחר את ה-Pods לפי התווית הזו ומפזר ביניהם את התעבורה.](/images/kubernetes-zero-to-hero/deployment-and-service.svg)

עכשיו רואים את לולאת התיקון בפעולה. מוחקים Pod אחד (לוקחים שם מהפלט של `get pods`):

```bash
kubectl delete pod <one-of-the-hello-pods>
kubectl get pods -l app=hello
```

Pod חדש עם שם חדש כבר עולה.

סקיילינג הוא שדה אחד: משנים בקובץ את `replicas: 3` ל-`5` ומריצים `apply` שוב. לבדיקה מהירה:

```bash
kubectl scale deployment/hello --replicas=5
```

עדיף הקובץ: אם משנים בפקודה ואחר כך מריצים עליו `apply`, חוזרים ל-3.

## Services: כתובת קבועה ל-Pods

‏Pods הם חד-פעמיים. כל Pod חדש מקבל IP חדש, ולכן שום דבר לא אמור לדבר ישירות עם IP של Pod. ‏**Service** נותן לקבוצת Pods שם ו-IP קבועים, ומפזר תעבורה בין ה-Pods שתואמים ל-selector שלו ברגע זה.

יוצרים את `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hello
spec:
  selector:
    app: hello
  ports:
    - port: 80
      targetPort: 3000
```

‏`port` הוא מה שלקוחות משתמשים בו. ‏`targetPort` הוא הפורט בקונטיינר שאליו התעבורה הולכת. מריצים `apply` על כל התיקייה, ובודקים מתוך הקלאסטר עם Pod זמני:

```bash
kubectl apply -f k8s/
kubectl get services
kubectl run tmp --rm -it --image=busybox:1.37 --restart=Never -- wget -qO- http://hello
```

```text
Hello from a container
```

השם `hello` עובד כי לקלאסטר יש DNS משלו. באותו namespace מספיק שם ה-Service; מ-namespace אחר משתמשים ב-`hello.<namespace>`.

כדי להגיע אליו מהדפדפן שלכם בזמן פיתוח, מעבירים פורט מקומי:

```bash
kubectl port-forward service/hello 8080:80
# in another terminal:
curl localhost:8080
```

### סוגי Service

בלי `type`, ‏Service הוא **ClusterIP**. ‏[התיעוד של Services](https://kubernetes.io/docs/concepts/services-networking/service/) מפרט את השאר:

| סוג | מה הוא עושה |
|---|---|
| `ClusterIP` | ברירת המחדל. ‏IP ושם DNS קבועים, רק בתוך הקלאסטר. |
| `NodePort` | פותח גם פורט אחד על כל node, מהטווח 30000-32767 כברירת מחדל. |
| `LoadBalancer` | מבקש גם מספק הענן load balancer חיצוני. |
| `ExternalName` | כינוי DNS ‏(CNAME) לשם מחוץ לקלאסטר. בלי שום proxy. |

![משתמש מהאינטרנט מגיע ל-Gateway או ל-Ingress, שמנתב לפי host ונתיב ל-Service מסוג ClusterIP, שמפזר בקשות בין שלושה Pods. למטה: ‏ClusterIP פנימי בלבד, ‏NodePort פותח גם פורט על כל node, ‏LoadBalancer מבקש גם מהענן load balancer חיצוני.](/images/kubernetes-zero-to-hero/traffic-in.svg)

בענן, `type: LoadBalancer` נותן ל-Service אחד כתובת IP ציבורית. עם הרבה שירותים לא רוצים load balancer לכל אחד.

## הכנסת תעבורה מבחוץ: Gateway ו-Ingress

כדי לנתב הרבה שמות host ונתיבים להרבה Services דרך נקודת כניסה אחת, ל-Kubernetes יש שני APIs:

- **Ingress**, הישן. ‏[עמוד ה-Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) ממליץ היום על Gateway במקומו ואומר שה-API של Ingress הוקפא: הוא עדיין עובד, אבל לא מקבל יכולות חדשות.
- **Gateway API**, המחליף המומלץ. מי שמפעיל את הקלאסטר מקים `Gateway` (נקודת הכניסה), וכל צוות מחבר אליו אובייקטים מסוג `HTTPRoute`.

‏`HTTPRoute` ששולח את `hello.example.com` ל-Service שלנו:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: hello
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - hello.example.com
  rules:
    - backendRefs:
        - name: hello
          port: 80
```

אף אחד משני ה-APIs לא עושה כלום לבד: צריך **בקר** שמממש אותו, מותקן בקלאסטר או מסופק על ידי הענן ([המימושים](https://gateway-api.sigs.k8s.io/)).

הבקר הפופולרי **ingress-nginx** ‏[הוצא משימוש במרץ 2026](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/). התקנות קיימות ממשיכות לרוץ אבל בלי תיקוני אבטחה, ולכן אם מדריך אומר להתקין אותו, בוחרים בקר שמתוחזק.
