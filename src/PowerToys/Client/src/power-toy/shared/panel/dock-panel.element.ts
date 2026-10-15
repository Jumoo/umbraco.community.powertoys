import { css, customElement, html, nothing, state, unsafeCSS } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { PowerToyEnabledController } from "../power-toy-enabled.js";
import { UMB_POWER_TOYS_PANEL_CONTEXT, type PowerToysPanelContext, type PowerToysPanelName } from "./panel.context.js";

const PANEL_WIDTH = 450;

// What each panel shows, the power toy it belongs to, and how to load its element
const PANELS: Record<PowerToysPanelName, { tag: string; alias: string; load: () => Promise<unknown> }> = {
  chat: {
    tag: "power-toys-chat-panel",
    alias: "PowerToys.PowerToy.Chat",
    load: () => import("../../chat/panel/chat-panel.element.js"),
  },
  tasks: {
    tag: "power-toys-tasks-panel",
    alias: "PowerToys.PowerToy.Tasks",
    load: () => import("../../tasks/panel/tasks-panel.element.js"),
  },
};

/**
 * The side panel docked beside the backoffice, the way the Umbraco AI Copilot's is: it pushes
 * the page over rather than covering it, so editors can keep moving around the site with chat
 * or tasks open. Added once by the entry point; shows whichever panel is open.
 */
@customElement("power-toys-dock-panel")
export class PowerToysDockPanelElement extends UmbLitElement {
  @state()
  private _active?: PowerToysPanelName;

  // The panel still showing while the dock slides out
  @state()
  private _shown?: PowerToysPanelName;

  #context?: PowerToysPanelContext;

  constructor() {
    super();

    this.consumeContext(UMB_POWER_TOYS_PANEL_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(
        context.active,
        async (active) => {
          const name = active as PowerToysPanelName | undefined;
          if (name) {
            await PANELS[name].load();
            this._shown = name;
          }
          this._active = name;
          this.#pushContent(!!name);
        },
        "_active"
      );
    });

    // A panel closes when its power toy is turned off
    for (const [name, panel] of Object.entries(PANELS) as [PowerToysPanelName, (typeof PANELS)[PowerToysPanelName]][]) {
      new PowerToyEnabledController(this, panel.alias, (enabled) => {
        if (!enabled) this.#context?.close(name);
      });
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#pushContent(false);
  }

  // Makes room for the panel by pushing the whole page over, as the Copilot does
  #pushContent(open: boolean) {
    document.body.style.transition = "margin-inline-end 0.3s ease";
    document.body.style.marginInlineEnd = open ? `${PANEL_WIDTH}px` : "";
  }

  #onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && this._active) {
      e.stopPropagation();
      this.#context?.close();
    }
  }

  #onTransitionEnd(e: TransitionEvent) {
    if (e.propertyName === "transform" && !this._active) this._shown = undefined;
  }

  #renderPanel() {
    switch (this._shown) {
      case "chat":
        return html`<power-toys-chat-panel></power-toys-chat-panel>`;
      case "tasks":
        return html`<power-toys-tasks-panel></power-toys-tasks-panel>`;
      default:
        return nothing;
    }
  }

  override render() {
    return html`
      <aside
        class=${this._active ? "open" : ""}
        role="complementary"
        aria-hidden=${this._active ? "false" : "true"}
        @keydown=${this.#onKeydown}
        @transitionend=${this.#onTransitionEnd}
      >
        ${this.#renderPanel()}
      </aside>
    `;
  }

  static override styles = css`
    :host {
      display: contents;
    }

    aside {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: ${unsafeCSS(PANEL_WIDTH)}px;
      max-width: 90vw;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      background: var(--uui-color-surface);
      border-left: 1px solid var(--uui-color-border);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      z-index: 1000;
    }

    aside.open {
      transform: translateX(0);
    }

    aside > * {
      flex: 1 1 auto;
      min-height: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-dock-panel": PowerToysDockPanelElement;
  }
}
