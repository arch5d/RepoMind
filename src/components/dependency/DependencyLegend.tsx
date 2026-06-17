"use client";

const NODE_TYPES = [
  { type: "function", label: "Function", color: "#3b82f6" },
  { type: "class", label: "Class", color: "#8b5cf6" },
  { type: "interface", label: "Interface", color: "#10b981" },
  { type: "component", label: "Component", color: "#f59e0b" },
  { type: "api_route", label: "API Route", color: "#ef4444" },
];

const EDGE_TYPES = [
  { type: "imports", label: "Imports", color: "#94a3b8", dash: "" },
  { type: "extends", label: "Extends", color: "#f59e0b", dash: "5,5" },
  { type: "implements", label: "Implements", color: "#10b981", dash: "3,3" },
  { type: "calls", label: "Calls (animated)", color: "#3b82f6", dash: "" },
];

export function DependencyLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "12px 16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        fontSize: 12,
        zIndex: 10,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, color: "#334155" }}>Legend</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 500, color: "#64748b", marginBottom: 4, fontSize: 11 }}>Nodes</div>
        {NODE_TYPES.map((nt) => (
          <div key={nt.type} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: nt.color,
                display: "inline-block",
              }}
            />
            <span style={{ color: "#475569" }}>{nt.label}</span>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontWeight: 500, color: "#64748b", marginBottom: 4, fontSize: 11 }}>Edges</div>
        {EDGE_TYPES.map((et) => (
          <div key={et.type} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <svg width="20" height="4" viewBox="0 0 20 4">
              <line
                x1="0" y1="2" x2="20" y2="2"
                stroke={et.color}
                strokeWidth="2"
                strokeDasharray={et.dash || "none"}
              />
            </svg>
            <span style={{ color: "#475569" }}>{et.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
