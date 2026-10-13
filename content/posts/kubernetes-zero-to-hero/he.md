---
title: "Kubernetes מאפס לגיבור"
summary: "מדריך מעשי ל-Kubernetes עם דיאגרמות: קלאסטרים ומצב רצוי, Pods, ‏Deployments, ‏Services, ‏Gateway ו-Ingress, עדכונים מתגלגלים, הגדרות ו-Secrets, בדיקות בריאות, סקיילינג, דיבאג ו-Helm."
date: 2026-10-13
tags: [kubernetes, containers]
series: { key: devops, order: 5 }
---

Docker עונה על השאלה "איך מריצים את האפליקציה בקונטיינר?". השאלה הבאה מגיעה מהר: איך מריצים עשרה עותקים שלה על כמה שרתים, מפעילים מחדש את אלה שקורסים, מעדכנים אותם בלי זמן השבתה, ושולחים תעבורה רק לאלה שתקינים? זה התפקיד של **Kubernetes** (שנכתב הרבה פעמים **K8s**: ‏K, שמונה אותיות, s).

המדריך הזה ממשיך מהנקודה שבה [Docker מאפס לגיבור](he/posts/docker-zero-to-hero/) נעצר. לוקחים את אותו אימג' קטן, `hello-app`, ומריצים אותו על קלאסטר Kubernetes מקומי, ומוסיפים רעיון אחד בכל פעם: Pods, ‏Deployments, ‏Services, עדכונים, הגדרות, בדיקות בריאות וסקיילינג.

כל פקודה וכל שדה נבדקו מול [התיעוד הרשמי של Kubernetes](https://kubernetes.io/docs/home/) (גרסה v1.37 בזמן הכתיבה). פלט שכולל שמות שנוצרו אוטומטית, כתובות IP או זמנים ייראה קצת אחרת אצלכם.

## מה זה Kubernetes

Kubernetes הוא **מתזמר קונטיינרים** (container orchestrator): תוכנה שמריצה קונטיינרים על קבוצת מכונות ושומרת שהם ימשיכו לרוץ. אומרים לו *מה* רוצים ("שלושה עותקים של האימג' הזה, נגישים בפורט 80"), והוא מחליט *איפה* ו*איך*, וממשיך לתקן כשהמציאות סוטה מזה.

הוא קוד פתוח, התחיל ב-Google, והיום מתוחזק על ידי Cloud Native Computing Foundation. כל ענן גדול מציע אותו כשירות מנוהל: Amazon EKS, ‏Google GKE ו-Azure AKS.

צריך אותו? לא תמיד. אפליקציה אחת על שרת אחד מסתדרת מצוין עם Docker Compose. ‏Kubernetes מתחיל להשתלם כשיש כמה שירותים, יותר ממכונה אחת, וצורך בפריסות בלי השבתה ובריפוי עצמי. עקומת הלמידה שלו אמיתית, והמדריך הזה כאן כדי לשטח אותה.

### מצב רצוי: הרעיון האחד שצריך לזכור

כמעט הכול ב-Kubernetes עובד לפי אותה תבנית. כותבים את **המצב הרצוי** (desired state) ומוסרים אותו לקלאסטר. **בקרים** (controllers) רצים בלולאה, משווים את המצב הרצוי ל**מצב בפועל**, ופועלים כדי לסגור את הפער.

![מצהירים על replicas: 3 עם kubectl apply, ושרת ה-API שומר את זה כמצב הרצוי. בקר משווה אותו כל הזמן למצב בפועל. כשרק שני Pods רצים, הבקר פועל ומפעיל עוד אחד, עד שהמצב בפועל תואם לרצוי.](/images/kubernetes-zero-to-hero/desired-state.svg)

אם Pod קורס, או ששרת שלם נופל, אף אחד לא צריך להריץ פקודה. הבקר רואה שניים רצים כשרוצים שלושה, ומפעיל שלישי. בגלל זה עבודה עם Kubernetes היא בעיקר *עריכת קבצים שמתארים את התוצאה*, ולא הקלדת פקודות שמבצעות צעדים.

## החלקים של קלאסטר

**קלאסטר** הוא קבוצת מכונות שנקראות **nodes** (צמתים). ‏**ה-control plane** הוא המוח. ‏**ה-worker nodes** מריצים את הקונטיינרים שלכם.

![kubectl במחשב שלכם מדבר עם שרת ה-API ב-control plane. ב-control plane נמצאים שרת ה-API, ‏etcd, ה-scheduler והבקרים. כל אחד משני ה-worker nodes מריץ kubelet, ‏kube-proxy וסביבת ריצה לקונטיינרים, ואת ה-Pods.](/images/kubernetes-zero-to-hero/cluster-architecture.svg)

‏[עמוד הרכיבים](https://kubernetes.io/docs/concepts/overview/components/) מפרט אותם:

- **kube-apiserver:** דלת הכניסה. כל כלי, כולל `kubectl`, מדבר עם הקלאסטר דרך ה-HTTP API שלו.
- **etcd:** מאגר key-value שמחזיק את כל המידע של הקלאסטר, כולל המצב הרצוי.
- **kube-scheduler:** בוחר node לכל Pod חדש שעוד אין לו.
- **kube-controller-manager:** מריץ את הבקרים שמממשים את לולאת התיקון.
- **kubelet:** סוכן על כל node שמוודא שה-Pods שהוקצו לו רצים.
- **kube-proxy** (אופציונלי): מתחזק חוקי רשת על כל node כדי ש-Services יעבדו.
- **סביבת ריצה לקונטיינרים (container runtime):** התוכנה שבאמת מריצה קונטיינרים, כמו containerd.

כמעט אף פעם לא נוגעים באף אחד מהם ישירות. בשירות מנוהל, הענן מריץ בשבילכם את כל ה-control plane.

## הקמת קלאסטר מקומי

צריך שני כלים: `kubectl`, כלי שורת הפקודה, ודרך להריץ קלאסטר על הלפטופ. המדריך משתמש ב-**kind** ‏("Kubernetes in Docker"), שמריץ כל node כקונטיינר של Docker. חלופות כמו minikube עובדות גם הן.

ב-macOS עם Homebrew (ל[מערכות אחרות ראו את תיעוד ההתקנה של kubectl](https://kubernetes.io/docs/tasks/tools/)):

```bash
brew install kubectl kind
kubectl version --client
kind version
```

kind צריך Docker שרץ (Docker Desktop או דומה). יוצרים קלאסטר:

```bash
kind create cluster
kubectl cluster-info
kubectl get nodes
```

```text
NAME                 STATUS   ROLES           AGE   VERSION
kind-control-plane   Ready    control-plane   45s   v1.xx.x
```

‏[המדריך המהיר של kind](https://kind.sigs.k8s.io/docs/user/quick-start/) מסביר את ברירות המחדל: שם הקלאסטר הוא `kind`, ו-kind מוסיף **context** של `kubectl` בשם `kind-kind` ועובר אליו. ‏context הוא הגדרה שמורה של "איזה קלאסטר, ובתור איזה משתמש", ונגיע אליו בהמשך המדריך.

שומרים על `kubectl` בטווח של גרסת minor אחת מהקלאסטר. התיעוד מזהיר שפער גדול יותר עלול להפתיע.

## ה-Pod הראשון

**Pod** הוא הדבר הקטן ביותר ש-Kubernetes מריץ: קונטיינר אחד (לפעמים כמה שעובדים יחד מקרוב) עם כתובת IP משלו. מפעילים אחד מהאימג' הרשמי של nginx:

```bash
kubectl run web --image=nginx:1.29
kubectl get pods
kubectl logs web
kubectl delete pod web
```

```text
NAME   READY   STATUS    RESTARTS   AGE
web    1/1     Running   0          12s
```

‏`kubectl get pods` מציג `ContainerCreating` בזמן שהאימג' יורד, ואחר כך `Running`.

ועכשיו החלק החשוב: כמעט אף פעם לא יוצרים Pods ככה. על Pod בודד אף אחד לא שומר. אם הוא מת או שה-node שלו נופל, הוא נעלם. במקום זה יוצרים **Deployment**, שיוצר ומחליף Pods בשבילכם.

## מניפסטים: תיאור אובייקטים ב-YAML

כל דבר ב-Kubernetes הוא **אובייקט** עם סוג (`kind`), ומתארים אובייקטים בקובצי YAML שנקראים **מניפסטים** (manifests). לכל מניפסט יש אותם ארבעה שדות עליונים:

```yaml
apiVersion: v1         # which version of the API this kind lives in
kind: Pod              # what type of object
metadata:
  name: web            # the name, plus optional labels
  labels:
    app: web
spec:                  # the desired state, different for every kind
  containers:
    - name: web
      image: nginx:1.29
```

‏`kubectl apply -f file.yaml` שולח מניפסט לקלאסטר. אם האובייקט לא קיים, הוא נוצר. אם הוא קיים, הוא מתעדכן כדי להתאים. לכן בטוח להריץ את `apply` שוב ושוב, ואפשר לשמור את הקבצים ב-Git כמקור האמת.

שני הרגלים עוזרים בכתיבת מניפסטים:

```bash
kubectl explain deployment.spec.replicas   # docs for any field, from the cluster itself
kubectl diff -f k8s/                        # what would change, before you apply
```

**Labels** (תוויות) הם זוגות ה-key-value שתחת `metadata.labels`. הם נראים כמו קישוט, אבל ככה אובייקטים מוצאים זה את זה: ‏Deployment מוצא את ה-Pods שלו לפי label, וגם Service.

## Deployments: שומרים על N עותקים רצים

קודם האימג'. במדריך של Docker בניתם את `hello-app`, שרת Node קטן על פורט 3000. בונים אותו עם תגית גרסה אמיתית וטוענים אותו לקלאסטר של kind (אחרת ה-nodes של kind לא רואים את האימג'ים המקומיים שלכם):

```bash
docker build -t hello-app:1.0 .
kind load docker-image hello-app:1.0
```

למה `1.0` ולא `latest`? ‏Kubernetes תמיד מנסה למשוך מ-registry אימג' עם התגית `:latest`, והאימג' שלנו קיים רק מקומית. התיעוד של kind ממליץ להימנע מ-`:latest` בדיוק מהסיבה הזו. זה גם הרגל טוב בכל מקרה: תגית גרסה אומרת בדיוק מה רץ.

עכשיו יוצרים תיקייה `k8s/` וקובץ `k8s/deployment.yaml`:

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

קוראים את זה כמו משפט: *תשמור על 3 עותקים של Pods עם התווית `app: hello`, והנה התבנית ליצירת אחד: קונטיינר מ-`hello-app:1.0` שמאזין על 3000.* ה-`selector` חייב להתאים ל-labels שב-`template`, אחרת ה-API דוחה אותו.

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

Pod חדש עם שם חדש כבר עולה. ביקשתם שלושה, אז יש שלושה.

סקיילינג הוא שדה אחד. משנים בקובץ את `replicas: 3` ל-`5` ומריצים `apply` שוב, או לבדיקה מהירה:

```bash
kubectl scale deployment/hello --replicas=5
```

עדיף לערוך את הקובץ. אם משנים בפקודה ואחר כך מריצים `apply` על הקובץ, הקובץ מנצח וחוזרים ל-3.

## Services: כתובת קבועה ל-Pods

‏Pods הם חד-פעמיים. כל אחד חדש מקבל IP חדש, ולכן שום דבר לא אמור לדבר ישירות עם IP של Pod. ‏**Service** נותן לקבוצת Pods שם ו-IP קבועים, ומפזר תעבורה בין ה-Pods שתואמים ל-selector שלו ברגע זה.

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

השם `hello` עובד כי לקלאסטר יש DNS משלו. באותו namespace מספיק שם ה-Service. מ-namespace אחר משתמשים ב-`hello.<namespace>`, או בשם המלא `hello.<namespace>.svc.cluster.local`.

כדי להגיע אליו מהדפדפן שלכם בזמן פיתוח, מעבירים פורט מקומי:

```bash
kubectl port-forward service/hello 8080:80
# in another terminal:
curl localhost:8080
```

### סוגי Service

בלי `type`, ‏Service הוא **ClusterIP**: נגיש רק מתוך הקלאסטר. ‏[התיעוד של Services](https://kubernetes.io/docs/concepts/services-networking/service/) מפרט את השאר:

| סוג | מה הוא עושה |
|---|---|
| `ClusterIP` | ברירת המחדל. ‏IP ושם DNS קבועים, רק בתוך הקלאסטר. |
| `NodePort` | פותח גם פורט אחד על כל node, מהטווח 30000-32767 כברירת מחדל. |
| `LoadBalancer` | מבקש גם מספק הענן load balancer חיצוני. |
| `ExternalName` | כינוי DNS ‏(CNAME) לשם מחוץ לקלאסטר. בלי שום proxy. |

![משתמש מהאינטרנט מגיע ל-Gateway או ל-Ingress, שמנתב לפי host ונתיב ל-Service מסוג ClusterIP, שמפזר בקשות בין שלושה Pods. למטה: ‏ClusterIP פנימי בלבד, ‏NodePort פותח גם פורט על כל node, ‏LoadBalancer מבקש גם מהענן load balancer חיצוני.](/images/kubernetes-zero-to-hero/traffic-in.svg)

בקלאסטר בענן, `type: LoadBalancer` נותן כתובת IP ציבורית ל-Service אחד. כשיש הרבה שירותים לא רוצים load balancer לכל אחד, ובשביל זה יש את הסעיף הבא.

## הכנסת תעבורה מבחוץ: Gateway ו-Ingress

כדי לנתב הרבה שמות host ונתיבים להרבה Services דרך נקודת כניסה אחת, ל-Kubernetes יש שני APIs:

- **Ingress**, הישן. ‏[עמוד ה-Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) אומר היום במפורש: "פרויקט Kubernetes ממליץ להשתמש ב-Gateway במקום ב-Ingress. ה-API של Ingress הוקפא". הוא עדיין עובד ולא יוסר, אבל לא מקבל יכולות חדשות.
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

אף אחד משני ה-APIs לא עושה כלום לבד. צריך **בקר** שמממש אותו, מותקן בקלאסטר או מסופק על ידי הענן. ‏[האתר של Gateway API](https://gateway-api.sigs.k8s.io/) מפרט את המימושים.

פיסת היסטוריה טרייה שכדאי להכיר: הבקר הפופולרי **ingress-nginx** ‏[הוצא משימוש על ידי פרויקט Kubernetes במרץ 2026](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/). התקנות קיימות ממשיכות לרוץ, אבל לא מקבלות יותר תיקוני אבטחה. אם מדריך כלשהו אומר להתקין אותו, בוחרים בקר שמתוחזק.

## עדכונים מתגלגלים וחזרה לאחור

משנים את הקוד, בונים `hello-app:1.1`, טוענים אותו ל-kind, ומשנים את האימג' ב-`deployment.yaml`:

```bash
docker build -t hello-app:1.1 .
kind load docker-image hello-app:1.1
# edit k8s/deployment.yaml: image: hello-app:1.1
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/hello
```

‏Kubernetes לא עוצר הכול ומתחיל מחדש. הוא מבצע **עדכון מתגלגל** (rolling update): מפעיל Pod חדש, מחכה שיהיה מוכן, מסיר ישן, וחוזר על זה. כברירת מחדל מותר ליצור עד 25% Pods נוספים (`maxSurge`) ועד 25% יכולים להיות לא זמינים (`maxUnavailable`). עם 3 עותקים זה מתעגל ל-Pod חדש אחד בכל פעם, ואף אחד לא חסר.

![עדכון מתגלגל של שלושה Pods מ-v1 ל-v2. ‏Pod של v2 עולה; כשהוא מוכן, Pod אחד של v1 מוסר; וכך שוב עד שכל השלושה מריצים v2. כל Pod חדש חייב לעבור את בדיקת ה-readiness שלו לפני שישן נעלם.](/images/kubernetes-zero-to-hero/rolling-update.svg)

התיעוד מבהיר נקודה אחת: עדכון מתחיל "אם ורק אם תבנית ה-Pod של ה-Deployment (כלומר `.spec.template`) משתנה". שינוי של האימג' או של משתנה סביבה מתחיל עדכון. סקיילינג לא.

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

ואז מעבירים אותם לקונטיינר כמשתני סביבה, בתבנית ה-Pod שב-`deployment.yaml`:

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

‏`envFrom` טוען את כל המפתחות של ה-ConfigMap. ‏`secretKeyRef` בוחר מפתח אחד מה-Secret. (השרת הקטן שלנו קורא רק את `PORT`. הם כאן כדי להראות את החיבור.) אפשר גם לחבר ConfigMaps ו-Secrets כקבצים.

אל תתנו לשם להטעות אתכם. ‏[התיעוד של Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) מזהיר ש-Secrets "נשמרים כברירת מחדל לא מוצפנים במאגר הנתונים של שרת ה-API ‏(etcd)", והערכים ב-YAML רק מקודדים ב-base64, שכל אחד יכול לפענח. התיעוד ממליץ להפעיל הצפנה במנוחה (encryption at rest), להגביל עם RBAC מי יכול לקרוא Secrets, ולשקול מאגר סודות חיצוני. אף פעם לא מעלים ל-Git מניפסט של Secret עם ערכים אמיתיים.

## בדיקות בריאות: probes

‏Kubernetes יודע אם התהליך בקונטיינר רץ. הוא לא יודע אם האפליקציה עובדת. ‏**Probes** אומרים לו. ‏[התיעוד של probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/) מגדיר שלושה:

- **Readiness:** האם הקונטיינר מוכן לקבל תעבורה? אם הבדיקה נכשלת, ה-Pod מוסר מה-endpoints של ה-Service, אבל לא מופעל מחדש.
- **Liveness:** האם הקונטיינר עדיין תקין? אם הבדיקה נכשלת מספיק פעמים, ה-kubelet מפעיל את הקונטיינר מחדש.
- **Startup:** האם אפליקציה איטית סיימה לעלות? בדיקות liveness ו-readiness מחכות עד שהיא מצליחה.

מוסיפים אותם לקונטיינר ב-`deployment.yaml`:

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

‏readiness הוא מה שהופך עדכונים מתגלגלים לבטוחים: Pod חדש מקבל תעבורה רק אחרי שהוא עונה. באפליקציה אמיתית מכוונים את הבדיקות ל-endpoint קל כמו `/healthz`. בדיקת ה-liveness צריכה להיות פשוטה. אם היא תלויה בבסיס הנתונים ובסיס הנתונים מגמגם, Kubernetes מפעיל מחדש את כל ה-Pods בבת אחת.

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

בלי requests, ה-scheduler מנחש, ו-Pod רעב אחד יכול להרעיב את השכנים שלו. מגדירים אותם על הכול.

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

זה שומר על בין 2 ל-10 Pods, ומכוון ל-70% בממוצע מה-CPU *שהתבקש*. בגלל זה ה-HPA צריך ש-requests של CPU יהיו מוגדרים. הוא צריך גם **Metrics Server** מותקן בקלאסטר, ו-kind לא כולל אותו. רוב העננים המנוהלים כן. ראו את [המדריך של HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/). כש-HPA מנהל Deployment, מוחקים את `replicas` מהקובץ של ה-Deployment, אחרת כל `apply` מאפס אותו.

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

לבסיסי נתונים ולאפליקציות אחרות שבהן כל עותק צריך זהות משלו ודיסק משלו, משתמשים ב-**StatefulSet** במקום ב-Deployment. זה נושא גדול. ב-production, הרבה צוותים מריצים את בסיס הנתונים כשירות ענן מנוהל (כמו Amazon RDS) ומשאירים ב-Kubernetes רק את האפליקציות בלי מצב.

## Namespaces ו-contexts

**namespace** הוא תיקייה לאובייקטים בתוך קלאסטר אחד: אחד לכל צוות, אפליקציה או סביבה. שמות צריכים להיות ייחודיים בתוך namespace, לא בכל הקלאסטר.

```bash
kubectl get namespaces
kubectl create namespace staging
kubectl apply -f k8s/ -n staging
kubectl get pods -n staging
kubectl get pods -A                    # all namespaces
```

מתחילים ב-`default`. רכיבי המערכת יושבים ב-`kube-system`, אז לא פורסים לשם אפליקציות.

כשעובדים עם יותר מקלאסטר אחד, `kubectl` בוחר קלאסטר לפי **context**, שנשמר ב-`~/.kube/config`:

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
kubectl logs <name>                          # the container's output
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

- **משתמשים בקלאסטר מנוהל** ‏(EKS, ‏GKE, ‏AKS), אלא אם להריץ Kubernetes זו העבודה שלכם. שדרוג ואבטחה של control plane הם הרבה עבודה.
- **לפחות שני עותקים** של כל דבר שמשרת תעבורה, עם בדיקות readiness.
- **requests על כל קונטיינר**, ומגבלת זיכרון.
- **גרסאות אימג' נעוצות.** אף פעם לא `latest`. תגית גרסה, או digest כשצריך דיוק.
- **בלי סודות ב-Git או באימג'ים.** משתמשים במאגר סודות חיצוני, או לפחות בהצפנה במנוחה וב-RBAC הדוק.
- **הרשאות מינימליות.** תפקידי RBAC לכל צוות, ‏NetworkPolicies שמגבילות אילו Pods מדברים עם אילו, קונטיינרים שלא רצים כ-root.
- **מניפסטים ב-Git**, שמוחלים על ידי pipeline או כלי GitOps, לא מהלפטופ של מישהו.
- **לוגים לפלט הסטנדרטי**, שנאספים על ידי מערכת הלוגים של הקלאסטר, כמו ב-Docker.
- **נשארים על גרסאות נתמכות.** ‏Kubernetes מוציא שלוש גרסאות minor בשנה, וכל אחת נתמכת בערך שנה. מתכננים שדרוגים.

## דף העזר

| אני רוצה... | פקודה |
|---|---|
| ליצור / למחוק קלאסטר מקומי | `kind create cluster` / `kind delete cluster` |
| להחיל את כל המניפסטים בתיקייה | `kubectl apply -f k8s/` |
| לראות מה ישתנה | `kubectl diff -f k8s/` |
| לראות Pods (עם node ו-IP) | `kubectl get pods -o wide` |
| לראות הכול ב-namespace | `kubectl get all -n <ns>` |
| למה ה-Pod הזה תקוע? | `kubectl describe pod <name>` |
| לוגים / מעקב / הקריסה הקודמת | `kubectl logs <pod>` / `-f` / `--previous` |
| shell בתוך קונטיינר | `kubectl exec -it <pod> -- sh` |
| להגיע ל-Service מהלפטופ | `kubectl port-forward svc/<name> 8080:80` |
| סקיילינג | `kubectl scale deployment/<name> --replicas=5` |
| לעקוב אחרי עדכון / לבטל אותו | `kubectl rollout status deployment/<name>` / `kubectl rollout undo deployment/<name>` |
| תיעוד של שדה | `kubectl explain deployment.spec.template` |
| על איזה קלאסטר אני? | `kubectl config current-context` |
| למחוק את מה שתיקייה יצרה | `kubectl delete -f k8s/` |

## מילון מונחים

- **Cluster (קלאסטר):** ‏control plane ועוד ה-worker nodes שהוא מנהל.
- **Node:** מכונה אחת (וירטואלית או פיזית) בקלאסטר.
- **Control plane:** שרת ה-API, ‏etcd, ה-scheduler והבקרים.
- **kubectl:** כלי שורת הפקודה ל-API של Kubernetes.
- **Manifest (מניפסט):** קובץ YAML שמתאר את המצב הרצוי של אובייקט.
- **Pod:** קונטיינר אחד או יותר שחולקים IP; היחידה הקטנה ביותר ש-Kubernetes מריץ.
- **Deployment:** שומר על מספר Pods זהים רצים ומגלגל עדכונים.
- **ReplicaSet:** האובייקט ש-Deployment משתמש בו כדי לשמור על מספר ה-Pods.
- **Service:** שם ו-IP קבועים מול קבוצת Pods שמשתנה.
- **Label / selector:** תגיות key-value, והשאילתות שמתאימות להן.
- **Gateway / HTTPRoute:** ה-API המומלץ לניתוב תעבורה מבחוץ פנימה.
- **Ingress:** ה-API הישן והמוקפא לאותה משימה.
- **ConfigMap / Secret:** הגדרות / הגדרות רגישות, שמועברות לקונטיינרים.
- **Probe:** בדיקת בריאות מסוג readiness, ‏liveness או startup.
- **Requests / limits:** משאבים שמורים / המקסימום המותר.
- **HPA:** משנה את מספר העותקים של Deployment לפי מדדים.
- **PVC / StorageClass:** בקשה לאחסון / האופן שבו הקלאסטר מספק אותו.
- **StatefulSet:** כמו Deployment, ל-Pods שצריכים זהות ואחסון קבועים.
- **Namespace:** תיקייה לאובייקטים בתוך קלאסטר.
- **Context:** הגדרה שמורה של קלאסטר ומשתמש ב-`~/.kube/config`.
- **Helm chart:** סט מניפסטים ארוז עם תבניות.

## לאן ממשיכים

עכשיו יש לכם את כל הלולאה: אימג' מ-Docker, ‏Deployment ששומר על עותקים שלו רצים, ‏Service שנותן להם כתובת אחת, ‏Gateway שמכניס את העולם, ועדכונים, בדיקות בריאות ו-requests ששומרים שהכול יהיה תקין. כדי שזה ייקלט, מעלים פרויקט משלכם ל-kind: כותבים Deployment ו-Service, שוברים בכוונה בדיקת בריאות, ומתקנים אותה עם `describe` ו-`logs`.

‏[המדריך הרשמי Kubernetes Basics](https://kubernetes.io/docs/tutorials/kubernetes-basics/) ו[פרק המושגים](https://kubernetes.io/docs/concepts/) הם הקריאה הבאה הטובה ביותר. כדי לבנות ולדחוף את האימג' אוטומטית בכל מיזוג, ראו [GitHub Actions מאפס לגיבור](he/posts/github-actions-zero-to-hero/). לצד של הענן, ‏[AWS מאפס לגיבור](he/posts/aws-zero-to-hero/) מראה איפה EKS משתלב. וכשאתם בתוך קונטיינר עם `kubectl exec`, ‏[דף העזר לפקודות Linux](he/posts/linux-commands/) מכיל את מה שתקלידו.
