import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import type { ChatMessage, Conversation, Mentionables, UnreadCount } from "../signalR/types";
import { CHAT_CONTEXT } from "../global/chat.context.token";
import { UMB_POWER_TOYS_CURRENT_DOCUMENT_CONTEXT } from "../../shared/current-document/current-document.context.js";
import { conversationIcon, conversationTitle } from "../conversations/conversation-title";
import type { ChatOpenConversationEvent } from "../conversations/conversation-list.element";
import { ChatTimeOptions, formatBadgeCount } from "../constants";
import { toPlainText } from "../mentions/mentions";
import "../components/chat-messages.element";
import "../conversations/conversation-list.element";
import "../conversations/new-conversation.element";
import "../../shared/panel/panel-layout.element.js";

type View = { kind: "list" } | { kind: "new" } | { kind: "chat"; conversation: Conversation; thisPage?: boolean };

// The chat panel docked beside the backoffice: what's waiting for you, the page you're on, then
// your conversations. Every conversation, a document's included, opens here, and it stays open
// while you move around the site.
@customElement("power-toys-chat-panel")
export class ChatPanelElement extends UmbLitElement {
  @state()
  private _view: View = { kind: "list" };

  @state()
  private _mentionables: Mentionables = { users: [], groups: [] };

  @state()
  private _currentUserKey?: string;

  @state()
  private _currentDocument?: string;

  @state()
  private _conversations: Conversation[] = [];

  @state()
  private _unread: UnreadCount[] = [];

  @state()
  private _pending: ChatMessage[] = [];

  #context?: typeof CHAT_CONTEXT.TYPE;

  constructor() {
    super();

    this.consumeContext(CHAT_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.mentionables, (m) => (this._mentionables = m), "_mentionables");
      this.observe(context.conversations, (c) => (this._conversations = c), "_conversations");
      this.observe(context.unread, (u) => (this._unread = u), "_unread");
      this.observe(context.pending, (p) => (this._pending = p), "_pending");
    });

    this.consumeContext(UMB_POWER_TOYS_CURRENT_DOCUMENT_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.unique, (unique) => this.#onCurrentDocument(unique ?? undefined), "_currentDocument");
    });

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.unique, (unique) => (this._currentUserKey = unique), "_currentUserKey");
    });
  }

  // "This page" follows the editor: moving to another document switches to its chat, and
  // leaving documents altogether goes back to the list
  #onCurrentDocument(unique: string | undefined) {
    this._currentDocument = unique;
    clearTimeout(this.#leaveTimer);
    if (this._view.kind !== "chat" || !this._view.thisPage) return;

    if (unique) {
      this._view = { kind: "chat", conversation: this.#thisPageConversation(unique), thisPage: true };
    } else {
      // Moving between documents closes the old workspace before the new one opens, so wait a
      // moment before deciding the editor has left documents altogether
      this.#leaveTimer = setTimeout(() => {
        if (!this._currentDocument && this._view.kind === "chat" && this._view.thisPage) this._view = { kind: "list" };
      }, 1000);
    }
  }

  #leaveTimer?: ReturnType<typeof setTimeout>;

  #onOpen(e: ChatOpenConversationEvent) {
    this._view = { kind: "chat", conversation: e.conversation };
  }

  #openThisPage() {
    if (!this._currentDocument) return;
    this._view = { kind: "chat", conversation: this.#thisPageConversation(this._currentDocument), thisPage: true };
  }

  // The server's entry for the document carries its name, when it's in the list
  #thisPageConversation(unique: string): Conversation {
    return (
      this._conversations.find((c) => c.channel === unique) ?? {
        channel: unique,
        kind: "Document",
        participants: [],
      }
    );
  }

  #title() {
    switch (this._view.kind) {
      case "chat":
        if (this._view.thisPage && !this._view.conversation.title) return this.localize.term("powerToysChat_thisPage");
        return conversationTitle(this._view.conversation, this._mentionables, this._currentUserKey, (k) =>
          this.localize.term(k)
        );
      case "new":
        return this.localize.term("powerToysChat_newConversation");
      default:
        return this.localize.term("powerToysChat_chat");
    }
  }

  #renderHeaderStart() {
    if (this._view.kind === "list") return nothing;

    return html`<uui-button
      slot="header-start"
      compact
      label=${this.localize.term("powerToysChat_back")}
      @click=${() => (this._view = { kind: "list" })}
    >
      <uui-icon name="icon-arrow-left"></uui-icon>
    </uui-button>`;
  }

  #renderHeaderActions() {
    if (this._view.kind !== "list") return nothing;

    return html`<uui-button
      slot="header-actions"
      look="secondary"
      compact
      label=${this.localize.term("powerToysChat_newConversation")}
      @click=${() => (this._view = { kind: "new" })}
    >
      <uui-icon name="icon-add"></uui-icon> ${this.localize.term("powerToysChat_new")}
    </uui-button>`;
  }

  #renderPending() {
    if (this._pending.length === 0) return nothing;

    return html`
      <uui-box headline=${this.localize.term("powerToysChat_waitingForYou")}>
        <uui-ref-list>
          ${this._pending.map(
            (message) => html`<uui-ref-node
              readonly
              name=${message.userName}
              detail=${`${this.localize.date(message.date, ChatTimeOptions)} · ${toPlainText(message.message, this._mentionables)}`}
            >
              <umb-icon slot="icon" name=${message.important ? "icon-alert" : "icon-message"}></umb-icon>
              <uui-action-bar slot="actions">
                <uui-button
                  look="primary"
                  color="positive"
                  label=${this.localize.term("powerToysChat_confirmRead")}
                  @click=${() => this.#context?.confirm(message.key)}
                ></uui-button>
              </uui-action-bar>
            </uui-ref-node>`
          )}
        </uui-ref-list>
      </uui-box>
    `;
  }

  #renderThisPage() {
    if (!this._currentDocument) return nothing;

    const count = this._unread.find((u) => u.channel === this._currentDocument);
    const name = this.#thisPageConversation(this._currentDocument).title;

    return html`
      <uui-box>
        <uui-ref-list>
          <uui-ref-node
            name=${this.localize.term("powerToysChat_thisPage")}
            detail=${name ?? this.localize.term("powerToysChat_thisPageHint")}
            @open=${this.#openThisPage}
          >
            <umb-icon slot="icon" name="icon-document"></umb-icon>
            ${count
              ? html`<uui-badge
                  slot="tag"
                  class="badge"
                  color=${count.mentions > 0 ? "danger" : "default"}
                  label=${this.localize.term("powerToysChat_unreadCount", count.unread)}
                  >${formatBadgeCount(count.unread)}</uui-badge
                >`
              : nothing}
          </uui-ref-node>
        </uui-ref-list>
      </uui-box>
    `;
  }

  #renderBody() {
    switch (this._view.kind) {
      case "chat":
        return html`<power-toys-chat-messages .channel=${this._view.conversation.channel}></power-toys-chat-messages>`;
      case "new":
        return html`<power-toys-chat-new-conversation
          @open-conversation=${this.#onOpen}
        ></power-toys-chat-new-conversation>`;
      default:
        return html`
          ${this.#renderPending()} ${this.#renderThisPage()}
          <uui-box>
            <power-toys-chat-conversation-list
              @open-conversation=${this.#onOpen}
            ></power-toys-chat-conversation-list>
          </uui-box>
        `;
    }
  }

  override render() {
    const icon = this._view.kind === "chat" ? conversationIcon(this._view.conversation) : "icon-chat";

    return html`
      <power-toys-panel-layout headline=${this.#title()} icon=${icon} ?flush=${this._view.kind === "chat"}>
        ${this.#renderHeaderStart()} ${this.#renderHeaderActions()}
        <div class="layout ${this._view.kind}">${this.#renderBody()}</div>
      </power-toys-panel-layout>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .layout.list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-layout-1);
    }

    /* The panel's content has no padding in a chat: the chat pads its own parts, so its
       scrollbar and the line above the message box run to the edges */
    .layout.chat {
      height: 100%;
      overflow: hidden;
    }

    .badge {
      position: static;
    }
  `;
}

export default ChatPanelElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-chat-panel": ChatPanelElement;
  }
}
