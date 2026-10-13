---
title: "Kubernetes from zero to hero"
summary: "A hands-on guide to Kubernetes with diagrams: clusters and desired state, Pods, Deployments, Services, Gateway and Ingress, rollouts, config and Secrets, probes, scaling, debugging and Helm."
date: 2026-10-13
tags: [kubernetes, containers]
series: { key: devops, order: 5 }
---

Docker answers "how do I run my app in a container?". The next question comes fast: how do I run ten copies of it across several servers, restart the ones that crash, update them without downtime, and send traffic only to the healthy ones? That's the job of **Kubernetes** (often written **K8s**: K, eight letters, s).

This guide picks up where [Docker from zero to hero](en/posts/docker-zero-to-hero/) left off. We take the same small `hello-app` image and run it on a local Kubernetes cluster, adding one idea at a time: Pods, Deployments, Services, rollouts, configuration, health checks and scaling.

Every command and field was checked against the [official Kubernetes documentation](https://kubernetes.io/docs/home/) (v1.37 at the time of writing). Output that includes generated names, IPs or ages will look a little different on your machine.

## What Kubernetes is

Kubernetes is a **container orchestrator**: software that runs containers across a group of machines and keeps them running. You tell it *what* you want ("three copies of this image, reachable on port 80"), and it figures out *where* and *how*, and keeps fixing things when reality drifts.

It's open source, started at Google, and is now maintained by the Cloud Native Computing Foundation. Every big cloud offers it as a managed service: Amazon EKS, Google GKE and Azure AKS.

Do you need it? Not always. One app on one server is fine with Docker Compose. Kubernetes starts to pay off when you have several services, more than one machine, and a need for zero-downtime deploys and self-healing. It has a real learning curve, and this guide is here to flatten it.

### Desired state: the one idea to remember

Almost everything in Kubernetes follows one pattern. You write down the **desired state** and hand it to the cluster. **Controllers** run in a loop, compare the desired state with the **actual state**, and act to close the gap.

![You declare replicas: 3 with kubectl apply, and the API server stores it as the desired state. A controller keeps comparing it with the actual state. When only two Pods are running, the controller acts and starts one more, until actual matches desired.](/images/kubernetes-zero-to-hero/desired-state.svg)

If a Pod crashes, or a whole server dies, nobody has to run a command. The controller sees two running where three are wanted, and starts a third. This is why Kubernetes work is mostly *editing files that describe the result*, not typing commands that perform steps.

## The parts of a cluster

A **cluster** is a set of machines called **nodes**. The **control plane** is the brain. The **worker nodes** run your containers.

![kubectl on your computer talks to the API server in the control plane. The control plane holds the API server, etcd, the scheduler and the controllers. Each of the two worker nodes runs a kubelet, kube-proxy and a container runtime, plus the Pods.](/images/kubernetes-zero-to-hero/cluster-architecture.svg)

The [components page](https://kubernetes.io/docs/concepts/overview/components/) lists them:

- **kube-apiserver:** the front door. Every tool, including `kubectl`, talks to the cluster through its HTTP API.
- **etcd:** a key-value store that holds all cluster data, the desired state included.
- **kube-scheduler:** picks a node for each new Pod that doesn't have one yet.
- **kube-controller-manager:** runs the controllers that implement the reconcile loop.
- **kubelet:** an agent on every node that makes sure the Pods assigned to it are running.
- **kube-proxy** (optional): maintains network rules on each node so Services work.
- **Container runtime:** the software that actually runs containers, such as containerd.

You will rarely touch any of these directly. On a managed service, the cloud runs the whole control plane for you.

## Set up a local cluster

You need two tools: `kubectl`, the command-line client, and a way to run a cluster on your laptop. This guide uses **kind** ("Kubernetes in Docker"), which runs each node as a Docker container. Alternatives such as minikube work too.

On macOS with Homebrew (see the [kubectl install docs](https://kubernetes.io/docs/tasks/tools/) for other systems):

```bash
brew install kubectl kind
kubectl version --client
kind version
```

kind needs a running Docker (Docker Desktop or similar). Create a cluster:

```bash
kind create cluster
kubectl cluster-info
kubectl get nodes
```

```text
NAME                 STATUS   ROLES           AGE   VERSION
kind-control-plane   Ready    control-plane   45s   v1.xx.x
```

The [kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/) explains the defaults: the cluster is named `kind`, and kind adds a `kubectl` **context** named `kind-kind` and switches to it. A context is a saved "which cluster, as which user" setting, covered later in this guide.

Keep your `kubectl` within one minor version of the cluster. The docs warn that a bigger gap can cause surprises.

## Your first Pod

A **Pod** is the smallest thing Kubernetes runs: one container (sometimes a few that work closely together) with its own IP address. Start one from the official nginx image:

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

`kubectl get pods` shows `ContainerCreating` while the image downloads, then `Running`.

Now the important part: you will almost never create Pods like this. A bare Pod has no one watching it. If it dies or its node fails, it's gone. Instead you create a **Deployment**, which creates and replaces Pods for you.

## Manifests: describing objects in YAML

Everything in Kubernetes is an **object** with a type (`kind`), and you describe objects in YAML files called **manifests**. Every manifest has the same four top-level fields:

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

`kubectl apply -f file.yaml` sends a manifest to the cluster. If the object doesn't exist, it's created. If it does, it's updated to match. That makes `apply` safe to run again and again, and lets you keep the files in Git as the source of truth.

Two habits help when writing manifests:

```bash
kubectl explain deployment.spec.replicas   # docs for any field, from the cluster itself
kubectl diff -f k8s/                        # what would change, before you apply
```

**Labels** are the key-value pairs under `metadata.labels`. They look like decoration, but they're how objects find each other: a Deployment finds its Pods by label, and so does a Service.

## Deployments: keep N copies running

First, the image. In the Docker guide you built `hello-app`, a tiny Node server on port 3000. Build it with a real version tag and load it into the kind cluster (kind nodes can't see your local images otherwise):

```bash
docker build -t hello-app:1.0 .
kind load docker-image hello-app:1.0
```

Why `1.0` and not `latest`? Kubernetes always tries to pull an image tagged `:latest` from a registry, and our image only exists locally. kind's docs say to avoid `:latest` for this reason. It's a good habit anyway: a version tag tells you exactly what's running.

Now create a folder `k8s/` and a file `k8s/deployment.yaml`:

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

Read it as a sentence: *keep 3 replicas of Pods labeled `app: hello`, and here's the template for making one: a container from `hello-app:1.0` listening on 3000.* The `selector` must match the labels in the `template`, otherwise the API rejects it.

```bash
kubectl apply -f k8s/deployment.yaml
kubectl get deployments
kubectl get pods -l app=hello
```

```text
NAME    READY   UP-TO-DATE   AVAILABLE   AGE
hello   3/3     3            3           20s
```

Under the hood the Deployment created a **ReplicaSet**, and the ReplicaSet created the Pods. You manage the Deployment and leave the rest to it.

![A Deployment named hello manages a ReplicaSet, which keeps three Pods labeled app: hello running. A Service named hello selects the Pods by that label and spreads traffic across them.](/images/kubernetes-zero-to-hero/deployment-and-service.svg)

Now watch the reconcile loop work. Delete one Pod (use a name from your `get pods` output):

```bash
kubectl delete pod <one-of-the-hello-pods>
kubectl get pods -l app=hello
```

A new Pod with a new name is already starting. You said three, so there are three.

Scaling is one field. Change `replicas: 3` to `5` in the file and `apply` again, or for a quick test:

```bash
kubectl scale deployment/hello --replicas=5
```

Prefer editing the file. If you scale by command and later `apply` the file, the file wins and you're back to 3.

## Services: a stable address for Pods

Pods are disposable. Each new one gets a new IP, so nothing should talk to a Pod's IP directly. A **Service** gives a group of Pods one stable name and IP, and spreads traffic across whichever Pods match its selector right now.

Create `k8s/service.yaml`:

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

`port` is what clients use. `targetPort` is the container port the traffic goes to. Apply the whole folder, and test from inside the cluster with a throwaway Pod:

```bash
kubectl apply -f k8s/
kubectl get services
kubectl run tmp --rm -it --image=busybox:1.37 --restart=Never -- wget -qO- http://hello
```

```text
Hello from a container
```

The name `hello` works because the cluster runs its own DNS. Inside the same namespace the Service name is enough. From another namespace, use `hello.<namespace>`, or the full name `hello.<namespace>.svc.cluster.local`.

To reach it from your own browser during development, forward a local port:

```bash
kubectl port-forward service/hello 8080:80
# in another terminal:
curl localhost:8080
```

### Service types

Without a `type`, a Service is **ClusterIP**: reachable only inside the cluster. The [Service docs](https://kubernetes.io/docs/concepts/services-networking/service/) list the others:

| Type | What it does |
|---|---|
| `ClusterIP` | The default. A stable IP and DNS name, inside the cluster only. |
| `NodePort` | Also opens one port on every node, from the range 30000-32767 by default. |
| `LoadBalancer` | Also asks the cloud provider for an external load balancer. |
| `ExternalName` | A DNS alias (CNAME) to a name outside the cluster. No proxying. |

![A user on the internet reaches a Gateway or Ingress, which routes by host and path to a ClusterIP Service, which spreads requests across three Pods. Below: ClusterIP is internal only, NodePort also opens a port on every node, LoadBalancer also asks the cloud for an external load balancer.](/images/kubernetes-zero-to-hero/traffic-in.svg)

On a cloud cluster, `type: LoadBalancer` gives you a public IP for one Service. With many services you don't want a load balancer for each one, which is where the next section comes in.

## Getting traffic in: Gateway and Ingress

To route many hostnames and paths to many Services through one entry point, Kubernetes has two APIs:

- **Ingress**, the older one. The [Ingress page](https://kubernetes.io/docs/concepts/services-networking/ingress/) now says plainly: "The Kubernetes project recommends using Gateway instead of Ingress. The Ingress API has been frozen." It still works and won't be removed, but it gets no new features.
- **Gateway API**, the recommended replacement. A cluster operator sets up a `Gateway` (the entry point), and each team attaches `HTTPRoute` objects to it.

An `HTTPRoute` that sends `hello.example.com` to our Service:

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

Neither API does anything on its own. You need a **controller** that implements it, installed in the cluster or provided by your cloud. The [Gateway API site](https://gateway-api.sigs.k8s.io/) lists the implementations.

One piece of recent history worth knowing: the popular **ingress-nginx** controller was [retired by the Kubernetes project in March 2026](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/). Existing installs keep running but get no more security fixes. If a tutorial tells you to install it, choose a maintained controller instead.

## Rolling updates and rollbacks

Change the code, build `hello-app:1.1`, load it into kind, and change the image in `deployment.yaml`:

```bash
docker build -t hello-app:1.1 .
kind load docker-image hello-app:1.1
# edit k8s/deployment.yaml: image: hello-app:1.1
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/hello
```

Kubernetes doesn't stop everything and start again. It does a **rolling update**: start a new Pod, wait until it's ready, remove an old one, repeat. By default up to 25% extra Pods may be created (`maxSurge`) and up to 25% may be unavailable (`maxUnavailable`). With 3 replicas that rounds to one new Pod at a time and none missing.

![A rolling update of three Pods from v1 to v2. A v2 Pod starts; once it's ready, one v1 Pod is removed; this repeats until all three run v2. Each new Pod must pass its readiness probe before an old one goes away.](/images/kubernetes-zero-to-hero/rolling-update.svg)

The docs make one point clear: a rollout is triggered "if and only if the Deployment's Pod template (that is, `.spec.template`) is changed". Changing the image or an environment variable starts a rollout. Scaling doesn't.

If the new version is bad, go back:

```bash
kubectl rollout history deployment/hello
kubectl rollout undo deployment/hello
kubectl rollout undo deployment/hello --to-revision=1
```

By default a Deployment keeps 10 old ReplicaSets around for this (`revisionHistoryLimit`). After an undo, fix the file too, or your next `apply` brings the bad version back.

## Configuration: ConfigMaps and Secrets

Keep settings out of the image, so the same image runs in every environment. A **ConfigMap** holds plain settings, and a **Secret** holds sensitive ones:

```bash
kubectl create configmap hello-config --from-literal=LOG_LEVEL=info
kubectl create secret generic hello-secret --from-literal=DB_PASSWORD=dev-only
```

Then pass them to the container as environment variables, in the Pod template of `deployment.yaml`:

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

`envFrom` loads every key of the ConfigMap. `secretKeyRef` picks one key from the Secret. (Our tiny server reads only `PORT`. These are here to show the wiring.) ConfigMaps and Secrets can also be mounted as files.

Don't let the name fool you. The [Secrets docs](https://kubernetes.io/docs/concepts/configuration/secret/) warn that Secrets are "by default, stored unencrypted in the API server's underlying data store (etcd)", and the values in YAML are only base64-encoded, which anyone can decode. The docs recommend turning on encryption at rest, limiting who can read Secrets with RBAC, and considering an external secret store. Never commit a Secret manifest with real values to Git.

## Health checks: probes

Kubernetes knows whether your container's process is running. It doesn't know whether your app works. **Probes** tell it. The [probes docs](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/) define three:

- **Readiness:** is the container ready for traffic? If it fails, the Pod is removed from the Service's endpoints, but not restarted.
- **Liveness:** is the container still healthy? If it fails enough times, the kubelet restarts the container.
- **Startup:** has a slow app finished starting? Liveness and readiness checks wait until it succeeds.

Add them to the container in `deployment.yaml`:

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

Readiness is what makes rolling updates safe: a new Pod gets traffic only after it answers. In a real app, point the probes at a light endpoint such as `/healthz`. Keep the liveness check simple. If it depends on the database and the database blips, Kubernetes restarts every Pod at once.

## Resources: requests and limits

Tell Kubernetes how much CPU and memory each container needs:

```yaml
          resources:
            requests:
              cpu: 100m
              memory: 64Mi
            limits:
              memory: 128Mi
```

- **Requests** are what the scheduler reserves. A Pod is placed only on a node with that much free. `100m` is 100 millicores, a tenth of a CPU.
- **Limits** are the ceiling. A container that goes over its memory limit is killed (`OOMKilled`) and restarted. Going over a CPU limit just slows it down.

Without requests, the scheduler is guessing, and one hungry Pod can starve its neighbors. Set them on everything.

## Scaling automatically

A **HorizontalPodAutoscaler** (HPA) changes `replicas` for you based on load:

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

This keeps between 2 and 10 Pods, aiming for 70% of the *requested* CPU on average. That's why the HPA needs CPU requests to be set. It also needs the **Metrics Server** installed in the cluster, which kind doesn't include. Most managed clouds do. See the [HPA walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/). When an HPA manages a Deployment, remove `replicas` from the Deployment's file, or every `apply` resets it.

## Data: volumes and StatefulSets

A container's filesystem disappears with the container, just like in Docker. For data that must survive, you ask for storage with a **PersistentVolumeClaim** (PVC):

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

The cluster's default **StorageClass** provisions the actual disk (a cloud disk on EKS/GKE/AKS, a local folder on kind). A Pod then mounts the claim under `volumes` and `volumeMounts`.

For databases and other apps where each replica needs its own identity and its own disk, use a **StatefulSet** instead of a Deployment. It's a big topic. In production, many teams run their database as a managed cloud service (such as Amazon RDS) and keep only the stateless apps in Kubernetes.

## Namespaces and contexts

A **namespace** is a folder for objects inside one cluster: one per team, app or environment. Names must be unique within a namespace, not across the cluster.

```bash
kubectl get namespaces
kubectl create namespace staging
kubectl apply -f k8s/ -n staging
kubectl get pods -n staging
kubectl get pods -A                    # all namespaces
```

You start in `default`. System components live in `kube-system`, so don't deploy your apps there.

When you work with more than one cluster, `kubectl` picks one by **context**, stored in `~/.kube/config`:

```bash
kubectl config get-contexts
kubectl config current-context
kubectl config use-context kind-kind
```

Check the current context before any command that deletes things. Running `kubectl delete` against production when you meant your laptop is a classic.

## Debugging toolbox

Go from the outside in:

```bash
kubectl get pods -o wide                     # status, restarts, which node
kubectl describe pod <name>                  # details and, at the bottom, Events
kubectl logs <name>                          # the container's output
kubectl logs <name> --previous               # output from the crash before the restart
kubectl exec -it <name> -- sh                # a shell inside the container
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl get endpointslices -l kubernetes.io/service-name=hello   # which Pods a Service sends to
```

The **Events** section at the end of `kubectl describe` explains most problems in plain words. The statuses you'll see most:

| Status | Usually means |
|---|---|
| `Pending` | No node has enough free CPU or memory for the requests, or a volume can't be attached. |
| `ImagePullBackOff` / `ErrImagePull` | Wrong image name or tag, a private registry without credentials, or (on kind) an image you forgot to `kind load`. |
| `CrashLoopBackOff` | The container starts and exits again and again. Read `logs --previous`. |
| `OOMKilled` | The container went over its memory limit. |
| Running but `0/1` ready | The readiness probe fails: wrong path or port, or the app is still starting. |

If a Service returns nothing, compare its `selector` with the Pods' labels, and its `targetPort` with the port the app listens on. A label typo is the most common cause.

## Beyond kubectl apply: Helm and Kustomize

Real apps need the same manifests with small differences per environment. Two tools handle that:

- **Kustomize** is built into `kubectl`. You keep a base set of manifests and small overlays per environment (`staging`, `production`) that patch them. Apply with `kubectl apply -k <folder>`.
- **Helm** is a package manager for Kubernetes. A **chart** is a templated set of manifests with a `values.yaml` of settings. Most third-party software (databases, monitoring, controllers) ships as a chart:

```bash
helm install my-release <chart> -f my-values.yaml
helm upgrade my-release <chart> -f my-values.yaml
helm list
helm uninstall my-release
```

In teams, the last step is usually **GitOps**: a tool such as Argo CD or Flux watches the Git repository and applies changes to the cluster itself, so Git is always what's running.

## Running in production

- **Use a managed cluster** (EKS, GKE, AKS) unless running Kubernetes is your job. Upgrading and securing a control plane is a lot of work.
- **At least two replicas** of everything that serves traffic, with readiness probes.
- **Requests on every container**, and a memory limit.
- **Pinned image versions.** Never `latest`. A version tag, or a digest for exactness.
- **No secrets in Git or images.** Use an external secret store, or at least encryption at rest and tight RBAC.
- **Least privilege.** RBAC roles per team, NetworkPolicies to limit which Pods can talk to which, containers that don't run as root.
- **Manifests in Git**, applied by a pipeline or GitOps tool, not from someone's laptop.
- **Logs to standard output**, collected by the cluster's logging, as with Docker.
- **Stay on supported versions.** Kubernetes releases three minor versions a year, and each is supported for about a year. Plan upgrades.

## The cheat sheet

| I want to... | Command |
|---|---|
| Create / delete a local cluster | `kind create cluster` / `kind delete cluster` |
| Apply every manifest in a folder | `kubectl apply -f k8s/` |
| See what would change | `kubectl diff -f k8s/` |
| List Pods (with node and IP) | `kubectl get pods -o wide` |
| List everything in a namespace | `kubectl get all -n <ns>` |
| Why is this Pod stuck? | `kubectl describe pod <name>` |
| Logs / follow / previous crash | `kubectl logs <pod>` / `-f` / `--previous` |
| Shell inside a container | `kubectl exec -it <pod> -- sh` |
| Reach a Service from my laptop | `kubectl port-forward svc/<name> 8080:80` |
| Scale | `kubectl scale deployment/<name> --replicas=5` |
| Watch a rollout / undo it | `kubectl rollout status deployment/<name>` / `kubectl rollout undo deployment/<name>` |
| Docs for a field | `kubectl explain deployment.spec.template` |
| Which cluster am I on? | `kubectl config current-context` |
| Delete what a folder created | `kubectl delete -f k8s/` |

## Glossary

- **Cluster:** a control plane plus the worker nodes it manages.
- **Node:** one machine (virtual or physical) in the cluster.
- **Control plane:** the API server, etcd, scheduler and controllers.
- **kubectl:** the command-line client for the Kubernetes API.
- **Manifest:** a YAML file that describes an object's desired state.
- **Pod:** one or more containers that share an IP; the smallest unit Kubernetes runs.
- **Deployment:** keeps a number of identical Pods running and rolls out updates.
- **ReplicaSet:** the object a Deployment uses to keep the Pod count.
- **Service:** a stable name and IP in front of a changing set of Pods.
- **Label / selector:** key-value tags, and the queries that match them.
- **Gateway / HTTPRoute:** the recommended API for routing outside traffic in.
- **Ingress:** the older, frozen API for the same job.
- **ConfigMap / Secret:** settings / sensitive settings, passed to containers.
- **Probe:** a readiness, liveness or startup health check.
- **Requests / limits:** reserved resources / the maximum allowed.
- **HPA:** scales a Deployment's replicas based on metrics.
- **PVC / StorageClass:** a request for storage / how the cluster provides it.
- **StatefulSet:** like a Deployment, for Pods that need stable identity and storage.
- **Namespace:** a folder for objects inside a cluster.
- **Context:** a saved cluster-plus-user setting in `~/.kube/config`.
- **Helm chart:** a packaged, templated set of manifests.

## Where to go next

You now have the whole loop: an image from Docker, a Deployment that keeps copies of it running, a Service that gives them one address, a Gateway that lets the world in, and rollouts, probes and requests that keep it all healthy. To make it stick, put a project of your own on kind: write the Deployment and Service, break a probe on purpose, and fix it with `describe` and `logs`.

The official [Kubernetes Basics tutorial](https://kubernetes.io/docs/tutorials/kubernetes-basics/) and the [concepts section](https://kubernetes.io/docs/concepts/) are the best next reading. To build and push your image automatically on every merge, see [GitHub Actions from zero to hero](en/posts/github-actions-zero-to-hero/). For the cloud side, [AWS from zero to hero](en/posts/aws-zero-to-hero/) maps where EKS fits. And when you're inside a container with `kubectl exec`, the [Linux commands cheat sheet](en/posts/linux-commands/) has what you'll type.
