"use client";

import * as React from "react";
import { Settings, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ModelOption {
  id: string;
  label: string;
}

interface SettingsData {
  chatModel: string;
  embedModel: string;
}

export function SettingsDialog() {
  const [open, setOpen] = React.useState(false);
  const [chatModels, setChatModels] = React.useState<ModelOption[]>([]);
  const [embedModels, setEmbedModels] = React.useState<ModelOption[]>([]);
  const [current, setCurrent] = React.useState<SettingsData | null>(null);
  const [selectedChat, setSelectedChat] = React.useState("");
  const [selectedEmbed, setSelectedEmbed] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    fetch(`${API_BASE}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setChatModels(data.data.chatModels ?? []);
          setEmbedModels(data.data.embedModels ?? []);
          setCurrent(data.data.settings);
          setSelectedChat(data.data.settings.chatModel);
          setSelectedEmbed(data.data.settings.embedModel);
        }
      })
      .catch(() => {});
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatModel: selectedChat, embedModel: selectedEmbed }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
      >
        <Settings className="h-4 w-4 shrink-0" />
        Settings
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Model Settings</h2>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>

            {current && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Chat Model</label>
                  <select
                    value={selectedChat}
                    onChange={(e) => setSelectedChat(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {chatModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Embedding Model</label>
                  <select
                    value={selectedEmbed}
                    onChange={(e) => setSelectedEmbed(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {embedModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
                    ))}
                  </select>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saved ? <><Check className="mr-2 h-4 w-4" /> Saved</> : saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
