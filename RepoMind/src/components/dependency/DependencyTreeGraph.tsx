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

interface DepTreeNode {
  id: string;
  label: string;
  symbolType: string;
  filePath: string;
  module: string;
  exported: boolean;
}

interface DepTreeEdge {
  source: string;
  target: string;
  relationship: string;
}

interface DependencyTreeGraphProps {
  nodes: DepTreeNode[];
  edges: DepTreeEdge[];
}

const NODE_COLORS: Record<string, string> = {
  function: "#3b82f6",
  class: "#8b5cf6",
  interface: "#10b981",
  component: "#f59e0b",
  api_route: "#ef4444",
  type: "#6b7280",
  file: "#06b6d4",
  module: "#0ea5e9",
};

const SYMBOL_TYPE_LABELS: Record<string, string> = {
  function: "Function",
  class: "Class",
  interface: "Interface",
  component: "Component",
  api_route: "API Route",
  type: "Type",
  file: "File",
  module: "Module",
};

export function DependencyTreeGraph({ nodes, edges }: DependencyTreeGraphProps) {
  const chartOptions = useMemo(() => {
    const data = nodes.map((n) => {
      const parentEdge = edges.find((e) => e.target === n.id);
      return {
        id: n.id,
        name: n.label,
        parent: parentEdge?.source ?? undefined,
        color: NODE_COLORS[n.symbolType] ?? "#6b7280",
        custom: {
          symbolType: n.symbolType,
          typeLabel: SYMBOL_TYPE_LABELS[n.symbolType] ?? n.symbolType,
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
          type: "treegraph" as const,
          data,
          dataLabels: {
            format: "{point.name}",
            style: {
              fontSize: "10px",
              fontFamily: "ui-monospace, monospace",
              textOutline: "none",
            },
          },
          tooltip: {
            pointFormat:
              "<b>{point.name}</b><br/>" +
              "Type: {point.custom.typeLabel}<br/>" +
              "Module: {point.custom.module}<br/>" +
              "File: {point.custom.filePath}<br/>" +
              "Exported: {point.custom.exported}",
          },
          marker: {
            symbol: "rect",
            width: 12,
            height: 12,
            fillOpacity: 1,
          },
          link: {
            type: "curved",
            lineWidth: 1.5,
            color: "#94a3b8",
          },
          collapsed: false,
          nodeWidth: 140,
          borderRadius: 4,
          levels: [
            {
              level: 0,
              color: "#0ea5e9",
              dataLabels: {
                color: "#ffffff",
                style: { fontWeight: "bold", fontSize: "11px" },
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
      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
        No symbol dependency data available. Parse the repository first.
      </div>
    );
  }

  return <HighchartsReact highcharts={Highcharts} options={chartOptions} />;
}
