import type { UmbEntryPointOnInit, UmbEntryPointOnUnload } from "@umbraco-cms/backoffice/extension-api";
import "./dock-panel.element.js";

let dock: HTMLElement | null = null;

// Adds the docked side panel to the backoffice shell once, as the Umbraco AI Copilot does with
// its sidebar. It sits inside the shell, so the global contexts (chat, tasks) reach it.
export const onInit: UmbEntryPointOnInit = (host) => {
  dock = document.createElement("power-toys-dock-panel");
  host.shadowRoot?.appendChild(dock);
};

export const onUnload: UmbEntryPointOnUnload = () => {
  dock?.remove();
  dock = null;
};
