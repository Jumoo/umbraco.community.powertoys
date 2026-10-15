import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import type { ChatMessage, Mentionables } from "../signalR/types";
import { ChatTimeOptions } from "../constants";
import { CHAT_CONTEXT } from "../global/chat.context.token";
import { parseMessage, type MessageSegment } from "../mentions/mentions";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { CHAT_CONFIRMATION_STATUS_MODAL } from "../confirmations/confirmation-status-modal.token";
import type { ChatContext } from "../global/chat.context";
import { activityText, isActivity } from "../activity/activity";

@customElement("power-toys-chat-bubble")
export class ChatChatBubbleElement extends UmbLitElement {
  @property({ type: Object })
  message?: ChatMessage;

  // Reflected so the host can line itself up on the sender's side
  @property({ type: Boolean, reflect: true, attribute: "current-user" })
  isCurrentUser = false;

  @state()
  private _mentionables?: Mentionables;

  @state()
  private _userKey?: string;

  @state()
  private _groupKeys: string[] = [];

  @state()
  private _pending = false;

  @state()
  private _confirming = false;

  #context?: ChatContext;

  constructor() {
    super();

    this.consumeContext(CHAT_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.mentionables, (m) => (this._mentionables = m), "_mentionables");
      this.#observePending();
    });

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      if (!context) return;
      this.observe(
        context.currentUser,
        (user) => {
          this._userKey = user?.unique;
          this._groupKeys = user?.userGroupUniques ?? [];
        },
        "_currentUser"
      );
    });
  }

  override willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has("message")) this.#observePending();
  }

  #observePending() {
    if (!this.#context || !this.message?.requiresConfirmation) return;
    this.observe(this.#context.isPending(this.message.key), (pending) => (this._pending = pending), "_pending");
  }

  async #confirm() {
    if (!this.#context || !this.message) return;
    this._confirming = true;
    try {
      await this.#context.confirm(this.message.key);
    } finally {
      this._confirming = false;
    }
  }

  async #openStatus() {
    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
    if (!modalManager || !this.message) return;
    modalManager.open(this, CHAT_CONFIRMATION_STATUS_MODAL, { data: { message: this.message } });
  }

  // Asks the reader to confirm, or lets the sender see who has
  #renderConfirmation() {
    if (!this.message?.requiresConfirmation) return nothing;

    if (this.isCurrentUser) {
      return html`<uui-button compact look="secondary" label=${this.localize.term("powerToysChat_seeConfirmations")} @click=${this.#openStatus}>
        <uui-icon name="icon-check"></uui-icon> ${this.localize.term("powerToysChat_seeConfirmations")}
      </uui-button>`;
    }

    if (this._pending) {
      return html`<uui-button
        compact
        look="secondary"
        label=${this.localize.term("powerToysChat_confirmRead")}
        .state=${this._confirming ? "waiting" : undefined}
        @click=${this.#confirm}
      ></uui-button>`;
    }

    return html`<span class="confirmed"><uui-icon name="icon-check"></uui-icon> ${this.localize.term("powerToysChat_nothingToConfirm")}</span>`;
  }

  // A mention of you, or of a group you're in, is highlighted more strongly
  #isMe(segment: MessageSegment) {
    if (segment.kind === "user") return segment.key === this._userKey;
    if (segment.kind === "group") return !!segment.key && this._groupKeys.includes(segment.key);
    return false;
  }

  #renderSegment(segment: MessageSegment) {
    if (segment.kind === "text") return segment.text;
    return html`<span class="mention ${this.#isMe(segment) ? "me" : ""}">@${segment.name}</span>`;
  }

  #renderFlag() {
    if (!this.message?.important) return nothing;
    return html`<div class="flag"><uui-icon name="icon-alert"></uui-icon> ${this.localize.term("powerToysChat_important")}</div>`;
  }

  override render() {
    if (!this.message) return nothing;

    // Activity lines are a quiet line across the chat, not a bubble
    if (isActivity(this.message)) {
      return html`<div class="activity">
        <uui-icon name="icon-history"></uui-icon>
        <span>${activityText(this.message, (k, ...a) => this.localize.term(k, ...a))}</span>
        <span class="time">${this.localize.date(this.message.date, ChatTimeOptions)}</span>
      </div>`;
    }

    return html`
      <!-- No whitespace inside .body: it keeps the message's own line breaks (pre-wrap) -->
      <div class="body ${this.message.important ? "important" : ""}">${this.#renderFlag()}${parseMessage(
          this.message.message,
          this._mentionables
        ).map((s) => this.#renderSegment(s))}</div>
      ${this.message.requiresConfirmation ? html`<div class="confirmation">${this.#renderConfirmation()}</div>` : nothing}
      <div class="meta">
        <span class="name">${this.message.userName}</span>
        <span>${this.localize.date(this.message.date, ChatTimeOptions)}</span>
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    :host([current-user]) {
      align-items: flex-end;
    }

    .body {
      max-width: 80%;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background-color: var(--uui-color-positive);
      border: 1px solid var(--uui-color-positive);
      color: var(--uui-color-positive-contrast);
      border-radius: calc(var(--uui-border-radius) * 3);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    :host([current-user]) .body {
      background-color: var(--uui-color-selected);
      border-color: var(--uui-color-selected);
      color: var(--uui-color-selected-contrast);
    }

    .body.important {
      border-left: 4px solid var(--uui-color-warning-standalone);
    }

    .flag {
      font-weight: 700;
      font-size: var(--uui-type-small-size);
      margin-bottom: var(--uui-size-space-1);
    }

    .confirmation {
      margin-top: var(--uui-size-space-2);
    }

    .confirmed {
      color: inherit;
      font-size: var(--uui-type-small-size);
    }

    .meta {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-1);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .name {
      font-weight: 700;
    }

    .activity {
      align-self: center;
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    /* Both bubble colours are filled, so a mention keeps the text colour and is underlined */
    .mention {
      font-weight: 700;
      color: inherit;
      text-decoration: underline;
    }

    .mention.me {
      padding: 0 var(--uui-size-space-1);
      border-radius: var(--uui-border-radius);
      background-color: var(--uui-color-warning);
      color: var(--uui-color-warning-contrast);
      text-decoration: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-chat-bubble": ChatChatBubbleElement;
  }
}
