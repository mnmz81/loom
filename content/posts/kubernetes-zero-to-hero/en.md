---
title: "Kubernetes from zero to hero: clusters, Pods and manifests"
summary: "What Kubernetes is and the desired-state idea, the parts of a cluster, a local cluster with kind, a first Pod, and how manifests describe objects in YAML."
date: 2026-10-13
updated: 2026-10-19
tags: [kubernetes, containers]
series: { key: devops, order: 19 }
---

Docker answers "how do I run my app in a container?". The next question comes fast: how do I run ten copies of it across several servers, restart the ones that crash, update them without downtime, and send traffic only to the healthy ones? That's the job of **Kubernetes** (often written **K8s**: K, eight letters, s).

This series takes the `hello-app` image from [Docker from zero to hero](en/posts/docker-zero-to-hero-dockerfile/) and runs it on a local Kubernetes cluster. Every command and field was checked against the [official Kubernetes documentation](https://kubernetes.io/docs/home/) (v1.37 at the time of writing). Generated names, IPs and ages will differ on your machine.

## What Kubernetes is

Kubernetes is a **container orchestrator**: software that runs containers across a group of machines and keeps them running. You say *what* you want ("three copies of this image, reachable on port 80"), and it decides *where* and *how*, and keeps fixing things when reality drifts.

It's open source, started at Google, and maintained by the Cloud Native Computing Foundation. Every big cloud offers it as a managed service: Amazon EKS, Google GKE and Azure AKS.

Do you need it? One app on one server is fine with Docker Compose. Kubernetes pays off with several services, more than one machine, and a need for zero-downtime deploys and self-healing.

### Desired state: the one idea to remember

You write down the **desired state** and hand it to the cluster. **Controllers** run in a loop, compare it with the **actual state**, and act to close the gap.

![You declare replicas: 3 with kubectl apply, and the API server stores it as the desired state. A controller keeps comparing it with the actual state. When only two Pods are running, the controller acts and starts one more, until actual matches desired.](/images/kubernetes-zero-to-hero/desired-state.svg)

If a Pod crashes, or a whole server dies, nobody runs a command: the controller starts a replacement. That's why Kubernetes work is mostly *editing files that describe the result*, not typing commands that perform steps.

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

You will rarely touch these directly, and on a managed service the cloud runs the control plane for you.

## Set up a local cluster

You need `kubectl`, the command-line client, and a local cluster. This series uses **kind** ("Kubernetes in Docker"), which runs each node as a Docker container. minikube works too.

On macOS with Homebrew (see the [kubectl install docs](https://kubernetes.io/docs/tasks/tools/) for other systems):

```bash
brew install kubectl kind
kubectl version --client
kind version
```

kind needs a running Docker (Docker Desktop or similar). Create a cluster (`kind delete cluster` removes it):

```bash
kind create cluster
kubectl cluster-info
kubectl get nodes
```

```text
NAME                 STATUS   ROLES           AGE   VERSION
kind-control-plane   Ready    control-plane   45s   v1.xx.x
```

By default ([kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/)) the cluster is named `kind`, and kind adds a `kubectl` **context** named `kind-kind` and switches to it. A context is a saved "which cluster, as which user" setting ([more on contexts](en/posts/kubernetes-zero-to-hero-operations/)).

Keep `kubectl` within one minor version of the cluster; a bigger gap can cause surprises.

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

While the image downloads, the status is `ContainerCreating`.

You will almost never create Pods like this: a bare Pod has no one watching it, and if it dies or its node fails, it's gone. A **Deployment** creates and replaces Pods for you; that's the [next part](en/posts/kubernetes-zero-to-hero-deployments-services/).

## Manifests: describing objects in YAML

Everything in Kubernetes is an **object** with a type (`kind`), described in YAML files called **manifests**. Every manifest has the same four top-level fields:

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

`kubectl apply -f file.yaml` sends a manifest to the cluster: the object is created, or updated to match. That makes `apply` safe to repeat, and lets you keep the files in Git as the source of truth. `kubectl delete -f` removes what a file or folder created.

Two habits help when writing manifests:

```bash
kubectl explain deployment.spec.replicas   # docs for any field, from the cluster itself
kubectl diff -f k8s/                        # what would change, before you apply
```

**Labels** are the key-value pairs under `metadata.labels`. They look like decoration, but they're how objects find each other: a Deployment finds its Pods by label, and so does a Service.
