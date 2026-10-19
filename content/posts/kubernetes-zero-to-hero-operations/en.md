---
title: "Kubernetes: storage, namespaces, debugging and Helm"
summary: "Persistent volumes and StatefulSets, namespaces and kubectl contexts, a debugging routine with the common Pod statuses, Kustomize and Helm, and a production checklist."
date: 2026-10-13
tags: [kubernetes, containers]
series: { key: devops, order: 22 }
---

The last part of the Kubernetes series: what you need once `hello-app` runs with [rollouts, config and probes](en/posts/kubernetes-zero-to-hero-rollouts-config/), and you start keeping data, running several environments and fixing things that break.

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

For databases and apps where each replica needs its own identity and disk, use a **StatefulSet** instead of a Deployment. It's a big topic: many teams run the database as a managed cloud service (such as Amazon RDS) and keep only stateless apps in Kubernetes.

## Namespaces and contexts

A **namespace** is a folder for objects inside one cluster: one per team, app or environment. Names must be unique within a namespace, not across the cluster.

```bash
kubectl get namespaces
kubectl create namespace staging
kubectl apply -f k8s/ -n staging
kubectl get pods -n staging
kubectl get all -n staging             # every object type
kubectl get pods -A                    # all namespaces
```

You start in `default`. System components live in `kube-system`, so don't deploy your apps there.

With more than one cluster, `kubectl` picks one by **context**, stored in `~/.kube/config`:

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
kubectl logs <name>                          # the container's output (-f to follow)
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

- **Use a managed cluster** (EKS, GKE, AKS) unless running Kubernetes is your job.
- **At least two replicas** of everything that serves traffic, with readiness probes.
- **Requests on every container**, and a memory limit.
- **Pinned image versions,** never `latest`.
- **No secrets in Git or images:** an external secret store, or at least encryption at rest and tight RBAC.
- **Least privilege:** RBAC roles per team, NetworkPolicies, containers that don't run as root.
- **Manifests in Git**, applied by a pipeline or GitOps tool, not from someone's laptop.
- **Logs to standard output**, collected by the cluster.
- **Stay on supported versions.** Three minor releases a year, each supported for about a year. Plan upgrades.

## Where to go next

Put a project of your own on kind, break a probe on purpose, and fix it with `describe` and `logs`.

The official [Kubernetes Basics tutorial](https://kubernetes.io/docs/tutorials/kubernetes-basics/) and [concepts section](https://kubernetes.io/docs/concepts/) are the best next reading. To build and push your image on every merge, see [GitHub Actions from zero to hero](en/posts/github-actions-zero-to-hero-secrets-deploy/); [AWS from zero to hero](en/posts/aws-zero-to-hero/) maps where EKS fits; and inside a container, the [Linux commands cheat sheet](en/posts/linux-commands/) has what you'll type.
