import { css, html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { UUIInputEvent } from "@umbraco-cms/backoffice/external/uui";
import { THEME_VARIABLES } from "./theme-variables.js";
import type { ThemeMakerEditorModalData, ThemeMakerEditorModalValue } from "./theme-maker-editor-modal.token.js";

// The colour-editing sidebar for a custom theme - opened either from "Add theme" (data has no
// name/colors, so THEME_VARIABLES' own defaults are used to seed every row) or from an existing
// custom theme's "Edit" button (data carries its current name/colors).
@customElement("power-toys-theme-maker-editor-modal")
export class ThemeMakerEditorModalElement extends UmbModalBaseElement<ThemeMakerEditorModalData, ThemeMakerEditorModalValue> {
  @state()
  private _name = "";

  @state()
  private _colors: Record<string, string> = {};

  connectedCallback() {
    super.connectedCallback();
    this._name = this.data?.name ?? "";
    this._colors = {
      ...Object.fromEntries(THEME_VARIABLES.map((variable) => [variable.cssVar, variable.default])),
      ...this.data?.colors,
    };
  }

  #onSubmit = () => {
    if (!this._name.trim()) return;
    this.value = { name: this._name.trim(), colors: this._colors };
    this._submitModal();
  };

  #onColorChange = (cssVar: string, color: string) => {
    this._colors = { ...this._colors, [cssVar]: color };
  };

  #groups(): string[] {
    return [...new Set(THEME_VARIABLES.map((variable) => variable.group))];
  }

  render() {
    const valid = !!this._name.trim();
    return html`
      <umb-body-layout headline=${this.data?.name ? "Edit Theme" : "Add Theme"}>
        <uui-box>
          <umb-property-layout label="Name" orientation="horizontal">
            <uui-input
              slot="editor"
              .value=${this._name}
              placeholder="My Theme"
              @input=${(e: UUIInputEvent) => (this._name = String(e.target.value ?? ""))}>
            </uui-input>
          </umb-property-layout>
        </uui-box>

        ${this.#groups().map(
          (group) => html`
            <uui-box>
              <div slot="headline">${group}</div>
              ${THEME_VARIABLES.filter((variable) => variable.group === group).map(
                (variable) => html`
                  <umb-property-layout label=${variable.label} orientation="horizontal">
                    <div slot="editor" class="color-row">
                      <input
                        type="color"
                        .value=${this._colors[variable.cssVar] ?? variable.default}
                        @input=${(e: Event) => this.#onColorChange(variable.cssVar, (e.target as HTMLInputElement).value)}>
                      </input>
                      <uui-input
                        .value=${this._colors[variable.cssVar] ?? variable.default}
                        @input=${(e: UUIInputEvent) => this.#onColorChange(variable.cssVar, String(e.target.value ?? ""))}>
                      </uui-input>
                    </div>
                  </umb-property-layout>
                `,
              )}
            </uui-box>
          `,
        )}

        <div slot="actions">
          <uui-button label="Cancel" @click=${() => this._rejectModal()}></uui-button>
          <uui-button
            label="Save"
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

      .color-row input[type="color"] {
        flex: 0 0 auto;
        width: 36px;
        height: 36px;
        padding: 0;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: none;
        cursor: pointer;
      }

      .color-row uui-input {
        flex: 1 1 auto;
      }
    `,
  ];
}

export default ThemeMakerEditorModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-theme-maker-editor-modal": ThemeMakerEditorModalElement;
  }
}
