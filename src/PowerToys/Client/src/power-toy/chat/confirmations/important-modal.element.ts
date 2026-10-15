import { css, customElement, html, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { CHAT_CONTEXT } from "../global/chat.context.token";
import type { Mentionables } from "../signalR/types";
import { ChatTimeOptions } from "../constants";
import { toPlainText } from "../mentions/mentions";
import type { ImportantModalData, ImportantModalValue } from "./important-modal.token";

// An important message. There's no close button: the global context opens it again until
// the user confirms they've read it.
@customElement("power-toys-chat-important-modal")
export class ChatImportantModalElement extends UmbModalBaseElement<ImportantModalData, ImportantModalValue> {
  @state()
  private _mentionables: Mentionables = { users: [], groups: [] };

  @state()
  private _confirming = false;

  constructor() {
    super();
    this.consumeContext(CHAT_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.mentionables, (m) => (this._mentionables = m), "_mentionables");
    });
  }

  async #confirm() {
    const context = await this.getContext(CHAT_CONTEXT);
    const message = this.data?.message;
    if (!context || !message) return;

    this._confirming = true;
    try {
      await context.confirm(message.key);
      this._submitModal();
    } finally {
      this._confirming = false;
    }
  }

  override render() {
    const message = this.data?.message;
    if (!message) return html``;

    return html`
      <uui-dialog-layout headline=${this.localize.term("powerToysChat_importantHeadline", message.userName)}>
        <p class="message">${toPlainText(message.message, this._mentionables)}</p>
        <p class="meta">${this.localize.date(message.date, ChatTimeOptions)}</p>
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          label=${this.localize.term("powerToysChat_confirmRead")}
          .state=${this._confirming ? "waiting" : undefined}
          @click=${this.#confirm}
        ></uui-button>
      </uui-dialog-layout>
    `;
  }

  static override styles = css`
    .message {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: var(--uui-type-h5-size);
    }

    .meta {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }
  `;
}

export default ChatImportantModalElement;
