import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { CHAT_CONTEXT } from "../global/chat.context.token";
import type { ChatContext } from "../global/chat.context";
import type { ConfirmationStatus, Mentionables, RecipientStatus } from "../signalR/types";
import { ChatTimeOptions } from "../constants";
import { toPlainText } from "../mentions/mentions";
import type {
  ConfirmationStatusModalData,
  ConfirmationStatusModalValue,
} from "./confirmation-status-modal.token";

// For the sender: who has confirmed a message, who hasn't, and a reminder for the rest.
// Updates live as people confirm.
@customElement("power-toys-chat-confirmation-status-modal")
export class ChatConfirmationStatusModalElement extends UmbModalBaseElement<
  ConfirmationStatusModalData,
  ConfirmationStatusModalValue
> {
  @state()
  private _status?: ConfirmationStatus;

  @state()
  private _mentionables: Mentionables = { users: [], groups: [] };

  @state()
  private _reminding = false;

  #context?: ChatContext;

  constructor() {
    super();
    this.consumeContext(CHAT_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.mentionables, (m) => (this._mentionables = m), "_mentionables");
      this.observe(context.confirmationChanges, (key) => {
        if (!key || key === this.data?.message.key) this.#load();
      }, "_changes");
    });
  }

  async #load() {
    const key = this.data?.message.key;
    if (!this.#context || !key) return;
    try {
      this._status = await this.#context.getConfirmationStatus(key);
    } catch (error) {
      console.error("Chat: could not load confirmations", error);
    }
  }

  async #remind() {
    const key = this.data?.message.key;
    if (!this.#context || !key) return;

    this._reminding = true;
    try {
      const count = await this.#context.remind(key);
      const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
      notifications?.peek("positive", { data: { message: this.localize.term("powerToysChat_reminded", count) } });
    } finally {
      this._reminding = false;
    }
  }

  #renderList(headline: string, recipients: RecipientStatus[]) {
    if (recipients.length === 0) return nothing;

    return html`
      <h4>${headline}</h4>
      <ul>
        ${recipients.map(
          (r) => html`<li>
            <span>${r.name}</span>
            ${r.confirmed ? html`<span class="date">${this.localize.date(r.confirmed, ChatTimeOptions)}</span>` : nothing}
          </li>`
        )}
      </ul>
    `;
  }

  override render() {
    const message = this.data?.message;
    const recipients = this._status?.recipients ?? [];
    const confirmed = recipients.filter((r) => r.confirmed);
    const waiting = recipients.filter((r) => !r.confirmed);

    return html`
      <umb-body-layout headline=${this.localize.term("powerToysChat_confirmations")}>
        <uui-box>
          <p class="message">${message ? toPlainText(message.message, this._mentionables) : nothing}</p>
          <p class="summary">${this.localize.term("powerToysChat_confirmedCount", confirmed.length, recipients.length)}</p>
          ${this.#renderList(this.localize.term("powerToysChat_waitingFor"), waiting)}
          ${this.#renderList(this.localize.term("powerToysChat_confirmedBy"), confirmed)}
        </uui-box>
        <div slot="actions">
          <uui-button label=${this.localize.term("powerToysChat_close")} @click=${() => this._rejectModal()}></uui-button>
          <uui-button
            look="primary"
            label=${this.localize.term("powerToysChat_remind")}
            ?disabled=${waiting.length === 0}
            .state=${this._reminding ? "waiting" : undefined}
            @click=${this.#remind}
          ></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = css`
    .message {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin-top: 0;
    }

    .summary {
      font-weight: 700;
    }

    h4 {
      margin: var(--uui-size-space-4) 0 var(--uui-size-space-2);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: flex;
      justify-content: space-between;
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-divider);
    }

    .date {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }
  `;
}

export default ChatConfirmationStatusModalElement;
