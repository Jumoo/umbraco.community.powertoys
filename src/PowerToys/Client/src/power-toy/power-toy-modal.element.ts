import { css, customElement, html, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { createExtensionElement } from "@umbraco-cms/backoffice/extension-api";
import type { PowerToyModalData } from "./power-toy-modal.token.js";

// Loads whatever element the power toy's manifest.meta.modal points at - the one modal
// implementation shared by every power toy that relies on the default box's click behaviour.
@customElement("power-toys-modal")
export class PowerToysModalElement extends UmbModalBaseElement<PowerToyModalData, undefined> {
  @state()
  private _content?: HTMLElement;

  connectedCallback() {
    super.connectedCallback();
    this.#loadContent();
  }

  async #loadContent() {
    const manifest = this.data?.manifest;
    const modal = manifest?.meta.modal;
    if (!manifest || !modal) return;

    this._content = await createExtensionElement({
      type: "powerToyModal",
      alias: `${manifest.alias}.Modal`,
      name: `${manifest.meta.label} Modal`,
      element: modal.element,
    });

    if (this._content) {
      (this._content as { manifest?: unknown }).manifest = manifest;
    }
  }

  render() {
    return html`
      <umb-body-layout headline=${this.data?.manifest.meta.label ?? ""}>
        ${this._content}
        <div slot="actions">
          <uui-button label="Cancel" @click=${() => this._rejectModal()}></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = [css``];
}

export default PowerToysModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-modal": PowerToysModalElement;
  }
}
