import { LitElement, css, html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import {
  ENVIRONMENT_INDICATOR_CONTEXT,
  type EnvironmentIndicatorContext,
} from "./environment-indicator.context.js";
import type { EnvironmentDefinition } from "./environment-indicator-settings.js";

// The colour swap itself is applied globally by EnvironmentIndicatorContext as soon as it's
// constructed - this header app only adds the optional name label next to it, same slot the
// navbar clock uses.
@customElement("power-toys-environment-indicator")
export class PowerToysEnvironmentIndicatorElement extends UmbElementMixin(LitElement) {
  @state()
  private _match?: EnvironmentDefinition;

  @state()
  private _showName = true;

  constructor() {
    super();
    this.consumeContext(ENVIRONMENT_INDICATOR_CONTEXT, (context: EnvironmentIndicatorContext | undefined) => {
      if (!context) return;
      this.observe(context.observeMatch(), (match) => {
        this._match = match;
      });
      this.observe(context.observeSettings(), (settings) => {
        this._showName = settings.showNameInHeader;
      });
    });
  }

  render() {
    if (!this._match || !this._showName) return html``;
    return html`<span class="badge">${this._match.name}</span>`;
  }

  static styles = [
    css`
      :host {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        padding: 0 var(--uui-size-space-4);
        white-space: nowrap;
      }

      /* Bordered pill rather than plain text - the header can be any colour an environment
         picks, so the label needs its own outline to read clearly against all of them. */
      .badge {
        padding: var(--uui-size-space-1) var(--uui-size-space-4);
        border: 1px solid var(--uui-color-header-contrast);
        border-radius: var(--uui-border-radius);
        font-weight: 700;
        color: var(--uui-color-header-contrast);
      }
    `,
  ];
}

export default PowerToysEnvironmentIndicatorElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-environment-indicator": PowerToysEnvironmentIndicatorElement;
  }
}
