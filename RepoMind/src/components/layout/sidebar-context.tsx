"use client";

import * as React from "react";

interface SidebarContextValue {
  open: boolean;
  toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({ open: true, toggle: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);

  const toggle = React.useCallback(() => setOpen((v) => !v), []);

  return <SidebarContext.Provider value={{ open, toggle }}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  return React.useContext(SidebarContext);
}
