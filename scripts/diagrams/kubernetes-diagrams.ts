// Generates the SVG diagrams for the "Kubernetes from zero to hero" post.
// Usage: npx tsx scripts/diagrams/kubernetes-diagrams.ts      (writes public/images/kubernetes-zero-to-hero/*.svg)
import { C, arrow, box, outDir, pill, svgWriter, text } from './lib.ts';

const svg = svgWriter(outDir('kubernetes-zero-to-hero'));

const bar = (x: number, y: number, w: number, h: number, label: string, fill: string, color = '#ffffff', mono = false) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}"/>` +
  text(x + w / 2, y + h / 2 + 5, label, { size: 12.5, color, weight: 600, mono });

const pod = (cx: number, cy: number, label: string, color: string, ghost = false) =>
  `<rect x="${cx - 38}" y="${cy - 20}" width="76" height="40" rx="10" fill="${ghost ? '#ffffff' : color}" stroke="${color}" stroke-width="2"${ghost ? ' stroke-dasharray="5 4"' : ''}/>` +
  text(cx, cy + 5, label, { size: 12.5, color: ghost ? color : '#ffffff', weight: 700, mono: true });

// 1. Cluster architecture ------------------------------------------------------------
svg(
  'cluster-architecture',
  760,
  400,
  'The parts of a Kubernetes cluster',
  'kubectl on your computer talks to the API server. The control plane holds the API server, etcd where the cluster state is stored, the scheduler that places Pods on nodes, and the controller manager that runs the controllers. Each worker node runs a kubelet, kube-proxy and a container runtime, and the Pods with your containers.',
  [
    box(20, 150, 110, 70, C.border),
    text(75, 182, 'kubectl', { weight: 700, mono: true }),
    text(75, 202, 'your computer', { size: 11.5, color: C.muted }),
    box(180, 20, 560, 140, C.main, C.panel),
    text(460, 44, 'Control plane', { weight: 700, color: C.main }),
    bar(198, 60, 120, 80, 'API server', C.main),
    bar(334, 60, 120, 80, 'etcd', C.amber),
    bar(470, 60, 120, 80, 'scheduler', C.muted),
    bar(606, 60, 120, 80, 'controllers', C.muted),
    ...[180, 470].flatMap((x, i) => [
      box(x, 190, 270, 170, C.green, C.panel),
      text(x + 135, 214, `Worker node ${i + 1}`, { weight: 700, color: C.green }),
      bar(x + 14, 228, 76, 30, 'kubelet', C.green),
      bar(x + 97, 228, 82, 30, 'kube-proxy', C.green),
      bar(x + 186, 228, 70, 30, 'runtime', C.green),
      pod(x + 70, 300, 'Pod', C.feature),
      pod(x + 200, 300, 'Pod', C.feature),
    ]),
    arrow(258, 142, 258, 226, C.grey, true),
    `<path d="M 300 142 V 175 H 522 V 224" fill="none" stroke="${C.grey}" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#ah-${C.grey.slice(1)})"/>`,
    arrow(132, 180, 196, 120, C.main),
    text(460, 386, 'You talk to the API server. The kubelet on each node starts and watches the Pods.', { size: 13, color: C.muted }),
  ],
);

// 2. Desired state and the reconcile loop ------------------------------------------------------------
svg(
  'desired-state',
  760,
  320,
  'Desired state and the reconcile loop',
  'You declare the desired state, for example three replicas, with kubectl apply. The API server stores it. A controller keeps comparing the desired state with the actual state. When a Pod dies and only two are running, the controller acts and starts a new Pod until actual matches desired again.',
  [
    box(20, 110, 150, 90, C.border),
    text(95, 142, 'You', { weight: 700 }),
    text(95, 164, 'kubectl apply', { size: 12, mono: true, color: C.muted }),
    text(95, 182, 'replicas: 3', { size: 12, mono: true, color: C.main }),
    arrow(172, 155, 238, 155, C.main),
    box(240, 110, 150, 90, C.main),
    text(315, 142, 'Desired state', { weight: 700, color: C.main }),
    text(315, 164, 'stored by the', { size: 12, color: C.muted }),
    text(315, 182, 'API server', { size: 12, color: C.muted }),
    box(560, 110, 180, 90, C.green),
    text(650, 136, 'Actual state', { weight: 700, color: C.green }),
    pod(605, 172, 'Pod', C.feature),
    pod(690, 172, 'Pod', C.feature),
    `<path d="M 330 108 C 380 30, 600 30, 640 106" fill="none" stroke="${C.amber}" stroke-width="2" marker-start="url(#ah-${C.amber.slice(1)})" marker-end="url(#ah-${C.amber.slice(1)})"/>`,
    `<path d="M 330 204 C 380 280, 600 280, 640 204" fill="none" stroke="${C.amber}" stroke-width="2" marker-end="url(#ah-${C.amber.slice(1)})"/>`,
    pill(480, 40, 'compare', C.amber, 100),
    pill(480, 266, 'act: start 1 Pod', C.amber, 160),
    text(475, 160, 'controller', { weight: 700, color: C.amber }),
    text(475, 180, 'loops forever', { size: 12, color: C.muted }),
    text(380, 306, 'Desired 3, actual 2: the controller starts a Pod. You never say how, only what.', { size: 13, color: C.muted }),
  ],
);

// 3. Deployment, ReplicaSet, Pods and a Service ------------------------------------------------------------
svg(
  'deployment-and-service',
  760,
  340,
  'A Deployment, its ReplicaSet and Pods, and a Service',
  'A Deployment named hello manages a ReplicaSet, which keeps three Pods running, each with the label app: hello. A Service named hello selects Pods by that label and spreads traffic between them. Other Pods reach it by the DNS name hello on port 80, which forwards to port 3000 in the containers.',
  [
    box(20, 40, 170, 80, C.main),
    text(105, 72, 'Deployment', { weight: 700, color: C.main }),
    text(105, 94, 'hello, replicas: 3', { size: 12, mono: true, color: C.muted }),
    arrow(192, 80, 248, 80, C.main),
    box(250, 40, 170, 80, C.muted),
    text(335, 72, 'ReplicaSet', { weight: 700, color: C.muted }),
    text(335, 94, 'keeps 3 running', { size: 12, color: C.muted }),
    arrow(335, 122, 335, 176, C.muted),
    box(200, 180, 360, 110, C.feature, C.panel, true),
    text(380, 280, 'label  app: hello', { size: 12.5, mono: true, color: C.feature }),
    pod(260, 236, 'Pod', C.feature),
    pod(380, 236, 'Pod', C.feature),
    pod(500, 236, 'Pod', C.feature),
    box(590, 40, 150, 80, C.green),
    text(665, 72, 'Service', { weight: 700, color: C.green }),
    text(665, 94, 'hello:80', { size: 12, mono: true, color: C.muted }),
    arrow(630, 122, 500, 214, C.green),
    arrow(625, 122, 380, 214, C.green),
    arrow(620, 122, 260, 214, C.green),
    text(596, 180, 'selector: app=hello', { size: 12, mono: true, color: C.green, anchor: 'start' }),
    text(105, 160, 'You edit this one.', { size: 12.5, color: C.main }),
    text(105, 178, 'It creates the rest.', { size: 12.5, color: C.main }),
    text(380, 322, 'Pods come and go with new IPs. The Service finds them by label and keeps one stable name.', { size: 13, color: C.muted }),
  ],
);

// 4. Getting traffic in ------------------------------------------------------------
svg(
  'traffic-in',
  760,
  390,
  'How traffic reaches Pods',
  'A user on the internet reaches a load balancer or a Gateway, which routes by hostname and path to a Service, which spreads requests across Pods. A ClusterIP Service is reachable only inside the cluster. A NodePort Service opens the same port on every node. A LoadBalancer Service asks the cloud for an external load balancer. For local testing, kubectl port-forward tunnels a port from your computer.',
  [
    box(20, 60, 120, 70, C.border),
    text(80, 92, 'User', { weight: 700 }),
    text(80, 112, 'the internet', { size: 11.5, color: C.muted }),
    arrow(142, 95, 208, 95, C.main),
    box(210, 50, 170, 90, C.main),
    text(295, 82, 'Gateway / Ingress', { weight: 700, color: C.main }),
    text(295, 102, 'routes by host', { size: 12, color: C.muted }),
    text(295, 120, 'and path', { size: 12, color: C.muted }),
    arrow(382, 95, 448, 95, C.green),
    box(450, 60, 120, 70, C.green),
    text(510, 92, 'Service', { weight: 700, color: C.green }),
    text(510, 112, 'ClusterIP', { size: 12, mono: true, color: C.muted }),
    arrow(572, 80, 640, 50, C.feature),
    arrow(572, 95, 640, 105, C.feature),
    arrow(572, 110, 640, 160, C.feature),
    pod(682, 46, 'Pod', C.feature),
    pod(682, 104, 'Pod', C.feature),
    pod(682, 162, 'Pod', C.feature),
    `<line x1="20" y1="210" x2="740" y2="210" stroke="${C.border}" stroke-width="1.5"/>`,
    text(30, 240, 'Service types', { weight: 700, anchor: 'start' }),
    ...([
      ['ClusterIP', 'default. A stable IP and DNS name inside the cluster only.', C.green],
      ['NodePort', 'also opens one port (30000-32767) on every node.', C.amber],
      ['LoadBalancer', 'also asks the cloud provider for an external load balancer.', C.main],
    ] as const).flatMap(([name, desc, col], i) => [
      pill(100, 268 + i * 30, name, col, 130),
      text(180, 273 + i * 30, desc, { size: 12.5, anchor: 'start', color: C.text }),
    ]),
    text(380, 370, 'On your laptop:  kubectl port-forward svc/hello 8080:80', { size: 12.5, mono: true, color: C.muted }),
  ],
);

// 5. Rolling update ------------------------------------------------------------
const rows: [string, string[]][] = [
  ['start', ['v1', 'v1', 'v1']],
  ['step 1', ['v1', 'v1', 'v1', 'v2?']],
  ['step 2', ['v1', 'v1', 'v2']],
  ['step 3', ['v1', 'v2', 'v2']],
  ['done', ['v2', 'v2', 'v2']],
];
svg(
  'rolling-update',
  760,
  380,
  'A rolling update from v1 to v2',
  'A Deployment with three replicas of v1 is updated to v2. Kubernetes starts one v2 Pod, waits until it is ready, then removes one v1 Pod, and repeats until all three run v2. Traffic keeps flowing the whole time. If v2 never becomes ready, the rollout stops and kubectl rollout undo goes back to v1.',
  [
    ...rows.flatMap(([label, pods], r) => {
      const y = 46 + r * 62;
      return [
        text(70, y + 5, label, { size: 13, weight: 600, color: C.muted }),
        ...pods.map((p, i) =>
          p === 'v2?' ? pod(190 + i * 100, y, 'v2', C.green, true) : pod(190 + i * 100, y, p, p === 'v1' ? C.main : C.green),
        ),
      ];
    }),
    text(620, 108, 'new Pod starting,', { size: 12, color: C.green }),
    text(620, 124, 'not ready yet', { size: 12, color: C.green }),
    text(620, 170, 'ready: remove one v1', { size: 12, color: C.muted }),
    text(380, 352, 'Each new Pod must pass its readiness probe before an old one is removed.', { size: 13, color: C.muted }),
    text(380, 372, 'Stuck? kubectl rollout undo deployment/hello', { size: 12.5, mono: true, color: C.red }),
  ],
);

console.log(`[diagrams] wrote 5 SVGs to ${outDir('kubernetes-zero-to-hero')}`);
