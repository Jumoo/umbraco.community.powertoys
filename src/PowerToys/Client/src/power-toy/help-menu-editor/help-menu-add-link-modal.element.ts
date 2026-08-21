import { css, html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, umbOpenModal } from "@umbraco-cms/backoffice/modal";
import { UMB_ICON_PICKER_MODAL } from "@umbraco-cms/backoffice/icon";
import type { UUIInputEvent } from "@umbraco-cms/backoffice/external/uui";
import type { HelpMenuAddLinkModalValue } from "./help-menu-add-link-modal.token.js";

const DEFAULT_ICON = "icon-link";

// A small standalone sidebar for entering a new help menu link's name/URL/icon - opened
// from the settings modal's "Add link" button via HELP_MENU_ADD_LINK_MODAL.
@customElement("power-toys-help-menu-add-link-modal")
export class HelpMenuAddLinkModalElement extends UmbModalBaseElement<object, HelpMenuAddLinkModalValue> {
  @state()
  private _name = "";

  @state()
  private _href = "";

  @state()
  private _icon = DEFAULT_ICON;

  connectedCallback() {
    super.connectedCallback();
    this._name = this.value?.name ?? "";
    this._href = this.value?.href ?? "";
    this._icon = this.value?.icon ?? DEFAULT_ICON;
  }

  #onSubmit = () => {
    if (!this._name.trim() || !this._href.trim()) return;
    this.value = { name: this._name.trim(), href: this._href.trim(), icon: this._icon };
    this._submitModal();
  };

  async #pickIcon() {
    const data = await umbOpenModal(this, UMB_ICON_PICKER_MODAL, {
      value: { icon: this._icon, color: undefined },
      data: { placeholder: DEFAULT_ICON, showEmptyOption: false, hideColors: true },
    }).catch(() => undefined);

    if (data?.icon) this._icon = data.icon;
  }

  render() {
    const valid = !!this._name.trim() && !!this._href.trim();
    return html`
      <umb-body-layout headline="Add Help Menu Link">
        <uui-box>
          <umb-property-layout label="Name" orientation="horizontal">
            <uui-input
              slot="editor"
              .value=${this._name}
              placeholder="Umbraco Docs"
              @input=${(e: UUIInputEvent) => (this._name = String(e.target.value ?? ""))}>
            </uui-input>
          </umb-property-layout>
          <umb-property-layout label="URL" orientation="horizontal">
            <uui-input
              slot="editor"
              type="url"
              .value=${this._href}
              placeholder="https://docs.umbraco.com"
              @input=${(e: UUIInputEvent) => (this._href = String(e.target.value ?? ""))}>
            </uui-input>
          </umb-property-layout>
          <umb-property-layout label="Icon" orientation="horizontal">
            <uui-button slot="editor" compact look="outline" label="Pick icon" @click=${() => this.#pickIcon()}>
              <uui-icon name=${this._icon}></uui-icon>
            </uui-button>
          </umb-property-layout>
        </uui-box>

        <div slot="actions">
          <uui-button label="Cancel" @click=${() => this._rejectModal()}></uui-button>
          <uui-button
            label="Add"
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
    `,
  ];
}

export default HelpMenuAddLinkModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-help-menu-add-link-modal": HelpMenuAddLinkModalElement;
  }
}
