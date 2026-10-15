import { UmbHeaderAppButtonElement } from "@umbraco-cms/backoffice/components";
import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { CHAT_MODAL } from "../modal/chat-modal.token";
import { CHAT_CONTEXT } from "../global/chat.context.token";
import { formatBadgeCount } from "../constants";

@customElement("power-toys-chat-header-app")
export class ChatHeaderAppElement extends UmbHeaderAppButtonElement {
  @state()
  private _unread = 0;

  @state()
  private _mentions = 0;

  constructor() {
    super();

    this.consumeContext(CHAT_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.totalUnread, (total) => (this._unread = total), "_unread");
      this.observe(context.totalMentions, (total) => (this._mentions = total), "_mentions");
    });
  }

  override render() {
    return html`
      <uui-button look="primary" label=${this.localize.term("powerToysChat_chat")} compact @click=${this.#onClick}>
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
    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
    if (!modalManager) return;

    const chatModal = modalManager.open(this, CHAT_MODAL, { data: {} });
    await chatModal.onSubmit().catch(() => undefined);
  }

  static override readonly styles = [
    ...UmbHeaderAppButtonElement.styles,
    css`
      uui-badge {
        font-size: var(--uui-type-small-size);
      }
    `,
  ];
}

export default ChatHeaderAppElement;
