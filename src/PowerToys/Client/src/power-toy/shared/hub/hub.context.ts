import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { UMB_SERVER_CONTEXT } from "@umbraco-cms/backoffice/server";
import { UmbBooleanState } from "@umbraco-cms/backoffice/observable-api";
import {
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  type HubConnection,
  type IHttpConnectionOptions,
  type IRetryPolicy,
} from "@umbraco-cms/backoffice/external/signalr";

// Appended to the server URL. Matches PowerToysHubRoutes on the server.
const HUB_PATH = "/umbraco/powertoys/hub";

// Keep trying with backoff (up to 30 seconds apart) rather than giving up after a few
// attempts, so live updates come back by themselves once the server is reachable again.
const reconnectPolicy: IRetryPolicy = {
  nextRetryDelayInMilliseconds: (context) => Math.min(30_000, 1_000 * 2 ** context.previousRetryCount),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (...args: any[]) => void;

/**
 * One connection to the Power Toys hub for the whole backoffice, shared by the power toys that
 * need live updates (Chat, Tasks). Each says whether it wants the connection; it's open while
 * the user is signed in and at least one does. Follows Umbraco's own server event context:
 * connect only while authorized, and use the server's SignalR settings.
 */
export class PowerToysHubContext extends UmbContextBase {
  #connection?: HubConnection;
  #authContext?: typeof UMB_AUTH_CONTEXT.TYPE;
  #serverContext?: typeof UMB_SERVER_CONTEXT.TYPE;
  #isAuthorized = false;

  // Which power toys want the connection
  #wanted = new Set<string>();

  // Kept here rather than on the connection, so a new connection gets them all again
  #handlers = new Map<string, Set<Handler>>();
  #connectedCallbacks = new Set<() => void>();

  #isConnected = new UmbBooleanState(false);
  public readonly isConnected = this.#isConnected.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_POWER_TOYS_HUB_CONTEXT);

    this.consumeContext(UMB_AUTH_CONTEXT, (context) => {
      this.#authContext = context;
      this.#observeIsAuthorized();
    });

    this.consumeContext(UMB_SERVER_CONTEXT, (context) => {
      this.#serverContext = context;
      this.#observeIsAuthorized();
    });
  }

  /**
   * A power toy says whether it wants the connection. A newly interested one gets a fresh
   * connection, because the server sends each power toy's starting state when a connection opens.
   */
  setWanted(key: string, wanted: boolean) {
    if (wanted === this.#wanted.has(key)) return;

    if (wanted) {
      this.#wanted.add(key);
      // A connection still starting up will get the starting state anyway
      if (this.connected) this.#disconnect();
    } else {
      this.#wanted.delete(key);
    }

    this.#update();
  }

  /** Listens for a server message, on this connection and any later one. */
  on(method: string, handler: Handler) {
    let handlers = this.#handlers.get(method);
    if (!handlers) {
      handlers = new Set();
      this.#handlers.set(method, handlers);
    }
    handlers.add(handler);
    this.#connection?.on(method, handler);
  }

  /** Called each time a connection opens or comes back after a drop. */
  onConnected(callback: () => void) {
    this.#connectedCallbacks.add(callback);
    if (this.connected) callback();
  }

  get connected() {
    return this.#connection?.state === HubConnectionState.Connected;
  }

  /** Calls a hub method. Rejects when there's no live connection or the server refuses. */
  async invoke<T>(method: string, ...args: unknown[]): Promise<T> {
    if (!this.#connection || !this.connected) throw new Error("Not connected");
    return await this.#connection.invoke<T>(method, ...args);
  }

  #observeIsAuthorized() {
    if (!this.#authContext || !this.#serverContext) return;

    this.observe(
      this.#authContext.isAuthorized,
      (isAuthorized) => {
        if (isAuthorized === undefined) return;
        this.#isAuthorized = isAuthorized;
        this.#update();
      },
      "_observeIsAuthorized"
    );
  }

  #update() {
    if (this.#isAuthorized && this.#wanted.size > 0) {
      this.#connect();
    } else {
      this.#disconnect();
    }
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
      .withUrl(`${serverUrl}${HUB_PATH}`, options)
      .withAutomaticReconnect(reconnectPolicy)
      .build();

    this.#connection = connection;

    for (const [method, handlers] of this.#handlers) {
      for (const handler of handlers) connection.on(method, handler);
    }

    connection.onreconnecting(() => this.#setConnected(connection, false));
    connection.onreconnected(() => this.#setConnected(connection, true));
    connection.onclose(() => this.#setConnected(connection, false));

    connection
      .start()
      .then(() => this.#setConnected(connection, true))
      .catch((error) => {
        this.#setConnected(connection, false);
        console.error("Power Toys: failed to connect to the hub", error);
      });
  }

  #disconnect() {
    const connection = this.#connection;
    if (!connection) return;
    this.#connection = undefined;
    this.#isConnected.setValue(false);
    connection.stop();
  }

  // A superseded connection can still report state while it shuts down; only the active one counts
  #setConnected(connection: HubConnection, isConnected: boolean) {
    if (this.#connection !== connection) return;
    this.#isConnected.setValue(isConnected);
    if (isConnected) {
      for (const callback of this.#connectedCallbacks) callback();
    }
  }
}

export const UMB_POWER_TOYS_HUB_CONTEXT = new UmbContextToken<PowerToysHubContext>("PowerToys.Context.Hub");

export { PowerToysHubContext as api };
export default PowerToysHubContext;
