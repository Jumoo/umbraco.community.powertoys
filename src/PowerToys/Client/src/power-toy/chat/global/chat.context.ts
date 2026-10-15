import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { UMB_SERVER_CONTEXT } from "@umbraco-cms/backoffice/server";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UmbArrayState, UmbBooleanState, UmbObjectState, UmbStringState } from "@umbraco-cms/backoffice/observable-api";
import {
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  type HubConnection,
  type IHttpConnectionOptions,
  type IRetryPolicy,
} from "@umbraco-cms/backoffice/external/signalr";
import { CHAT_HUB_PATH, CHAT_POWER_TOY_ALIAS } from "../constants";
import { UMB_POWER_TOY_CONTEXT } from "../../power-toy.context.js";
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

// Keep trying with backoff (up to 30 seconds apart) rather than giving up after a few
// attempts, so the chat comes back by itself once the server is reachable again.
const reconnectPolicy: IRetryPolicy = {
  nextRetryDelayInMilliseconds: (context) => Math.min(30_000, 1_000 * 2 ** context.previousRetryCount),
};

// One hub connection for the whole backoffice, shared by the header app, the global
// modal and every document workspace. Follows the pattern of Umbraco's own server
// event context: connect only while authorized, and use the server's SignalR settings.
export class ChatContext extends UmbContextBase {
  #connection?: HubConnection;
  #authContext?: typeof UMB_AUTH_CONTEXT.TYPE;
  #serverContext?: typeof UMB_SERVER_CONTEXT.TYPE;
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

  // The saved document open in a workspace right now, for the sidebar's "This page" chat.
  // Set by the document workspace context, cleared when the workspace closes.
  #currentDocument = new UmbStringState(undefined);
  public readonly currentDocument = this.#currentDocument.asObservable();

  // The power toy's enabled flag. The hub only connects while it's on.
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

    this.consumeContext(UMB_AUTH_CONTEXT, (context) => {
      this.#authContext = context;
      this.#observeIsAuthorized();
    });

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      if (!context) return;
      this.observe(
        context.currentUser,
        (user) => this.#permissions.setValue(user?.fallbackPermissions ?? []),
        "_permissions"
      );
    });

    this.observe(this.pending, (pending) => this.#showImportant(pending), "_showImportant");

    this.consumeContext(UMB_SERVER_CONTEXT, (context) => {
      this.#serverContext = context;
      this.#observeIsAuthorized();
    });

    // The shared enabled state starts out true until its first fetch lands, so wait for a
    // real answer before connecting, rather than trying a hub that will turn us away
    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      if (!context) return;
      let known = false;
      const setEnabled = (enabled: boolean) => {
        this.#enabled = enabled;
        this.#observeIsAuthorized();
      };
      context.isEnabled(CHAT_POWER_TOY_ALIAS).then((enabled) => {
        known = true;
        setEnabled(enabled);
      });
      this.observe(
        context.observeEnabled(CHAT_POWER_TOY_ALIAS),
        (enabled) => {
          if (known) setEnabled(enabled);
        },
        "_enabled"
      );
    });
  }

  /** The document workspace reports the document it has open, and undefined when it closes. */
  setCurrentDocument(unique: string | undefined) {
    this.#currentDocument.setValue(unique);
  }

  /** Clears the current document only if it's still the one given, so closing an old workspace after a new one opened doesn't clear the new one. */
  clearCurrentDocument(unique: string) {
    if (this.#currentDocument.getValue() === unique) this.#currentDocument.setValue(undefined);
  }

  messagesOf(channel: string) {
    return this.#messages.asObservablePart((list) => list.filter((m) => m.channel === channel));
  }

  /** Loads the conversation list, and keeps it current from then on. */
  async loadConversations() {
    this.#conversationsWanted = true;
    if (this.#connection?.state !== HubConnectionState.Connected) return;

    try {
      this.#conversations.setValue(await this.#connection.invoke<Conversation[]>("GetConversations"));
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
    if (this.#connection?.state !== HubConnectionState.Connected) {
      throw new Error("Not connected");
    }

    const conversation = await this.#connection.invoke<Conversation>(method, arg);
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
    if (this.#connection?.state !== HubConnectionState.Connected) return;

    await this.#connection
      .invoke("MarkRead", channel)
      .catch((error) => console.error(`Chat: could not mark ${channel} read`, error));
  }

  joinChannel(channel: string) {
    if (this.#joined.has(channel)) return;
    this.#joined.add(channel);

    if (this.#connection?.state === HubConnectionState.Connected) {
      this.#join(this.#connection, channel);
    }
  }

  /**
   * Sends a message. Rejects when there is no live connection or the server refuses it,
   * so the caller can keep the text and tell the user.
   */
  async sendMessage(channel: string, text: string): Promise<SendMessageResult> {
    if (this.#connection?.state !== HubConnectionState.Connected) {
      throw new Error("Not connected");
    }

    return await this.#connection.invoke<SendMessageResult>("SendMessage", channel, text);
  }

  /** Sends a message each recipient must confirm. Important ones hold the screen until they do. */
  async sendAnnouncement(channel: string, text: string, important: boolean): Promise<SendMessageResult> {
    if (this.#connection?.state !== HubConnectionState.Connected) {
      throw new Error("Not connected");
    }

    return await this.#connection.invoke<SendMessageResult>("SendAnnouncement", channel, text, important);
  }

  isPending(messageKey: string) {
    return this.#pending.asObservablePart((list) => list.some((m) => m.key === messageKey));
  }

  async confirm(messageKey: string) {
    await this.#connection?.invoke("Confirm", messageKey);
    this.#pending.removeOne(messageKey);
  }

  async getConfirmationStatus(messageKey: string) {
    return await this.#connection!.invoke<ConfirmationStatus>("GetConfirmationStatus", messageKey);
  }

  async remind(messageKey: string) {
    return await this.#connection!.invoke<number>("Remind", messageKey);
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

  async #loadMentionables(connection: HubConnection) {
    try {
      this.#mentionables.setValue(await connection.invoke<Mentionables>("GetMentionables"));
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

  #observeIsAuthorized() {
    if (!this.#authContext || !this.#serverContext) return;

    this.observe(
      this.#authContext.isAuthorized,
      (isAuthorized) => {
        if (isAuthorized === undefined) return;

        if (isAuthorized && this.#enabled) {
          this.#connect();
        } else {
          this.#disconnect();
        }
      },
      "_observeIsAuthorized"
    );
  }

  #connect() {
    if (this.#connection) return;

    const serverUrl = this.#serverContext?.getServerUrl();
    if (!serverUrl) return;

    // Backoffice auth is cookie based, so the token value is a placeholder, as in Umbraco's own hubs
    const options: IHttpConnectionOptions = { accessTokenFactory: () => "[redacted]" };

    if (this.#serverContext?.getServerConnection()?.getSignalRSkipNegotiation()) {
      options.skipNegotiation = true;
      options.transport = HttpTransportType.WebSockets;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${serverUrl}${CHAT_HUB_PATH}`, options)
      .withAutomaticReconnect(reconnectPolicy)
      .build();

    this.#connection = connection;

    connection.on("history", (channel: string, history: ChatMessage[]) => {
      const others = this.#messages.getValue().filter((m) => m.channel !== channel);
      this.#messages.setValue([...others, ...history]);
    });

    connection.on("chat", (message: ChatMessage) => {
      this.#messages.appendOne(message);
      this.#conversations.updateOne(message.channel, { latest: message });
    });

    connection.on("mention", (message: ChatMessage) => this.#onMention(message));

    connection.on("pendingConfirmations", (messages: ChatMessage[]) => this.#pending.setValue(messages));
    connection.on("confirmationRequested", (message: ChatMessage) => this.#onConfirmationRequested(message));
    // Confirmed in another tab: close it here too
    connection.on("confirmed", (messageKey: string) => {
      this.#pending.removeOne(messageKey);
      if (this.#importantOpen === messageKey) this.#importantModal?.reject();
    });
    connection.on("confirmationChanged", (messageKey: string) => this.#confirmationChanges.setValue(messageKey));

    // The full set on connect, then one channel at a time as they change
    connection.on("unread", (counts: UnreadCount[]) => {
      this.#unread.setValue(counts.filter((c) => c.unread > 0));
    });

    connection.on("unreadChanged", (count: UnreadCount) => {
      this.#reloadConversationsSoon();
      if (count.unread > 0) {
        this.#unread.appendOne(count);
      } else {
        this.#unread.removeOne(count.channel);
      }
    });

    // Group membership is per connection, so join every channel again after a reconnect
    connection.onreconnecting(() => this.#setConnected(connection, false));
    connection.onreconnected(() => {
      this.#setConnected(connection, true);
      this.#joinAll(connection);
      this.#loadMentionables(connection);
      this.#reloadConversationsSoon();
    });
    connection.onclose(() => this.#setConnected(connection, false));

    connection
      .start()
      .then(() => {
        this.#setConnected(connection, true);
        this.#joinAll(connection);
        this.#loadMentionables(connection);
        this.#reloadConversationsSoon();
      })
      .catch((error) => {
        this.#setConnected(connection, false);
        console.error("Chat: failed to connect to the chat hub", error);
      });
  }

  #disconnect() {
    const connection = this.#connection;
    this.#connection = undefined;
    this.#isConnected.setValue(false);
    this.#unread.setValue([]);
    connection?.stop();
  }

  // A superseded connection can still report state while it shuts down; only the active one counts
  #setConnected(connection: HubConnection, isConnected: boolean) {
    if (this.#connection === connection) {
      this.#isConnected.setValue(isConnected);
    }
  }

  #joinAll(connection: HubConnection) {
    for (const channel of this.#joined) {
      this.#join(connection, channel);
    }
  }

  #join(connection: HubConnection, channel: string) {
    connection
      .invoke("JoinChannel", channel)
      .catch((error) => console.error(`Chat: could not join channel ${channel}`, error));
  }
}

export { ChatContext as api };
export default ChatContext;
