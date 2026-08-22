import {
  LitElement,
  css,
  html,
  customElement,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ManifestPowerToy } from "./power-toy.extension.js";
import type { UmbPowerToyElement } from "./power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "./power-toy.context.js";

// The standard wrapper every power toy is shown in on the dashboard: an icon + name header,
// an enable/disable toggle in the top-right, and a body the power toy fully controls.
@customElement("power-toys-card")
export class PowerToysCardElement extends UmbElementMixin(LitElement) {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _enabled = true;

  @state()
  private _enabledLocked = false;

  #powerToyContext?: UmbPowerToyContext;

  constructor() {
    super();
    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      this.#loadEnabled();
    });
  }

  async #loadEnabled() {
    if (!this.manifest?.alias || !this.#powerToyContext) return;
    const [enabled, locked] = await Promise.all([
      this.#powerToyContext.isEnabled(this.manifest.alias),
      this.#powerToyContext.isEnabledLocked(this.manifest.alias),
    ]);
    this._enabled = enabled;
    this._enabledLocked = locked;
  }

  updated() {
    this.#applyEnabled();
  }

  #onToggle = (e: Event) => {
    if (this._enabledLocked) return;
    this._enabled = (e.target as HTMLInputElement).checked;
    if (this.manifest?.alias) {
      this.#powerToyContext?.setEnabled(this.manifest.alias, this._enabled);
    }
  };

  #onSlotChange = () => this.#applyEnabled();

  #applyEnabled() {
    this.renderRoot
      .querySelector("slot")
      ?.assignedElements()
      .forEach((el) => ((el as UmbPowerToyElement).enabled = this._enabled));
  }

  render() {
    return html`
      <uui-box>
        <div slot="headline">
          <uui-icon name=${this.manifest?.meta.icon ?? "icon-plugin"}></uui-icon>
          ${this.manifest?.meta.label}
        </div>
        <uui-toggle
          slot="header-actions"
          label="Enable this power toy"
          label-position="left"
          ?disabled=${this._enabledLocked}
          title=${this._enabledLocked ? "Managed via appsettings.json" : ""}
          .checked=${this._enabled}
          @change=${this.#onToggle}>
        </uui-toggle>
        <div id="body" class=${this._enabled ? "" : "disabled"}>
          <slot @slotchange=${this.#onSlotChange}></slot>
        </div>
      </uui-box>
    `;
  }

  static styles = [
    css`
      uui-box {
        height: 100%;
      }

      /* Disabled power toys stay visible - just visibly greyed out - rather than
         disappearing, so people can still see what the power toy is. */
      #body.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `,
  ];
}

export default PowerToysCardElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-card": PowerToysCardElement;
  }
}
