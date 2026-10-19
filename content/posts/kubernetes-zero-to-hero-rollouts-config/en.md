---
title: "Kubernetes: rolling updates, config, probes and autoscaling"
summary: "Update hello-app without downtime and roll back, pass settings with ConfigMaps and Secrets, add readiness and liveness probes, set requests and limits, and scale with an HPA."
date: 2026-10-13
tags: [kubernetes, containers]
series: { key: devops, order: 52 }
---

This part builds on the `hello` Deployment and Service in `k8s/` from [Deployments, Services and getting traffic in](en/posts/kubernetes-zero-to-hero-deployments-services/). Each change below is an edit to `k8s/deployment.yaml` followed by `kubectl apply`.

## Rolling updates and rollbacks

Change the code, build `hello-app:1.1`, load it into kind, and change the image in `deployment.yaml`:

```bash
docker build -t hello-app:1.1 .
kind load docker-image hello-app:1.1
# edit k8s/deployment.yaml: image: hello-app:1.1
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/hello
```

Kubernetes doesn't stop everything and restart. It does a **rolling update**: start a new Pod, wait until it's ready, remove an old one, repeat. By default up to 25% extra Pods may be created (`maxSurge`) and 25% may be unavailable (`maxUnavailable`); with 3 replicas that means one new Pod at a time and none missing.

![A rolling update of three Pods from v1 to v2. A v2 Pod starts; once it's ready, one v1 Pod is removed; this repeats until all three run v2. Each new Pod must pass its readiness probe before an old one goes away.](/images/kubernetes-zero-to-hero/rolling-update.svg)

A rollout starts only when the Pod template (`.spec.template`) changes, such as the image or an environment variable. Scaling doesn't start one.

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

Pass them to the container as environment variables, in the Pod template:

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

`envFrom` loads every key of the ConfigMap. `secretKeyRef` picks one key from the Secret. (Our tiny server reads only `PORT`; these show the wiring.) ConfigMaps and Secrets can also be mounted as files.

Don't let the name fool you. The [Secrets docs](https://kubernetes.io/docs/concepts/configuration/secret/) warn that Secrets are stored unencrypted in etcd by default, and values in YAML are only base64-encoded, which anyone can decode. Turn on encryption at rest, limit who can read Secrets with RBAC, and consider an external secret store. Never commit a Secret manifest with real values to Git.

## Health checks: probes

Kubernetes knows whether your container's process is running, not whether your app works. **Probes** tell it. The [probes docs](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/) define three:

- **Readiness:** is the container ready for traffic? If it fails, the Pod is removed from the Service's endpoints, but not restarted.
- **Liveness:** is the container still healthy? If it fails enough times, the kubelet restarts the container.
- **Startup:** has a slow app finished starting? Liveness and readiness checks wait until it succeeds.

Add them to the container:

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

Readiness makes rolling updates safe: a new Pod gets traffic only after it answers. In a real app, point probes at a light endpoint such as `/healthz`, and keep liveness simple: if it depends on the database and the database blips, Kubernetes restarts every Pod at once.

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

Without requests the scheduler is guessing and one hungry Pod can starve its neighbors, so set them everywhere.

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

The target is 70% of the *requested* CPU on average, so CPU requests must be set. The HPA also needs the **Metrics Server**, which kind doesn't include and most managed clouds do ([HPA walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)). When an HPA manages a Deployment, remove `replicas` from the Deployment's file, or every `apply` resets it.
