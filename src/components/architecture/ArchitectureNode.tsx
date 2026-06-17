"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  api_route: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" },
  component: { bg: "#f5f3ff", border: "#8b5cf6", text: "#5b21b6" },
  service: { bg: "#ecfdf5", border: "#10b981", text: "#065f46" },
  utility: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
  database: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
  external_dependency: { bg: "#f9fafb", border: "#6b7280", text: "#374151" },
};

function ArchitectureNode({ data }: NodeProps) {
  const colors = NODE_COLORS[data.nodeType as string] ?? NODE_COLORS.external_dependency!;

  return (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 8,
        padding: "10px 16px",
        minWidth: 160,
        maxWidth: 240,
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.border }} />
      <div style={{ fontWeight: 600, color: colors.text, marginBottom: 4, fontSize: 13 }}>
        {data.label as string}
      </div>
      <div style={{ color: "#64748b", fontSize: 11 }}>
        <div>{data.nodeType as string}</div>
        <div
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 200,
          }}
          title={data.filePath as string}
        >
          {(data.filePath as string).split("/").pop()}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />
    </div>
  );
}

export default memo(ArchitectureNode);
