import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { CHAT_CONTEXT } from "../global/chat.context.token";
import type { ChatContext } from "../global/chat.context";
import type { Conversation, Mentionables } from "../signalR/types";
import { CHAT_PERMISSION_MESSAGE_GROUPS } from "../permissions/constants";
import { ChatOpenConversationEvent } from "./conversation-list.element";

// Matches Channels.MaxDirectParticipants on the server, which counts the sender too
const MAX_OTHERS = 4;

// Pick people for a direct conversation, or a user group to message
@customElement("power-toys-chat-new-conversation")
export class ChatNewConversationElement extends UmbLitElement {
  @state()
  private _mentionables: Mentionables = { users: [], groups: [] };

  @state()
  private _currentUserKey?: string;

  @state()
  private _canMessageGroups = false;

  @state()
  private _filter = "";

  @state()
  private _selected: string[] = [];

  @state()
  private _starting = false;

  #context?: ChatContext;

  constructor() {
    super();

    this.consumeContext(CHAT_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.mentionables, (m) => (this._mentionables = m), "_mentionables");
      this.observe(
        context.hasPermission(CHAT_PERMISSION_MESSAGE_GROUPS),
        (allowed) => (this._canMessageGroups = allowed),
        "_canMessageGroups"
      );
    });

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.unique, (unique) => (this._currentUserKey = unique), "_currentUserKey");
    });
  }

  #matches(name: string) {
    return name.toLowerCase().includes(this._filter.toLowerCase());
  }

  #toggle(key: string, checked: boolean) {
    this._selected = checked ? [...this._selected, key] : this._selected.filter((k) => k !== key);
  }

  async #start(start: (context: ChatContext) => Promise<Conversation>) {
    if (!this.#context || this._starting) return;

    this._starting = true;
    try {
      const conversation = await start(this.#context);
      this.dispatchEvent(new ChatOpenConversationEvent(conversation));
    } catch (error) {
      console.error("Chat: could not start the conversation", error);
      const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
      notifications?.peek("danger", {
        data: { message: this.localize.term("powerToysChat_startFailed") },
      });
    } finally {
      this._starting = false;
    }
  }

  #renderGroups() {
    if (!this._canMessageGroups) return nothing;

    const groups = this._mentionables.groups.filter((g) => this.#matches(g.name));
    if (groups.length === 0) return nothing;

    return html`
      <h4>${this.localize.term("powerToysChat_userGroups")}</h4>
      <ul>
        ${groups.map(
          (g) => html`<li>
            <uui-button
              look="secondary"
              compact
              label=${this.localize.term("powerToysChat_messageGroup", g.name)}
              ?disabled=${this._starting}
              @click=${() => this.#start((c) => c.startGroupConversation(g.key))}
            >
              <uui-icon name="icon-users"></uui-icon> ${g.name}
            </uui-button>
          </li>`
        )}
      </ul>
    `;
  }

  override render() {
    const users = this._mentionables.users.filter((u) => u.key !== this._currentUserKey && this.#matches(u.name));
    const full = this._selected.length >= MAX_OTHERS;

    return html`
      <uui-input
        label=${this.localize.term("powerToysChat_findPeople")}
        placeholder=${this.localize.term("powerToysChat_findPeople")}
        .value=${this._filter}
        @input=${(e: Event) => (this._filter = (e.target as HTMLInputElement).value)}
      >
        <uui-icon name="icon-search" slot="prepend"></uui-icon>
      </uui-input>

      <h4>${this.localize.term("powerToysChat_people")}</h4>
      <ul>
        ${users.map((u) => {
          const checked = this._selected.includes(u.key);
          return html`<li>
            <uui-checkbox
              label=${u.name}
              ?checked=${checked}
              ?disabled=${full && !checked}
              @change=${(e: Event) => this.#toggle(u.key, (e.target as HTMLInputElement).checked)}
            ></uui-checkbox>
          </li>`;
        })}
      </ul>
      ${full ? html`<p class="hint">${this.localize.term("powerToysChat_maxPeople", MAX_OTHERS)}</p>` : nothing}

      <uui-button
        look="primary"
        label=${this.localize.term("powerToysChat_startConversation")}
        ?disabled=${this._selected.length === 0}
        .state=${this._starting ? "waiting" : undefined}
        @click=${() => this.#start((c) => c.startDirectConversation(this._selected))}
      ></uui-button>

      ${this.#renderGroups()}
    `;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    uui-input {
      width: 100%;
    }

    h4 {
      margin: var(--uui-size-space-3) 0 0;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .hint {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-chat-new-conversation": ChatNewConversationElement;
  }
}
