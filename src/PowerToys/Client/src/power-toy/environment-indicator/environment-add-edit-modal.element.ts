import { css, html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { UUIInputEvent } from "@umbraco-cms/backoffice/external/uui";
import type { EnvironmentAddEditModalValue } from "./environment-add-edit-modal.token.js";

const DEFAULT_COLOR = "#1b264f";

// A small standalone sidebar for entering/editing one environment's name/pattern/colour -
// opened from the settings modal, either empty (add) or pre-filled via this.value (edit).
@customElement("power-toys-environment-add-edit-modal")
export class EnvironmentAddEditModalElement extends UmbModalBaseElement<object, EnvironmentAddEditModalValue> {
  @state()
  private _name = "";

  @state()
  private _pattern = "";

  @state()
  private _color = DEFAULT_COLOR;

  get #editing() {
    return !!this.value?.name || !!this.value?.pattern;
  }

  connectedCallback() {
    super.connectedCallback();
    this._name = this.value?.name ?? "";
    this._pattern = this.value?.pattern ?? "";
    this._color = this.value?.color ?? DEFAULT_COLOR;
  }

  #onSubmit = () => {
    if (!this._name.trim() || !this._pattern.trim()) return;
    this.value = { name: this._name.trim(), pattern: this._pattern.trim(), color: this._color };
    this._submitModal();
  };

  render() {
    const valid = !!this._name.trim() && !!this._pattern.trim();
    return html`
      <umb-body-layout headline=${this.#editing ? "Edit Environment" : "Add Environment"}>
        <uui-box>
          <umb-property-layout label="Name" orientation="horizontal">
            <uui-input
              slot="editor"
              .value=${this._name}
              placeholder="Staging"
              @input=${(e: UUIInputEvent) => (this._name = String(e.target.value ?? ""))}>
            </uui-input>
          </umb-property-layout>
          <umb-property-layout label="Pattern" orientation="horizontal">
            <uui-input
              slot="editor"
              .value=${this._pattern}
              placeholder="staging\\.example\\.com|Staging"
              @input=${(e: UUIInputEvent) => (this._pattern = String(e.target.value ?? ""))}>
            </uui-input>
          </umb-property-layout>
          <p class="note">
            A regular expression tested against the current page's URL, or the server's
            environment name (e.g. <code>Development</code>, <code>Staging</code>, <code>Production</code>)
            if the URL does not match. Use alternation (<code>site1\\.|site2\\.</code>) to match more than one
            value.
          </p>
          <umb-property-layout label="Colour" orientation="horizontal">
            <div slot="editor" class="color-row">
              <input
                type="color"
                .value=${this._color}
                @input=${(e: Event) => (this._color = (e.target as HTMLInputElement).value)} />
              <uui-input
                .value=${this._color}
                @input=${(e: UUIInputEvent) => (this._color = String(e.target.value ?? ""))}>
              </uui-input>
            </div>
          </umb-property-layout>
        </uui-box>

        <div slot="actions">
          <uui-button label="Cancel" @click=${() => this._rejectModal()}></uui-button>
          <uui-button
            label=${this.#editing ? "Save" : "Add"}
            look="primary"
            color="positive"
            ?disabled=${!valid}
            @click=${this.#onSubmit}></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = [
    css`
      uui-input {
        width: 100%;
      }

      .color-row {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        width: 100%;
      }

      input[type="color"] {
        flex-shrink: 0;
        width: 2.5rem;
        height: 2rem;
        padding: 0;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: none;
      }

      .note {
        color: var(--uui-color-text-alt);
        font-style: italic;
      }

      code {
        font-family: monospace;
      }
    `,
  ];
}

export default EnvironmentAddEditModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-environment-add-edit-modal": EnvironmentAddEditModalElement;
  }
}
