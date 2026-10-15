import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UmbArrayState, UmbBooleanState, UmbObjectState, UmbStringState } from "@umbraco-cms/backoffice/observable-api";
import { CHAT_POWER_TOY_ALIAS } from "../constants";
import { UMB_POWER_TOYS_HUB_CONTEXT, type PowerToysHubContext } from "../../shared/hub/hub.context.js";
import { PowerToyEnabledController } from "../../shared/power-toy-enabled.js";
import type {
  ChatMessage,
  ConfirmationStatus,
  Conversation,
  Mentionables,
  SendMessageResult,
  UnreadCount,
} from "../signalR/types";
import { CHAT_IMPORTANT_MODAL } from "../confirmations/important-modal.token";
import { toPlainText } from "../mentions/mentions";
import { CHAT_CONTEXT } from "./chat.context.token";

// The chat's state for the whole backoffice, shared by the header app, the sidebar and its
// modals. Live updates come through the shared Power Toys hub connection, which this asks
// for while the Chat power toy is on.
export class ChatContext extends UmbContextBase {
  #hub?: PowerToysHubContext;
  #joined = new Set<string>();
  #localize = new UmbLocalizationController(this);

  // Chats on screen right now, so a mention in one of them doesn't also pop up a toast
  #openChannels = new Map<string, number>();

  // Users and groups for the mention picker and for showing names in messages
  #mentionables = new UmbObjectState<Mentionables>({ users: [], groups: [] });
  public readonly mentionables = this.#mentionables.asObservable();

  // The header chat's list of conversations. Loaded when the list is shown, and kept up to
  // date from then on as messages arrive.
  #conversations = new UmbArrayState<Conversation>([], (c) => c.channel);
  public readonly conversations = this.#conversations.asObservable();
  #conversationsWanted = false;
  #reloadTimer?: ReturnType<typeof setTimeout>;

  // Messages waiting for the current user to confirm them
  #pending = new UmbArrayState<ChatMessage>([], (m) => m.key);
  public readonly pending = this.#pending.asObservable();

  // The key of the latest message someone confirmed, for its sender's status view
  #confirmationChanges = new UmbStringState(undefined);
  public readonly confirmationChanges = this.#confirmationChanges.asObservable();

  // The important message on screen, so only one is open at a time
  #importantOpen?: string;
  #importantModal?: { reject: () => void };

  // The power toy's enabled flag. Nothing is sent to the hub while it's off.
  #enabled = false;

  // The current user's permissions, from all their groups. Used to hide what they can't do;
  // the server checks again on every guarded action.
  #permissions = new UmbArrayState<string>([], (p) => p);

  #messages = new UmbArrayState<ChatMessage>([], (m) => m.key);

  #isConnected = new UmbBooleanState(false);
  public readonly isConnected = this.#isConnected.asObservable();

  // Only channels with something unread are held; the server sends a zero count to clear one
  #unread = new UmbArrayState<UnreadCount>([], (c) => c.channel);
  public readonly unread = this.#unread.asObservable();
  public readonly totalUnread = this.#unread.asObservablePart((list) => list.reduce((sum, c) => sum + c.unread, 0));
  public readonly totalMentions = this.#unread.asObservablePart((list) => list.reduce((sum, c) => sum + c.mentions, 0));

  constructor(host: UmbControllerHost) {
    super(host, CHAT_CONTEXT);

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      if (!context) return;
      this.observe(
        context.currentUser,
        (user) => this.#permissions.setValue(user?.fallbackPermissions ?? []),
        "_permissions"
      );
    });

    this.observe(this.pending, (pending) => this.#showImportant(pending), "_showImportant");

    this.consumeContext(UMB_POWER_TOYS_HUB_CONTEXT, (hub) => {
      this.#hub = hub;
      if (!hub) return;
      this.#listen(hub);
      this.observe(hub.isConnected, (connected) => this.#isConnected.setValue(connected && this.#enabled), "_isConnected");
      hub.setWanted("chat", this.#enabled);
    });

    new PowerToyEnabledController(this, CHAT_POWER_TOY_ALIAS, (enabled) => {
      this.#enabled = enabled;
      if (!enabled) {
        this.#unread.setValue([]);
        this.#pending.setValue([]);
      }
      this.#hub?.setWanted("chat", enabled);
    });
  }

  // Connected, and Chat is on. The connection can be open for Tasks alone.
  get #ready() {
    return this.#enabled && !!this.#hub?.connected;
  }

  messagesOf(channel: string) {
    return this.#messages.asObservablePart((list) => list.filter((m) => m.channel === channel));
  }

  /** Loads the conversation list, and keeps it current from then on. */
  async loadConversations() {
    this.#conversationsWanted = true;
    if (!this.#ready) return;

    try {
      this.#conversations.setValue(await this.#hub!.invoke<Conversation[]>("GetConversations"));
    } catch (error) {
      console.error("Chat: could not load conversations", error);
    }
  }

  // A new conversation can appear from any message, so reload rather than patch the list;
  // batched, as one message can bring several updates
  #reloadConversationsSoon() {
    if (!this.#conversationsWanted) return;
    clearTimeout(this.#reloadTimer);
    this.#reloadTimer = setTimeout(() => this.loadConversations(), 300);
  }

  async startDirectConversation(userKeys: string[]) {
    return await this.#invokeConversation("StartDirectConversation", userKeys);
  }

  async startGroupConversation(groupKey: string) {
    return await this.#invokeConversation("StartGroupConversation", groupKey);
  }

  async #invokeConversation(method: string, arg: unknown): Promise<Conversation> {
    if (!this.#ready) throw new Error("Not connected");

    const conversation = await this.#hub!.invoke<Conversation>(method, arg);
    if (!this.#conversations.getValue().some((c) => c.channel === conversation.channel)) {
      this.#conversations.appendOne(conversation);
    }
    return conversation;
  }

  hasPermission(permission: string) {
    return this.#permissions.asObservablePart((list) => list.includes(permission));
  }

  unreadOf(channel: string) {
    return this.#unread.asObservablePart((list) => list.find((c) => c.channel === channel));
  }

  /**
   * Marks the channel read. Call it only while the chat is actually on screen; the
   * server then clears the count in every tab the user has open.
   */
  async markRead(channel: string) {
    if (!this.#ready) return;

    await this.#hub!
      .invoke("MarkRead", channel)
      .catch((error) => console.error(`Chat: could not mark ${channel} read`, error));
  }

  joinChannel(channel: string) {
    if (this.#joined.has(channel)) return;
    this.#joined.add(channel);

    if (this.#ready) this.#join(channel);
  }

  /**
   * Sends a message. Rejects when there is no live connection or the server refuses it,
   * so the caller can keep the text and tell the user.
   */
  async sendMessage(channel: string, text: string): Promise<SendMessageResult> {
    if (!this.#ready) throw new Error("Not connected");

    return await this.#hub!.invoke<SendMessageResult>("SendMessage", channel, text);
  }

  /** Sends a message each recipient must confirm. Important ones hold the screen until they do. */
  async sendAnnouncement(channel: string, text: string, important: boolean): Promise<SendMessageResult> {
    if (!this.#ready) throw new Error("Not connected");

    return await this.#hub!.invoke<SendMessageResult>("SendAnnouncement", channel, text, important);
  }

  isPending(messageKey: string) {
    return this.#pending.asObservablePart((list) => list.some((m) => m.key === messageKey));
  }

  async confirm(messageKey: string) {
    await this.#hub?.invoke("Confirm", messageKey);
    this.#pending.removeOne(messageKey);
  }

  async getConfirmationStatus(messageKey: string) {
    return await this.#hub!.invoke<ConfirmationStatus>("GetConfirmationStatus", messageKey);
  }

  async remind(messageKey: string) {
    return await this.#hub!.invoke<number>("Remind", messageKey);
  }

  #onConfirmationRequested(message: ChatMessage) {
    this.#pending.appendOne(message);
    if (message.important) return;

    // Important ones open as a modal; the rest get a nudge unless that chat is on screen
    if (!this.#isChannelOnScreen(message.channel)) {
      this.getContext(UMB_NOTIFICATION_CONTEXT).then((notifications) =>
        notifications?.peek("warning", {
          data: {
            headline: this.#localize.term("powerToysChat_confirmationRequested", message.userName),
            message: toPlainText(message.message, this.#mentionables.getValue()),
          },
        })
      );
    }
  }

  // Opens the oldest unconfirmed important message, and opens it again if it's closed
  // without being confirmed
  async #showImportant(pending: ChatMessage[]) {
    if (this.#importantOpen) return;

    const next = pending.find((m) => m.important);
    if (!next) return;

    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
    if (!modalManager || this.#importantOpen) return;

    this.#importantOpen = next.key;
    const modal = modalManager.open(this, CHAT_IMPORTANT_MODAL, { data: { message: next } });
    this.#importantModal = modal;
    await modal.onSubmit().catch(() => undefined);
    this.#importantOpen = undefined;
    this.#importantModal = undefined;
    this.#showImportant(this.#pending.getValue());
  }

  /** Chat elements report when they show a channel and when they stop. */
  setChannelOpen(channel: string, open: boolean) {
    const count = (this.#openChannels.get(channel) ?? 0) + (open ? 1 : -1);
    if (count > 0) {
      this.#openChannels.set(channel, count);
    } else {
      this.#openChannels.delete(channel);
    }
  }

  #isChannelOnScreen(channel: string) {
    return this.#openChannels.has(channel) && document.visibilityState === "visible";
  }

  async #loadMentionables() {
    try {
      this.#mentionables.setValue(await this.#hub!.invoke<Mentionables>("GetMentionables"));
    } catch (error) {
      console.error("Chat: could not load users for mentions", error);
    }
  }

  async #onMention(message: ChatMessage) {
    if (this.#isChannelOnScreen(message.channel)) return;

    const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
    notifications?.peek("default", {
      data: {
        headline: this.#localize.term("powerToysChat_mentionedYou", message.userName),
        message: toPlainText(message.message, this.#mentionables.getValue()),
      },
    });
  }

  #listen(hub: PowerToysHubContext) {
    hub.on("history", (channel: string, history: ChatMessage[]) => {
      const others = this.#messages.getValue().filter((m) => m.channel !== channel);
      this.#messages.setValue([...others, ...history]);
    });

    hub.on("chat", (message: ChatMessage) => {
      this.#messages.appendOne(message);
      this.#conversations.updateOne(message.channel, { latest: message });
    });

    hub.on("mention", (message: ChatMessage) => this.#onMention(message));

    hub.on("pendingConfirmations", (messages: ChatMessage[]) => this.#pending.setValue(messages));
    hub.on("confirmationRequested", (message: ChatMessage) => this.#onConfirmationRequested(message));
    // Confirmed in another tab: close it here too
    hub.on("confirmed", (messageKey: string) => {
      this.#pending.removeOne(messageKey);
      if (this.#importantOpen === messageKey) this.#importantModal?.reject();
    });
    hub.on("confirmationChanged", (messageKey: string) => this.#confirmationChanges.setValue(messageKey));

    // The full set on connect, then one channel at a time as they change
    hub.on("unread", (counts: UnreadCount[]) => {
      this.#unread.setValue(counts.filter((c) => c.unread > 0));
    });

    hub.on("unreadChanged", (count: UnreadCount) => {
      this.#reloadConversationsSoon();
      if (count.unread > 0) {
        this.#unread.appendOne(count);
      } else {
        this.#unread.removeOne(count.channel);
      }
    });

    // Group membership is per connection, so join every channel again after a reconnect
    hub.onConnected(() => {
      if (!this.#enabled) return;
      for (const channel of this.#joined) this.#join(channel);
      this.#loadMentionables();
      this.#reloadConversationsSoon();
    });
  }

  #join(channel: string) {
    this.#hub!
      .invoke("JoinChannel", channel)
      .catch((error) => console.error(`Chat: could not join channel ${channel}`, error));
  }
}

export { ChatContext as api };
export default ChatContext;
