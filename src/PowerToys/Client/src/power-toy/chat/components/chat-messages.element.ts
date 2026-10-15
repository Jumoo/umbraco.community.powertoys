import { css, customElement, html, property, query, repeat, state } from "@umbraco-cms/backoffice/external/lit";
import type { PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { CHAT_CONTEXT } from "../global/chat.context.token";
import type { ChatContext } from "../global/chat.context";
import type { ChatMessage } from "../signalR/types";
import "./chat-bubble.element";
import "./chat-input-box.element";

// Shows the messages for one channel and the box to send into it
@customElement("power-toys-chat-messages")
export class ChatChatMessagesElement extends UmbLitElement {
  @property({ type: String })
  channel = "";

  @state()
  private _messages: ChatMessage[] = [];

  @state()
  private _currentUserKey?: string;

  @query(".messages")
  private _messagesElement?: HTMLElement;

  #context?: ChatContext;

  // Unread in this channel. The chat is on screen when this element exists, so it only
  // has to wait for the browser tab to be visible before marking the channel read.
  #unread = 0;

  #onVisibilityChange = () => this.#markReadIfVisible();

  // The channel this element has told the context it is showing
  #openChannel?: string;

  constructor() {
    super();

    this.consumeContext(CHAT_CONTEXT, (context) => {
      this.#context = context;
      this.#observeChannel();
    });

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.unique, (unique) => (this._currentUserKey = unique), "_currentUserKey");
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.#onVisibilityChange);
    if (this.channel) this.#setOpenChannel(this.channel);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("visibilitychange", this.#onVisibilityChange);
    this.#setOpenChannel(undefined);
  }

  #setOpenChannel(channel: string | undefined) {
    if (channel === this.#openChannel) return;
    if (this.#openChannel) this.#context?.setChannelOpen(this.#openChannel, false);
    this.#openChannel = channel;
    if (channel) this.#context?.setChannelOpen(channel, true);
  }

  override willUpdate(changed: PropertyValues) {
    if (changed.has("channel")) this.#observeChannel();
  }

  override updated(changed: PropertyValues) {
    // Keep the newest message in view
    if (changed.has("_messages") && this._messagesElement) {
      this._messagesElement.scrollTop = this._messagesElement.scrollHeight;
    }
  }

  #observeChannel() {
    if (!this.#context || !this.channel) return;

    this.#context.joinChannel(this.channel);
    if (this.isConnected) this.#setOpenChannel(this.channel);

    // The alias replaces the previous subscription when the channel changes
    this.observe(
      this.#context.messagesOf(this.channel),
      (messages) => (this._messages = messages),
      "_messages"
    );

    this.observe(
      this.#context.unreadOf(this.channel),
      (count) => {
        this.#unread = count?.unread ?? 0;
        this.#markReadIfVisible();
      },
      "_unread"
    );
  }

  #markReadIfVisible() {
    if (this.#unread === 0 || document.visibilityState !== "visible" || !this.isConnected) return;
    this.#context?.markRead(this.channel);
  }

  override render() {
    return html`
      <div class="layout">
        <div class="messages">
          ${this._messages.length === 0
            ? html`<p class="empty">${this.localize.term("powerToysChat_empty")}</p>`
            : repeat(
                this._messages,
                (m) => m.key,
                (m) => html`<power-toys-chat-bubble
                  .message=${m}
                  .isCurrentUser=${m.type !== "activity" && !!m.userKey && m.userKey === this._currentUserKey}
                ></power-toys-chat-bubble>`
              )}
        </div>
        <power-toys-chat-input-box class="composer" .channel=${this.channel}></power-toys-chat-input-box>
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .layout {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Padded inside the scrolling area, so the scrollbar sits flush with the edge */
    .messages {
      flex: 1 1 0;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-layout-1);
    }

    /* The line above runs full width; the box and buttons keep their space from the sides */
    .composer {
      border-top: 1px solid var(--uui-color-divider-standalone);
      padding: var(--uui-size-space-3) var(--uui-size-layout-1);
    }

    .empty {
      color: var(--uui-color-text-alt);
      margin: auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-chat-messages": ChatChatMessagesElement;
  }
}
