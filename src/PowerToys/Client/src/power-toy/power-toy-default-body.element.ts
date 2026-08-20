import { LitElement, css, html, customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { ManifestPowerToy } from "./power-toy.extension.js";
import { POWER_TOY_MODAL } from "./power-toy-modal.token.js";

// The fallback body for a power toy that doesn't declare its own js/element - just the
// description from its manifest, plus (if the manifest declares meta.modal) a click to
// open it in a modal. Lets a power toy be "just a manifest" with no scaffolding at all.
@customElement("power-toys-default-body")
export class PowerToysDefaultBodyElement extends UmbElementMixin(LitElement) {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @property({ type: Boolean })
  enabled = true;

  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  #onClick = () => {
    const modal = this.manifest?.meta.modal;
    if (!this.enabled || !modal || !this.manifest) return;
    this.#modalManager?.open(this, POWER_TOY_MODAL, {
      data: { manifest: this.manifest },
      // Sidebar type is fixed - only the size is a power toy's to override, defaulting to "small".
      modal: modal.size ? { size: modal.size } : undefined,
    });
  };

  render() {
    const clickable = !!this.manifest?.meta.modal;
    return html`
      <div class=${clickable ? "clickable" : ""} @click=${this.#onClick}>
        <p>${this.manifest?.meta.description}</p>
      </div>
    `;
  }

  static styles = [
    css`
      .clickable {
        cursor: pointer;
      }
    `,
  ];
}

export default PowerToysDefaultBodyElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-default-body": PowerToysDefaultBodyElement;
  }
}
