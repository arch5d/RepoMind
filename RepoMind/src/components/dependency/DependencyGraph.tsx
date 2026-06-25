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
import DependencyNode from "./DependencyNode";
import { DependencyLegend } from "./DependencyLegend";
import type { ReactFlowNode, ReactFlowEdge } from "@/types/graph";

const nodeTypes: NodeTypes = {
  dependencyNode: DependencyNode,
};

interface DependencyGraphProps {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  loading?: boolean;
  error?: string | null;
  tracePath?: string | null;
}

export function DependencyGraph({
  nodes: initialNodes,
  edges: initialEdges,
  loading,
  error,
  tracePath,
}: DependencyGraphProps) {
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
        Loading dependency graph...
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
        No dependency data available. Parse the repository first.
      </div>
    );
  }

  return (
    <div style={{ height: 600, border: "1px solid #e2e8f0", borderRadius: 8, position: "relative" }}>
      {tracePath && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 11,
            zIndex: 10,
            maxWidth: 300,
            maxHeight: 200,
            overflow: "auto",
            fontFamily: "ui-monospace, monospace",
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#334155" }}>Execution Path</div>
          {tracePath}
        </div>
      )}
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
            const type = (n.data as Record<string, unknown>).symbolType as string;
            const colors: Record<string, string> = {
              function: "#3b82f6",
              class: "#8b5cf6",
              interface: "#10b981",
              component: "#f59e0b",
              api_route: "#ef4444",
              module: "#06b6d4",
              file: "#22c55e",
            };
            return colors[type] ?? "#6b7280";
          }}
        />
      </ReactFlow>
      <DependencyLegend />
    </div>
  );
}
