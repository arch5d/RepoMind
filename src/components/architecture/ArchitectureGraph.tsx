"use client";

import { useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ArchitectureNode from "./ArchitectureNode";
import { ArchitectureLegend } from "./ArchitectureLegend";
import type { ReactFlowNode, ReactFlowEdge } from "@/lib/architecture/react-flow";

const nodeTypes: NodeTypes = {
  architectureNode: ArchitectureNode,
};

interface ArchitectureGraphProps {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  loading?: boolean;
  error?: string | null;
}

export function ArchitectureGraph({ nodes: initialNodes, edges: initialEdges, loading, error }: ArchitectureGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (loading) {
    return (
      <div
        style={{
          height: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontSize: 14,
          border: "1px solid #e2e8f0",
          borderRadius: 8,
        }}
      >
        Loading architecture graph...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontSize: 14,
          border: "1px solid #e2e8f0",
          borderRadius: 8,
        }}
      >
        {error}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div
        style={{
          height: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontSize: 14,
          border: "1px solid #e2e8f0",
          borderRadius: 8,
        }}
      >
        No architecture data available. Parse the repository first.
      </div>
    );
  }

  return (
    <div style={{ height: 600, border: "1px solid #e2e8f0", borderRadius: 8, position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#f1f5f9" gap={20} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            const type = (n.data as Record<string, unknown>).nodeType as string;
            const colors: Record<string, string> = {
              api_route: "#3b82f6",
              component: "#8b5cf6",
              service: "#10b981",
              utility: "#f59e0b",
              database: "#ef4444",
            };
            return colors[type] ?? "#6b7280";
          }}
        />
      </ReactFlow>
      <ArchitectureLegend />
    </div>
  );
}
