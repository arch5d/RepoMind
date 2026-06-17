"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  function: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" },
  class: { bg: "#f5f3ff", border: "#8b5cf6", text: "#5b21b6" },
  interface: { bg: "#ecfdf5", border: "#10b981", text: "#065f46" },
  component: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
  api_route: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
};

function DependencyNode({ data }: NodeProps) {
  const colors = NODE_COLORS[data.symbolType as string] ?? { bg: "#f9fafb", border: "#6b7280", text: "#374151" };

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
        <div>{data.symbolType as string}</div>
        {(data.exported as boolean) && (
          <span style={{ color: "#10b981", fontSize: 10 }}>exported</span>
        )}
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
        <div style={{ color: "#94a3b8", fontSize: 10 }}>
          depth {data.depth as number}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />
    </div>
  );
}

export default memo(DependencyNode);
