import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { UUIInputEvent } from "@umbraco-cms/backoffice/external/uui";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { ICON_COLORS_CONTEXT, type IconColorsContext } from "./icon-colors.context.js";
import {
  DEFAULT_ICON_COLORS_SETTINGS,
  V13_ICON_COLORS,
  customColorAlias,
  withDefaults,
  type CustomIconColor,
  type IconColorsSettings,
} from "./icon-colors-settings.js";

// Loaded into the shared power-toys-modal - the v13 colours toggle and an inline list of custom
// colours. Pending changes stay local until the modal's Save button calls save(), which is when
// new colours get their alias and everything is persisted and applied.
@customElement("power-toys-icon-colors-modal")
export class IconColorsModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: IconColorsSettings = DEFAULT_ICON_COLORS_SETTINGS;

  @state()
  private _supported = true;

  #context?: IconColorsContext;

  constructor() {
    super();
    this.consumeContext(ICON_COLORS_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this._supported = context.isSupported;
      this.observe(context.observeSettings(), (settings) => {
        this._settings = withDefaults(settings);
      });
    });
  }

  async save(): Promise<void> {
    // New rows have no alias yet - give them one from their name now, so a colour renamed
    // before its first save still gets a sensible alias, and one renamed later keeps its own.
    const taken: string[] = [];
    const customColors = this._settings.customColors.map((color, index) => {
      const name = color.name.trim() || `Colour ${index + 1}`;
      const alias = color.alias || customColorAlias(name, [...taken, ...this.#savedAliases()]);
      taken.push(alias);
      return { ...color, name, alias };
    });
    await this.#context?.save({ ...this._settings, customColors });
  }

  #savedAliases(): string[] {
    return this._settings.customColors.map((color) => color.alias).filter(Boolean);
  }

  #onAddColor = () => {
    this._settings = {
      ...this._settings,
      customColors: [...this._settings.customColors, { alias: "", name: "", color: "#7B2CBF" }],
    };
  };

  #onChangeColor = (index: number, change: Partial<CustomIconColor>) => {
    this._settings = {
      ...this._settings,
      customColors: this._settings.customColors.map((color, i) => (i === index ? { ...color, ...change } : color)),
    };
  };

  #onRemoveColor = (index: number) => {
    this._settings = {
      ...this._settings,
      customColors: this._settings.customColors.filter((_, i) => i !== index),
    };
  };

  #renderColor(color: CustomIconColor, index: number) {
    return html`
      <div class="color-row">
        <uui-icon name="icon-document" style="--uui-icon-color: ${color.color}"></uui-icon>
        <input
          type="color"
          .value=${color.color}
          @input=${(e: Event) => this.#onChangeColor(index, { color: (e.target as HTMLInputElement).value })}>
        </input>
        <uui-input
          class="hex"
          label="Colour"
          .value=${color.color}
          @input=${(e: UUIInputEvent) => this.#onChangeColor(index, { color: String(e.target.value ?? "") })}>
        </uui-input>
        <uui-input
          class="name"
          label="Name"
          placeholder="Name"
          .value=${color.name}
          @input=${(e: UUIInputEvent) => this.#onChangeColor(index, { name: String(e.target.value ?? "") })}>
        </uui-input>
        <uui-button compact label="Remove" @click=${() => this.#onRemoveColor(index)}>
          <uui-icon name="icon-trash"></uui-icon>
        </uui-button>
      </div>
    `;
  }

  render() {
    if (!this._supported) {
      return html`
        <uui-box>
          <p class="note">
            This version of Umbraco doesn't expose its icon colour table, so Icon Colors can't change the
            icon picker's colours.
          </p>
        </uui-box>
      `;
    }

    return html`
      <uui-box>
        <div slot="headline">Umbraco 13 Colours</div>
        <umb-property-layout
          label="Use Umbraco 13 colours"
          description="Swap the picker's colours for the 19 icon colours from Umbraco 13, at their old values. Icons picked in Umbraco 13 get their own colour back."
          orientation="horizontal">
          <uui-toggle
            slot="editor"
            .checked=${this._settings.useV13Colors}
            @change=${(e: Event) =>
              (this._settings = { ...this._settings, useV13Colors: (e.target as HTMLInputElement).checked })}>
          </uui-toggle>
        </umb-property-layout>
        <div class="swatches">
          ${V13_ICON_COLORS.map(
            (color) => html`<span class="swatch" title=${color.name} style="background: ${color.color}"></span>`,
          )}
        </div>
      </uui-box>

      <uui-box>
        <div slot="headline">Custom Colours</div>
        <p class="note">Added to the end of the icon picker's colours.</p>
        ${this._settings.customColors.map((color, index) => this.#renderColor(color, index))}
        <uui-button look="placeholder" label="Add colour" @click=${this.#onAddColor}>
          <uui-icon name="icon-add"></uui-icon>
          Add colour
        </uui-button>
      </uui-box>

      <uui-box class="info-box">
        <p class="note">
          Icons already on screen when you save may need a page refresh to show a changed Umbraco 13 colour.
          Removing a custom colour, or this power toy, leaves icons using it in the default colour.
        </p>
      </uui-box>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      uui-button[look="placeholder"] {
        width: 100%;
        margin-top: var(--uui-size-space-3);
      }

      .swatches {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-1);
      }

      .swatch {
        width: 20px;
        height: 20px;
        border-radius: var(--uui-border-radius);
      }

      .color-row {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        margin-bottom: var(--uui-size-space-2);
      }

      .color-row > uui-icon {
        font-size: 20px;
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

      .color-row .hex {
        flex: 0 0 100px;
      }

      .color-row .name {
        flex: 1 1 auto;
      }

      .note {
        color: var(--uui-color-text-alt);
        font-style: italic;
      }

      .info-box .note {
        margin: 0;
      }
    `,
  ];
}

export default IconColorsModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-icon-colors-modal": IconColorsModalElement;
  }
}
