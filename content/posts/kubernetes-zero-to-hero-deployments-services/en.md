---
title: "Kubernetes: Deployments, Services and getting traffic in"
summary: "Run hello-app as a Deployment that keeps three copies alive, give it a stable address with a Service, compare Service types, and route outside traffic with Gateway API or Ingress."
date: 2026-10-13
tags: [kubernetes, containers]
series: { key: devops, order: 51 }
---

This part needs the kind cluster and the manifest basics from [Kubernetes from zero to hero](en/posts/kubernetes-zero-to-hero/), and the `hello-app` image from [Docker from zero to hero](en/posts/docker-zero-to-hero/): a tiny Node server on port 3000.

## Deployments: keep N copies running

Build the image with a real version tag and load it into the kind cluster (kind nodes can't see your local images otherwise):

```bash
docker build -t hello-app:1.0 .
kind load docker-image hello-app:1.0
```

Why `1.0` and not `latest`? Kubernetes always tries to pull `:latest` from a registry, and our image exists only locally. A version tag also tells you exactly what's running.

Create a folder `k8s/` and a file `k8s/deployment.yaml`:

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

Read it as a sentence: *keep 3 replicas of Pods labeled `app: hello`, and here's the template for making one.* The `selector` must match the labels in the `template`, otherwise the API rejects it.

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

A new Pod with a new name is already starting.

Scaling is one field: change `replicas: 3` to `5` in the file and `apply` again. For a quick test:

```bash
kubectl scale deployment/hello --replicas=5
```

Prefer the file: if you scale by command and later `apply` it, you're back to 3.

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

The name `hello` works because the cluster runs its own DNS. In the same namespace the Service name is enough; from another, use `hello.<namespace>`.

To reach it from your own browser during development, forward a local port:

```bash
kubectl port-forward service/hello 8080:80
# in another terminal:
curl localhost:8080
```

### Service types

Without a `type`, a Service is **ClusterIP**. The [Service docs](https://kubernetes.io/docs/concepts/services-networking/service/) list the others:

| Type | What it does |
|---|---|
| `ClusterIP` | The default. A stable IP and DNS name, inside the cluster only. |
| `NodePort` | Also opens one port on every node, from the range 30000-32767 by default. |
| `LoadBalancer` | Also asks the cloud provider for an external load balancer. |
| `ExternalName` | A DNS alias (CNAME) to a name outside the cluster. No proxying. |

![A user on the internet reaches a Gateway or Ingress, which routes by host and path to a ClusterIP Service, which spreads requests across three Pods. Below: ClusterIP is internal only, NodePort also opens a port on every node, LoadBalancer also asks the cloud for an external load balancer.](/images/kubernetes-zero-to-hero/traffic-in.svg)

On a cloud cluster, `type: LoadBalancer` gives one Service a public IP. With many services you don't want a load balancer each.

## Getting traffic in: Gateway and Ingress

To route many hostnames and paths to many Services through one entry point, Kubernetes has two APIs:

- **Ingress**, the older one. The [Ingress page](https://kubernetes.io/docs/concepts/services-networking/ingress/) now recommends Gateway instead and says the Ingress API is frozen: it still works, but gets no new features.
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

Neither API does anything alone: you need a **controller** that implements it, installed in the cluster or provided by your cloud ([implementations](https://gateway-api.sigs.k8s.io/)).

The popular **ingress-nginx** controller was [retired in March 2026](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/). Existing installs keep running but get no security fixes, so if a tutorial says to install it, pick a maintained controller.
