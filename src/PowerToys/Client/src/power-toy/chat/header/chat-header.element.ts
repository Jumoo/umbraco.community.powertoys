import { UmbHeaderAppButtonElement } from "@umbraco-cms/backoffice/components";
import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_POWER_TOYS_PANEL_CONTEXT } from "../../shared/panel/panel.context.js";
import { CHAT_CONTEXT } from "../global/chat.context.token";
import { formatBadgeCount } from "../constants";

@customElement("power-toys-chat-header-app")
export class ChatHeaderAppElement extends UmbHeaderAppButtonElement {
  @state()
  private _unread = 0;

  @state()
  private _mentions = 0;

  @state()
  private _open = false;

  constructor() {
    super();

    this.consumeContext(CHAT_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.totalUnread, (total) => (this._unread = total), "_unread");
      this.observe(context.totalMentions, (total) => (this._mentions = total), "_mentions");
    });

    this.consumeContext(UMB_POWER_TOYS_PANEL_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.isOpen("chat"), (open) => (this._open = open), "_open");
    });
  }

  override render() {
    return html`
      <uui-button
        look="primary"
        class=${this._open ? "open" : ""}
        label=${this.localize.term("powerToysChat_chat")}
        aria-pressed=${this._open ? "true" : "false"}
        compact
        @click=${this.#onClick}
      >
        <uui-icon name="icon-chat"></uui-icon>
        ${this.#renderBadge()}
      </uui-button>
    `;
  }

  // A mention outranks general chatter, so it gets the stronger colour
  #renderBadge() {
    if (this._unread === 0) return nothing;

    return html`<uui-badge
      color=${this._mentions > 0 ? "danger" : "default"}
      ?attention=${this._mentions > 0}
      label=${this.localize.term("powerToysChat_unreadCount", this._unread)}
      >${formatBadgeCount(this._unread)}</uui-badge
    >`;
  }

  async #onClick() {
    const panel = await this.getContext(UMB_POWER_TOYS_PANEL_CONTEXT);
    panel?.toggle("chat");
  }

  static override readonly styles = [
    ...UmbHeaderAppButtonElement.styles,
    css`
      uui-badge {
        font-size: var(--uui-type-small-size);
      }

      /* Shows which header button's panel is open beside the page */
      uui-button.open uui-icon {
        color: var(--uui-color-current);
      }
    `,
  ];
}

export default ChatHeaderAppElement;
