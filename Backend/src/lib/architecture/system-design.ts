import type { ArchitectureModel, ArchNode, ArchEdge } from "./model-builder";

export interface SystemDesignNode {
  id: string;
  label: string;
  zone: string;
  type: string;
  description: string;
  children: string[];
  sublabel?: string;
}

export interface SystemDesignFlow {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  sublabel?: string;
}

export interface SystemDesignDiagram {
  nodes: SystemDesignNode[];
  flows: SystemDesignFlow[];
  zones: { id: string; label: string; order: number }[];
}

const ZONE_CONFIG: { id: string; label: string; order: number; match: (n: ArchNode) => boolean }[] = [
  { id: "user", label: "User", order: 0, match: () => false },
  { id: "client", label: "Client", order: 1, match: (n) => n.type === "component" || n.filePath.toLowerCase().includes("component") },
  { id: "frontend", label: "Frontend", order: 2, match: (n) => n.module === "src" && n.type !== "api_route" && n.type !== "database" },
  { id: "api", label: "API Layer", order: 3, match: (n) => n.type === "api_route" || n.filePath.toLowerCase().includes("api") || n.filePath.toLowerCase().includes("route") },
  { id: "service", label: "Services", order: 4, match: (n) => n.type === "service" || n.filePath.toLowerCase().includes("service") },
  { id: "data", label: "Data Layer", order: 5, match: (n) => n.type === "database" || n.filePath.toLowerCase().includes("db") || n.filePath.toLowerCase().includes("model") || n.filePath.toLowerCase().includes("data") },
  { id: "external", label: "External", order: 6, match: (n) => n.type === "external_dependency" },
];

const ZONE_FLOWS: { from: string; to: string; label: string; type: string; sublabel?: string }[] = [
  { from: "user", to: "client", label: "Interacts with", type: "user", sublabel: "Browser" },
  { from: "client", to: "frontend", label: "Renders UI", type: "internal", sublabel: "React/Next.js" },
  { from: "client", to: "api", label: "HTTP Requests", type: "network", sublabel: "REST API" },
  { from: "frontend", to: "api", label: "API Calls", type: "network", sublabel: "Fetch data" },
  { from: "api", to: "service", label: "Invokes", type: "internal", sublabel: "Agent/Service" },
  { from: "service", to: "data", label: "Reads/Writes", type: "data", sublabel: "Database" },
  { from: "service", to: "external", label: "Integrates", type: "external", sublabel: "External APIs" },
];

function buildUniqueFlows(edges: ArchEdge[], nodes: ArchNode[]): { fromZone: string; toZone: string; label: string }[] {
  const zoneMap = ZONE_CONFIG.filter((z) => z.id !== "user");

  function zoneFor(id: string, allNodes: ArchNode[]): string {
    const node = allNodes.find((n) => n.id === id);
    if (!node) return "frontend";
    for (const z of zoneMap) {
      if (z.match(node)) return z.id;
    }
    return "frontend";
  }

  const seen = new Set<string>();
  const result: { fromZone: string; toZone: string; label: string }[] = [];

  for (const edge of edges) {
    const from = zoneFor(edge.source, nodes);
    const to = zoneFor(edge.target, nodes);
    if (from === to) continue;
    const key = `${from}->${to}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ fromZone: from, toZone: to, label: edge.type });
    }
  }

  return result;
}

export function buildSystemDesignDiagram(model: ArchitectureModel): SystemDesignDiagram {
  const nodeIdsByZone = new Map<string, string[]>();
  for (const z of ZONE_CONFIG) nodeIdsByZone.set(z.id, []);

  for (const node of model.nodes) {
    let placed = false;
    for (const z of ZONE_CONFIG) {
      if (z.match(node)) {
        nodeIdsByZone.get(z.id)!.push(node.id);
        placed = true;
        break;
      }
    }
    if (!placed) {
      nodeIdsByZone.get("frontend")!.push(node.id);
    }
  }

  const zones = ZONE_CONFIG.filter((z) => (nodeIdsByZone.get(z.id)?.length ?? 0) > 0 || z.id === "user")
    .map((z) => ({ id: z.id, label: z.label, order: z.order }));

  const zoneNodes: Map<string, SystemDesignNode> = new Map();
  for (const z of zones) {
    const nodeIds = nodeIdsByZone.get(z.id) ?? [];
    const zoneNode: SystemDesignNode = {
      id: `zone-${z.id}`,
      label: z.label,
      zone: z.id,
      type: z.id === "user" ? "user" : z.id === "external" ? "external" : z.id === "data" ? "database" : "service",
      description: `${nodeIds.length} components`,
      children: nodeIds,
    };
    zoneNodes.set(z.id, zoneNode);
  }

  const flows: SystemDesignFlow[] = [];

  for (const defaultFlow of ZONE_FLOWS) {
    if (zoneNodes.has(defaultFlow.from) && zoneNodes.has(defaultFlow.to)) {
      flows.push({
        id: `flow-${defaultFlow.from}-${defaultFlow.to}`,
        source: `zone-${defaultFlow.from}`,
        target: `zone-${defaultFlow.to}`,
        label: defaultFlow.label,
        type: defaultFlow.type,
        sublabel: defaultFlow.sublabel,
      });
    }
  }

  const customFlows = buildUniqueFlows(model.edges, model.nodes);
  for (const cf of customFlows) {
    if (zoneNodes.has(cf.fromZone) && zoneNodes.has(cf.toZone)) {
      const exists = flows.some((f) => f.source === `zone-${cf.fromZone}` && f.target === `zone-${cf.toZone}`);
      if (!exists) {
        flows.push({
          id: `flow-${cf.fromZone}-${cf.toZone}`,
          source: `zone-${cf.fromZone}`,
          target: `zone-${cf.toZone}`,
          label: cf.label,
          type: "internal",
        });
      }
    }
  }

  return { nodes: Array.from(zoneNodes.values()), flows, zones };
}

export function convertSystemDesignToReactFlow(diagram: SystemDesignDiagram): {
  nodes: { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown>; style?: Record<string, string | number>; parentId?: string }[];
  edges: { id: string; source: string; target: string; label?: string; type: string; animated?: boolean; style?: Record<string, string | number> }[];
} {
  const sortedZones = [...diagram.zones].sort((a, b) => a.order - b.order);
  const zoneWidth = 180;
  const zoneHeight = 120;
  const gapX = 40;
  const totalWidth = sortedZones.length * zoneWidth + (sortedZones.length - 1) * gapX;
  const startX = -totalWidth / 2 + zoneWidth / 2;

  const nodes = sortedZones.map((z, i) => {
    const dNode = diagram.nodes.find((n) => n.id === `zone-${z.id}`);
    return {
      id: `zone-${z.id}`,
      type: "architectureNode",
      position: { x: startX + i * (zoneWidth + gapX), y: 0 },
      data: {
        label: z.label,
        nodeType: dNode?.type ?? "service",
        filePath: "",
        description: dNode?.description ?? "",
      },
      style: { width: `${zoneWidth}px`, height: `${zoneHeight}px` },
    };
  });

  const edges = diagram.flows.map((f) => ({
    id: f.id,
    source: f.source,
    target: f.target,
    label: f.sublabel ?? f.label,
    type: "smoothstep" as const,
    animated: f.type === "network" || f.type === "external",
    style: {
      stroke: f.type === "network" ? "#3b82f6" : f.type === "data" ? "#10b981" : f.type === "external" ? "#f59e0b" : f.type === "user" ? "#ec4899" : "#94a3b8",
    },
  }));

  return { nodes, edges };
}
