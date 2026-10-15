import { css, customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_POWER_TOYS_PANEL_CONTEXT } from "./panel.context.js";

/**
 * The frame every docked panel sits in: a header with an icon, a title, room for actions and a
 * close button, then the panel's content. With `flush`, the content area has no padding, for
 * content that scrolls edge to edge, like a chat.
 */
@customElement("power-toys-panel-layout")
export class PowerToysPanelLayoutElement extends UmbLitElement {
  @property({ type: String })
  headline = "";

  @property({ type: String })
  icon = "";

  @property({ type: Boolean, reflect: true })
  flush = false;

  #close() {
    this.getContext(UMB_POWER_TOYS_PANEL_CONTEXT).then((context) => context?.close());
  }

  override render() {
    return html`
      <header>
        <slot name="header-start"></slot>
        ${this.icon ? html`<uui-icon name=${this.icon}></uui-icon>` : ""}
        <h3>${this.headline}</h3>
        <div class="actions">
          <slot name="header-actions"></slot>
          <uui-button compact label=${this.localize.term("general_close")} @click=${this.#close}>
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </header>
      <div class="content"><slot></slot></div>
    `;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      height: 60px;
      flex: none;
      box-sizing: border-box;
      padding: 0 var(--uui-size-space-4) 0 var(--uui-size-space-5);
      border-bottom: 1px solid var(--uui-color-border);
      background: var(--uui-color-surface-alt);
    }

    h3 {
      margin: 0;
      font-weight: 600;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      margin-left: auto;
    }

    .content {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      box-sizing: border-box;
      padding: var(--uui-size-layout-1);
      background: var(--uui-color-background);
    }

    :host([flush]) .content {
      padding: 0;
      overflow: hidden;
      background: var(--uui-color-surface);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-panel-layout": PowerToysPanelLayoutElement;
  }
}
