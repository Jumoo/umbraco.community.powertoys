import { css, customElement, html, nothing, state, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { CHAT_CONTEXT } from "../global/chat.context.token";
import type { ChatContext } from "../global/chat.context";
import { CHAT_MAX_MESSAGE_LENGTH, canAskForConfirmation } from "../constants";
import type { Mentionables } from "../signalR/types";
import { groupToken, userToken } from "../mentions/mentions";
import { CHAT_PERMISSION_ANNOUNCE, CHAT_PERMISSION_MENTION_GROUPS } from "../permissions/constants";

interface Suggestion {
  name: string;
  token: string;
  isGroup: boolean;
}

const MAX_SUGGESTIONS = 8;

type SendKind = "message" | "confirm" | "important";

// The "@query" being typed just before the caret, if any
const MENTION_QUERY = /(?:^|\s)@([^\s@]*)$/;

@customElement("power-toys-chat-input-box")
export class ChatChatInputBoxElement extends UmbLitElement {
  @property({ type: String })
  channel = "";

  @state()
  private _text = "";

  @state()
  private _isConnected = false;

  @state()
  private _sending = false;

  @state()
  private _suggestions: Suggestion[] = [];

  @state()
  private _canAnnounce = false;

  // How the next message is sent: plainly, asking each reader to confirm, or as important
  // (which also holds their screen until they confirm)

  @state()
  private _active = 0;

  #context?: ChatContext;
  #mentionables: Mentionables = { users: [], groups: [] };
  #canMentionGroups = false;

  // The box shows "@Name" while you type; each one picked from the list is swapped for its
  // token when the message is sent
  #picked = new Map<string, string>();

  // Where the "@query" being completed starts, and the textarea inside uui-textarea
  #queryStart = -1;
  #textarea?: HTMLTextAreaElement;

  constructor() {
    super();
    this.consumeContext(CHAT_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.isConnected, (connected) => (this._isConnected = connected), "_isConnected");
      this.observe(context.mentionables, (m) => (this.#mentionables = m), "_mentionables");
      this.observe(
        context.hasPermission(CHAT_PERMISSION_MENTION_GROUPS),
        (allowed) => (this.#canMentionGroups = allowed),
        "_canMentionGroups"
      );
      this.observe(
        context.hasPermission(CHAT_PERMISSION_ANNOUNCE),
        (allowed) => (this._canAnnounce = allowed),
        "_canAnnounce"
      );
    });
  }

  #toTokens(text: string) {
    // Longest first, so "@Sam Smith" isn't half replaced by "@Sam"
    const picked = [...this.#picked].sort(([a], [b]) => b.length - a.length);
    for (const [display, token] of picked) {
      text = text.split(display).join(token);
    }
    return text;
  }

  async #send(kind: SendKind = "message") {
    const text = this._text.trim();
    if (!text || !this.channel || !this.#context || this._sending) return;

    // The text stays in the box until the server has the message, so nothing is lost on failure
    this._sending = true;
    try {
      const message = this.#toTokens(text);
      const result =
        kind === "message"
          ? await this.#context.sendMessage(this.channel, message)
          : await this.#context.sendAnnouncement(this.channel, message, kind === "important");
      this._text = "";
      this.#picked.clear();
      this.#closeSuggestions();

      if (result?.unreachable?.length) {
        const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
        notifications?.peek("warning", {
          data: {
            headline: this.localize.term("powerToysChat_mentionUnreachableHeadline"),
            message: this.localize.term("powerToysChat_mentionUnreachable", result.unreachable.join(", ")),
          },
        });
      }
    } catch (error) {
      console.error("Chat: send failed", error);
      const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
      notifications?.peek("danger", {
        data: {
          headline: this.localize.term("powerToysChat_sendFailedHeadline"),
          message: this.localize.term("powerToysChat_sendFailedMessage"),
        },
      });
    } finally {
      this._sending = false;
    }
  }

  #onInput(e: InputEvent) {
    this.#textarea = e.composedPath()[0] as HTMLTextAreaElement;
    this._text = this.#textarea.value;
    this.#updateSuggestions();
  }

  #updateSuggestions() {
    const textarea = this.#textarea;
    const match = textarea ? MENTION_QUERY.exec(this._text.slice(0, textarea.selectionStart)) : null;
    if (!textarea || !match) {
      this.#closeSuggestions();
      return;
    }

    const query = match[1].toLowerCase();
    this.#queryStart = textarea.selectionStart - match[1].length - 1;

    const matches = (name: string, ...more: string[]) =>
      [name, ...more].some((value) => value.toLowerCase().includes(query));

    this._suggestions = [
      ...this.#mentionables.users
        .filter((u) => matches(u.name))
        .map((u) => ({ name: u.name, token: userToken(u.key), isGroup: false })),
      ...(this.#canMentionGroups ? this.#mentionables.groups : [])
        .filter((g) => matches(g.name, g.alias))
        .map((g) => ({ name: g.name, token: groupToken(g.alias), isGroup: true })),
    ].slice(0, MAX_SUGGESTIONS);
    this._active = 0;
  }

  #closeSuggestions() {
    this._suggestions = [];
    this.#queryStart = -1;
  }

  #pick(suggestion: Suggestion) {
    const textarea = this.#textarea;
    if (!textarea || this.#queryStart < 0) return;

    const display = `@${suggestion.name}`;
    const before = this._text.slice(0, this.#queryStart);
    const after = this._text.slice(textarea.selectionStart);
    this._text = `${before}${display} ${after}`;
    this.#picked.set(display, suggestion.token);
    this.#closeSuggestions();

    const caret = before.length + display.length + 1;
    this.updateComplete.then(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  #onKeyDown(e: KeyboardEvent) {
    if (this._suggestions.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this._active = (this._active + 1) % this._suggestions.length;
          return;
        case "ArrowUp":
          e.preventDefault();
          this._active = (this._active - 1 + this._suggestions.length) % this._suggestions.length;
          return;
        case "Enter":
        case "Tab":
          e.preventDefault();
          this.#pick(this._suggestions[this._active]);
          return;
        case "Escape":
          // Stop here, so Escape closes the list rather than the modal the chat is in
          e.preventDefault();
          e.stopPropagation();
          this.#closeSuggestions();
          return;
      }
    }

    // Enter sends, Shift+Enter adds a new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.#send();
    }
  }

  #renderSuggestions() {
    if (this._suggestions.length === 0) return nothing;

    return html`
      <ul class="suggestions" role="listbox" aria-label=${this.localize.term("powerToysChat_mentionSuggestions")}>
        ${this._suggestions.map(
          (s, i) => html`<li
            role="option"
            aria-selected=${i === this._active}
            class=${i === this._active ? "active" : ""}
            @mousedown=${(e: MouseEvent) => {
              // mousedown, so the textarea keeps focus and its caret
              e.preventDefault();
              this.#pick(s);
            }}
          >
            <uui-icon name=${s.isGroup ? "icon-users" : "icon-user"}></uui-icon>
            <span>${s.name}</span>
            ${s.isGroup ? html`<span class="kind">${this.localize.term("powerToysChat_mentionGroup")}</span>` : nothing}
          </li>`
        )}
      </ul>
    `;
  }

  // Send, with a menu of the other ways to send beside it, as the workspace's
  // "Save and publish" does. The menu only shows for users who can send these, in channels
  // where they're allowed.
  #renderSend() {
    const send = html`<uui-button
      look="primary"
      color="positive"
      label=${this.localize.term("powerToysChat_send")}
      .state=${this._sending ? "waiting" : undefined}
      ?disabled=${!this._isConnected}
      @click=${() => this.#send()}
    ></uui-button>`;

    if (!this._canAnnounce || !canAskForConfirmation(this.channel)) return send;

    return html`
      <uui-button-group>
        ${send}
        <uui-button
          popovertarget="send-options"
          look="primary"
          color="positive"
          compact
          label=${this.localize.term("powerToysChat_sendOptions")}
          ?disabled=${!this._isConnected || this._sending}
        >
          <uui-symbol-expand open></uui-symbol-expand>
        </uui-button>
      </uui-button-group>
      <uui-popover-container id="send-options" placement="top-end">
        <umb-popover-layout>
          <uui-menu-item label=${this.localize.term("powerToysChat_sendAskConfirm")} @click=${() => this.#sendFromMenu("confirm")}>
            <umb-icon slot="icon" name="icon-check"></umb-icon>
          </uui-menu-item>
          <uui-menu-item label=${this.localize.term("powerToysChat_sendImportant")} @click=${() => this.#sendFromMenu("important")}>
            <umb-icon slot="icon" name="icon-alert"></umb-icon>
          </uui-menu-item>
        </umb-popover-layout>
      </uui-popover-container>
    `;
  }

  #sendFromMenu(kind: SendKind) {
    (this.shadowRoot?.getElementById("send-options") as HTMLElement & { hidePopover?: () => void })?.hidePopover?.();
    this.#send(kind);
  }

  override render() {
    return html`
      <div class="field">
        ${this.#renderSuggestions()}
        <uui-textarea
          label=${this.localize.term("powerToysChat_message")}
          placeholder=${this.localize.term(
            this._isConnected ? "powerToysChat_messagePlaceholder" : "powerToysChat_connecting"
          )}
          rows="2"
          auto-height
          maxlength=${CHAT_MAX_MESSAGE_LENGTH}
          .value=${this._text}
          @input=${this.#onInput}
          @keydown=${this.#onKeyDown}
          @blur=${() => this.#closeSuggestions()}
        ></uui-textarea>
      </div>
      <div class="actions">
        <span class="hint">${this.localize.term("powerToysChat_sendHint")}</span>
        ${this.#renderSend()}
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .field {
      position: relative;
    }

    uui-textarea {
      display: block;
      width: 100%;
      --uui-textarea-max-height: 12em;
    }

    .suggestions {
      position: absolute;
      bottom: calc(100% + var(--uui-size-space-1));
      left: 0;
      z-index: 1;
      min-width: 240px;
      max-width: 100%;
      margin: 0;
      padding: var(--uui-size-space-1) 0;
      list-style: none;
      background-color: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-3);
    }

    .suggestions li {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      cursor: pointer;
    }

    .suggestions li.active {
      background-color: var(--uui-color-surface-emphasis);
    }

    .kind {
      margin-left: auto;
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
    }

    .hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-chat-input-box": ChatChatInputBoxElement;
  }
}
