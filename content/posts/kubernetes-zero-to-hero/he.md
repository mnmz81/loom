---
title: "Kubernetes מאפס לגיבור: קלאסטרים, Pods ומניפסטים"
summary: "מה זה Kubernetes והרעיון של מצב רצוי, החלקים של קלאסטר, קלאסטר מקומי עם kind, ה-Pod הראשון, ואיך מניפסטים מתארים אובייקטים ב-YAML."
date: 2026-10-13
updated: 2026-10-19
tags: [kubernetes, containers]
series: { key: devops, order: 19 }
---

Docker עונה על השאלה "איך מריצים את האפליקציה בקונטיינר?". השאלה הבאה מגיעה מהר: איך מריצים עשרה עותקים שלה על כמה שרתים, מפעילים מחדש את אלה שקורסים, מעדכנים אותם בלי זמן השבתה, ושולחים תעבורה רק לאלה שתקינים? זה התפקיד של **Kubernetes** (שנכתב הרבה פעמים **K8s**: ‏K, שמונה אותיות, s).

הסדרה לוקחת את האימג' `hello-app` מ[Docker מאפס לגיבור](he/posts/docker-zero-to-hero-dockerfile/) ומריצה אותו על קלאסטר Kubernetes מקומי. כל פקודה וכל שדה נבדקו מול [התיעוד הרשמי של Kubernetes](https://kubernetes.io/docs/home/) (גרסה v1.37 בזמן הכתיבה). שמות שנוצרו אוטומטית, כתובות IP וזמנים ייראו אחרת אצלכם.

## מה זה Kubernetes

Kubernetes הוא **מתזמר קונטיינרים** (container orchestrator): תוכנה שמריצה קונטיינרים על קבוצת מכונות ודואגת שימשיכו לרוץ. אומרים לו *מה* רוצים ("שלושה עותקים של האימג' הזה, נגישים בפורט 80"), והוא מחליט *איפה* ו*איך*, וממשיך לתקן כשהמציאות סוטה מזה.

הוא קוד פתוח, התחיל ב-Google, ומתוחזק על ידי Cloud Native Computing Foundation. כל ענן גדול מציע אותו כשירות מנוהל: Amazon EKS, ‏Google GKE ו-Azure AKS.

צריך אותו? לאפליקציה אחת על שרת אחד מספיק Docker Compose. ‏Kubernetes משתלם כשיש כמה שירותים, יותר ממכונה אחת, וצורך בפריסות בלי השבתה ובריפוי עצמי.

### מצב רצוי: הרעיון האחד שצריך לזכור

כותבים את **המצב הרצוי** (desired state) ומוסרים אותו לקלאסטר. **בקרים** (controllers) רצים בלולאה, משווים אותו ל**מצב בפועל**, ופועלים כדי לסגור את הפער.

![מצהירים על replicas: 3 עם kubectl apply, ושרת ה-API שומר את זה כמצב הרצוי. בקר משווה אותו כל הזמן למצב בפועל. כשרק שני Pods רצים, הבקר פועל ומפעיל עוד אחד, עד שהמצב בפועל תואם לרצוי.](/images/kubernetes-zero-to-hero/desired-state.svg)

אם Pod קורס, או ששרת שלם נופל, אף אחד לא מריץ פקודה: הבקר מפעיל מחליף. בגלל זה עבודה עם Kubernetes היא בעיקר *עריכת קבצים שמתארים את התוצאה*, ולא הקלדת פקודות שמבצעות צעדים.

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

כמעט לא נוגעים בהם ישירות, ובשירות מנוהל הענן מריץ את ה-control plane בשבילכם.

## הקמת קלאסטר מקומי

צריך את `kubectl`, כלי שורת הפקודה, וקלאסטר מקומי. הסדרה משתמשת ב-**kind** ‏("Kubernetes in Docker"), שמריץ כל node כקונטיינר של Docker. גם minikube עובד.

ב-macOS עם Homebrew (ל[מערכות אחרות ראו את תיעוד ההתקנה של kubectl](https://kubernetes.io/docs/tasks/tools/)):

```bash
brew install kubectl kind
kubectl version --client
kind version
```

kind צריך Docker שרץ (Docker Desktop או דומה). יוצרים קלאסטר (`kind delete cluster` מוחק אותו):

```bash
kind create cluster
kubectl cluster-info
kubectl get nodes
```

```text
NAME                 STATUS   ROLES           AGE   VERSION
kind-control-plane   Ready    control-plane   45s   v1.xx.x
```

כברירת מחדל ([המדריך המהיר של kind](https://kind.sigs.k8s.io/docs/user/quick-start/)) שם הקלאסטר הוא `kind`, ו-kind מוסיף **context** של `kubectl` בשם `kind-kind` ועובר אליו. ‏context הוא הגדרה שמורה של "איזה קלאסטר, ובתור איזה משתמש" ([עוד על contexts](he/posts/kubernetes-zero-to-hero-operations/)).

שומרים על `kubectl` בטווח של גרסת minor אחת מהקלאסטר; פער גדול יותר עלול להפתיע.

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

בזמן שהאימג' יורד, הסטטוס הוא `ContainerCreating`.

כמעט אף פעם לא יוצרים Pods ככה: על Pod בודד אף אחד לא שומר, ואם הוא מת או שה-node שלו נופל, הוא נעלם. ‏**Deployment** יוצר ומחליף Pods בשבילכם; זה ה[חלק הבא](he/posts/kubernetes-zero-to-hero-deployments-services/).

## מניפסטים: תיאור אובייקטים ב-YAML

כל דבר ב-Kubernetes הוא **אובייקט** עם סוג (`kind`), ומתארים אותו בקובצי YAML שנקראים **מניפסטים** (manifests). לכל מניפסט יש אותם ארבעה שדות עליונים:

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

‏`kubectl apply -f file.yaml` שולח מניפסט לקלאסטר: האובייקט נוצר, או מתעדכן כדי להתאים. לכן בטוח לחזור על `apply`, ואפשר לשמור את הקבצים ב-Git כמקור האמת. ‏`kubectl delete -f` מוחק את מה שקובץ או תיקייה יצרו.

שני הרגלים שעוזרים בכתיבת מניפסטים:

```bash
kubectl explain deployment.spec.replicas   # docs for any field, from the cluster itself
kubectl diff -f k8s/                        # what would change, before you apply
```

**Labels** (תוויות) הם זוגות ה-key-value שתחת `metadata.labels`. הם נראים כמו קישוט, אבל ככה אובייקטים מוצאים זה את זה: ‏Deployment מוצא את ה-Pods שלו לפי label, וגם Service.
