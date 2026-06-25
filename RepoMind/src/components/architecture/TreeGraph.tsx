"use client";

import { useMemo } from "react";
import Highcharts from "highcharts";
import treemapInit from "highcharts/modules/treemap";
import treegraphInit from "highcharts/modules/treegraph";
import HighchartsReact from "highcharts-react-official";

if (typeof treemapInit === "function") {
  (treemapInit as (h: typeof Highcharts) => void)(Highcharts);
}
if (typeof treegraphInit === "function") {
  (treegraphInit as (h: typeof Highcharts) => void)(Highcharts);
}

interface TreeGraphNode {
  id: string;
  label: string;
  type: string;
  filePath: string;
  module: string;
  exported: boolean;
}

interface TreeGraphEdge {
  source: string;
  target: string;
  type: string;
}

interface TreeGraphProps {
  nodes: TreeGraphNode[];
  edges: TreeGraphEdge[];
}

const NODE_COLORS: Record<string, string> = {
  api_route: "#3b82f6",
  component: "#8b5cf6",
  service: "#10b981",
  utility: "#f59e0b",
  database: "#ef4444",
  external_dependency: "#6b7280",
};

const NODE_TYPE_LABELS: Record<string, string> = {
  api_route: "API Route",
  component: "Component",
  service: "Service",
  utility: "Utility",
  database: "Database",
  external_dependency: "External",
};

export function TreeGraph({ nodes, edges }: TreeGraphProps) {
  const chartOptions = useMemo(() => {
    const data = nodes.map((n) => {
      const parentEdge = edges.find((e) => e.target === n.id);
      return {
        id: n.id,
        name: n.label,
        parent: parentEdge?.source ?? undefined,
        color: NODE_COLORS[n.type] ?? "#6b7280",
        custom: {
          nodeType: n.type,
          typeLabel: NODE_TYPE_LABELS[n.type] ?? n.type,
          module: n.module,
          filePath: n.filePath,
          exported: n.exported,
        },
      };
    });

    return {
      chart: {
        height: 600,
        backgroundColor: "transparent",
      },
      title: { text: undefined },
      series: [
        {
          type: "treegraph",
          data,
          dataLabels: {
            format: "{point.name}",
            style: {
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
              textOutline: "none",
            },
          },
          tooltip: {
            pointFormat: "<b>{point.name}</b><br/>Type: {point.custom.typeLabel}<br/>Module: {point.custom.module}<br/>File: {point.custom.filePath}<br/>Exported: {point.custom.exported}",
          },
          marker: {
            symbol: "rect",
            width: 14,
            height: 14,
            fillOpacity: 1,
          },
          link: {
            type: "curved",
            lineWidth: 1.5,
            color: "#94a3b8",
          },
          collapsed: false,
          nodeWidth: 160,
          borderRadius: 6,
          levels: [
            {
              level: 0,
              color: "#0ea5e9",
              dataLabels: {
                color: "#ffffff",
                style: { fontWeight: "bold", fontSize: "12px" },
              },
            },
          ],
        },
      ],
      credits: { enabled: false },
    };
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div
        style={{
          height: 400,
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

  return <HighchartsReact highcharts={Highcharts} options={chartOptions} />;
}
