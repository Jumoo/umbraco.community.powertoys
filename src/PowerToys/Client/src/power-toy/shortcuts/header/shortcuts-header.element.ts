import { UmbHeaderAppButtonElement } from "@umbraco-cms/backoffice/components";
import { css, customElement, html, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_POWER_TOYS_PANEL_CONTEXT } from "../../shared/panel/panel.context.js";

// The header button for the keyboard shortcuts panel
@customElement("power-toys-shortcuts-header-app")
export class ShortcutsHeaderAppElement extends UmbHeaderAppButtonElement {
  @state()
  private _open = false;

  constructor() {
    super();

    this.consumeContext(UMB_POWER_TOYS_PANEL_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.isOpen("shortcuts"), (open) => (this._open = open), "_open");
    });
  }

  override render() {
    return html`
      <uui-button
        look="primary"
        class=${this._open ? "open" : ""}
        label=${this.localize.term("powerToysShortcuts_title")}
        aria-pressed=${this._open ? "true" : "false"}
        compact
        @click=${this.#onClick}
      >
        <uui-icon name="icon-keyboard"></uui-icon>
      </uui-button>
    `;
  }

  async #onClick() {
    const panel = await this.getContext(UMB_POWER_TOYS_PANEL_CONTEXT);
    panel?.toggle("shortcuts");
  }

  static override readonly styles = [
    ...UmbHeaderAppButtonElement.styles,
    css`
      /* Shows which header button's panel is open beside the page */
      uui-button.open uui-icon {
        color: var(--uui-color-current);
      }
    `,
  ];
}

export default ShortcutsHeaderAppElement;
