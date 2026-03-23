import { createServer, type IncomingMessage, type Server as HttpServer } from "node:http";
import { WebSocketServer as WsServer, WebSocket, type RawData } from "ws";
/**
 * Input required to establish a WebSocket connection.  The `url`
 * property defines the host to connect to.  The optional `protocols`
 * field allows negotiation of subprotocols in the WebSocket handshake.
 */
export interface WsConnectInput {
  url: string;
  protocols?: string | string[];
}


/**
 * Input required to send a message over an existing WebSocket
 * connection.  WebSocket implementations typically identify
 * connections via a client‑supplied identifier (e.g. a token or
 * handle) rather than by URL.  The `event` field may be used by
 * handlers to distinguish between different kinds of messages sent
 * through the same channel.
 */
export interface WsSendInput {
  connectionId: string;
  event: string;
  payload?: unknown;
}

/**
 * Input required to close an existing WebSocket connection.  Closing
 * codes and reasons are optional parameters defined by the WebSocket
 * specification.  Implementations may ignore either of these if
 * unsupported by the underlying library.
 */
export interface WsCloseInput {
  connectionId: string;
  code?: number;
  reason?: string;
}

/**
 * WsProcessor defines the contract for interacting with WebSocket
 * connections.  The protocol handler delegates all low level
 * connection management and message transmission to an instance of
 * this interface, allowing flexible integration with different
 * WebSocket libraries or custom implementations.
 */
export interface WsProcessor {
  /**
   * Open a new WebSocket connection.  Implementations should
   * allocate and return a unique identifier for the connection,
   * which will be passed back to subsequent calls to `send` or
   * `close`.
   */
  connect (input: WsConnectInput): Promise<{ connectionId: string; }>;

  /**
   * Send a message over an established WebSocket connection.  The
   * `event` field is arbitrary and may be interpreted by higher
   * level handlers to determine routing on the server side.
   */
  send (input: WsSendInput): Promise<unknown>;

  /**
   * Gracefully close an existing WebSocket connection.  Implementations
   * should free any resources associated with the identified
   * connection.
   */
  close (input: WsCloseInput): Promise<unknown>;
}

export type WsMessageMap = Record<string, unknown>;

export type WsMessageScope = "broadcast" | "channel" | "client";

export type WsEnvelopeBase<TScope extends WsMessageScope> = TScope extends "broadcast" ? { scope: "broadcast"; channelId?: undefined, targetId?: undefined; } : TScope extends "channel" ? { scope: "channel"; channelId: string; targetId?: undefined; } : TScope extends "client" ? { scope: "client"; targetId: string; channelId?: undefined; } : never;
  // | {
  //   scope: "broadcast";
  //   channelId?: undefined;
  //   targetId?: undefined;
  // }
  // | {
  //   scope: "channel";
  //   channelId: string;
  //   targetId?: undefined;
  // }
  // | {
  //   scope: "client";
  //   targetId: string;
  //   channelId?: undefined;
  // };

export type WsMessageFromMap<TMap extends WsMessageMap> = {
  [K in keyof TMap]: {
    type: K;
    data: TMap[K];
  } & WsEnvelopeBase;
}[keyof TMap];

export interface WsConnectedClient<TClientData extends object = {}> {
  id: string;
  socket: WebSocket;
  channels: Set<string>;
  data: TClientData;
}

export interface TypedWebSocketServerOptions<
  TIncomingMap extends WsMessageMap,
  TOutgoingMap extends WsMessageMap,
  TClientData extends object = {}
> {
  port?: number;
  path?: string;
  httpServer?: HttpServer;
  createClientId?: (ctx: {
    socket: WebSocket;
    request: IncomingMessage;
  }) => string;
  createClientData?: (ctx: {
    socket: WebSocket;
    request: IncomingMessage;
    clientId: string;
  }) => TClientData;
  validateIncomingMessage?: (
    value: unknown
  ) => value is WsMessageFromMap<TIncomingMap>;
  onConnect?: (ctx: {
    socket: WebSocket;
    request: IncomingMessage;
    client: WsConnectedClient<TClientData>;
  }) => void;
  onDisconnect?: (ctx: {
    socket: WebSocket;
    client: WsConnectedClient<TClientData>;
    code: number;
    reason: Buffer;
  }) => void;
  onMessage?: (ctx: {
    raw: RawData;
    socket: WebSocket;
    client: WsConnectedClient<TClientData>;
    message: WsMessageFromMap<TIncomingMap>;
  }) => void;
  onError?: (ctx: {
    socket: WebSocket;
    client: WsConnectedClient<TClientData> | null;
    error: Error;
  }) => void;
  handlers: WsHandlerMap<TIncomingMap, TOutgoingMap, TClientData>;
}
export type WsHandlerMap<
  TIncomingMap extends Record<string, unknown>,
  TOutgoingMap extends Record<string, unknown>,
  TClientData extends object
> = {
    [K in keyof TIncomingMap]?: (
      ctx: WsHandlerContext<TIncomingMap, TOutgoingMap, TClientData, K>
    ) => void | Promise<void>;
  };

export type WsHandlerContext<
  TIncomingMap extends Record<string, unknown>,
  TOutgoingMap extends Record<string, unknown>,
  TClientData extends object,
  K extends keyof TIncomingMap
> = {
  client: WsConnectedClient<TClientData>;
  socket: WebSocket;
  type: K;
  data: TIncomingMap[K];
  message: Extract<WsMessageFromMap<TIncomingMap>, { type: K; }>;
  server: TypedWebSocketServer<TIncomingMap, TOutgoingMap, TClientData>;
};

export class TypedWebSocketServer<
  TIncomingMap extends WsMessageMap,
  TOutgoingMap extends WsMessageMap,
  TClientData extends object = {}
> {
  private readonly httpServer: HttpServer;
  private readonly wsServer: WsServer;
  private readonly clients = new Map<string, WsConnectedClient<TClientData>>();
  protected readonly options: TypedWebSocketServerOptions<
    TIncomingMap,
    TOutgoingMap,
    TClientData
  >;
  private readonly handlers: WsHandlerMap<TIncomingMap, TOutgoingMap, TClientData>;

  public constructor (
    options: TypedWebSocketServerOptions<
      TIncomingMap,
      TOutgoingMap,
      TClientData
    > = {
        handlers: {}
      }
  ) {
    this.options = options;
    this.handlers = options.handlers;
    this.httpServer = options.httpServer ?? createServer();

    this.wsServer = new WsServer({
      server: this.httpServer,
      path: options.path ?? "/ws",
    });

    this.wsServer.on("connection", (socket, request) => {
      const clientId = this.createClientId({ socket, request });
      const clientData = this.createClientData({
        socket,
        request,
        clientId,
      });

      const client: WsConnectedClient<TClientData> = {
        id: clientId,
        socket,
        channels: new Set<string>(),
        data: clientData,
      };

      this.clients.set(client.id, client);

      this.handleConnect({ socket, request, client });

      socket.on("message", (raw) => {
        this.handleRawMessage(client, raw);
      });

      socket.on("close", (code, reason) => {
        this.clients.delete(client.id);
        this.handleDisconnect({
          socket,
          client,
          code,
          reason,
        });
      });

      socket.on("error", (error) => {
        this.handleError({
          socket,
          client,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
    });
  }

  public listen (port?: number, callback?: () => void): void {
    const resolvedPort = port ?? this.options.port;
    if (typeof resolvedPort !== "number") {
      throw new Error("No port provided.");
    }

    this.httpServer.listen(resolvedPort, callback);
  }

  public close (callback?: (error?: Error) => void): void {
    this.wsServer.close((wsError) => {
      this.httpServer.close((httpError) => {
        callback?.(wsError ?? httpError ?? undefined);
      });
    });
  }

  public getClients (): WsConnectedClient<TClientData>[] {
    return Array.from(this.clients.values());
  }

  public getClientById (clientId: string): WsConnectedClient<TClientData> | null {
    return this.clients.get(clientId) ?? null;
  }

  public getClientIds (): string[] {
    return Array.from(this.clients.keys());
  }

  public joinChannel (clientId: string, channelId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    client.channels.add(channelId);
    return true;
  }

  public leaveChannel (clientId: string, channelId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    client.channels.delete(channelId);
    return true;
  }

  public send<TType extends keyof TOutgoingMap> (
    message: Extract<WsMessageFromMap<TOutgoingMap>, { type: TType; }>
  ): void {
    switch (message.scope) {
      case "broadcast":
        this.broadcast(message);
        return;
      case "channel":
        this.sendToChannel(message.channelId, message);
        return;
      case "client":
        this.sendToClient(message.targetId, message);
        return;
    }
  }

  public broadcast<TType extends keyof TOutgoingMap> (
    message: Extract<WsMessageFromMap<TOutgoingMap>, { type: TType; }>
  ): void {
    const serialized = JSON.stringify(message);

    for (const client of this.clients.values()) {
      this.sendSerialized(client.socket, serialized);
    }
  }

  public sendToChannel<TType extends keyof TOutgoingMap> (
    channelId: string,
    message: Extract<WsMessageFromMap<TOutgoingMap>, { type: TType; }>
  ): void {
    const serialized = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (!client.channels.has(channelId)) continue;
      this.sendSerialized(client.socket, serialized);
    }
  }

  public sendToClient<TType extends keyof TOutgoingMap> (
    clientId: string,
    message: Extract<WsMessageFromMap<TOutgoingMap>, { type: TType; }>
  ): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    this.sendSerialized(client.socket, JSON.stringify(message));
  }

      // client: this.getClientById(key) as WsConnectedClient<TClientData>,
      // socket: this.getClientById(key)?.socket as WebSocket,
      // type: key,
      // data: this.getClientById(key)?.data as TIncomingMap[K],
      // message: {
      //   type: key,
      //   data: this.getClientById(key)?.data as TIncomingMap[K],
      //   scope: "client",
      //   targetId: key,
      // } as Extract<WsMessageFromMap<TIncomingMap>, { type: K; }>,
      // },
      // server: this,


  public createHandlerContext<K extends keyof TIncomingMap> (ctx: {
    client: WsConnectedClient<TClientData>;
    socket: WebSocket;
    type: K;
    data: TIncomingMap[K];
    message: Extract<WsMessageFromMap<TIncomingMap>, { type: K; }>;
  }): WsHandlerContext<TIncomingMap, TOutgoingMap, TClientData, K> {
    return {
      client: ctx.client,
      socket: ctx.socket,
      type: ctx.type,
      data: ctx.data,
      message: ctx.message,
      server: this,
    };
  }

  protected createClientId (ctx: {
    socket: WebSocket;
    request: IncomingMessage;
  }): string {
    if (this.options.createClientId) {
      return this.options.createClientId(ctx);
    }

    return crypto.randomUUID();
  }

  protected createClientData (ctx: {
    socket: WebSocket;
    request: IncomingMessage;
    clientId: string;
  }): TClientData {
    if (this.options.createClientData) {
      return this.options.createClientData(ctx);
    }

    return {} as TClientData;
  }

  protected handleConnect (ctx: {
    socket: WebSocket;
    request: IncomingMessage;
    client: WsConnectedClient<TClientData>;
  }): void {
    this.options.onConnect?.(ctx);
  }

  protected handleDisconnect (ctx: {
    socket: WebSocket;
    client: WsConnectedClient<TClientData>;
    code: number;
    reason: Buffer;
  }): void {
    this.options.onDisconnect?.(ctx);
  }

  protected handleError (ctx: {
    socket: WebSocket;
    client: WsConnectedClient<TClientData> | null;
    error: Error;
  }): void {
    this.options.onError?.(ctx);
  }
  private async dispatchTypedHandler<K extends keyof TIncomingMap> (
    type: K,
    ctx: {
      raw: RawData;
      socket: WebSocket;
      client: WsConnectedClient<TClientData>;
      message: Extract<WsMessageFromMap<TIncomingMap>, { type: K; }>;
    }
  ): Promise<void> {
    const handler = this.options.handlers?.[type] as | ((ctx: WsHandlerContext<TIncomingMap, TOutgoingMap, TClientData, K>) => void | Promise<void>)
      | undefined;
    if (!handler) return;

    await handler(this.createHandlerContext({
      client: ctx.client,
      socket: ctx.socket,
      type,
      data: ctx.message.data as TIncomingMap[K],
      message: ctx.message,
    }));
  }
  protected async handleMessage (ctx: {
    raw: RawData;
    socket: WebSocket;
    client: WsConnectedClient<TClientData>;
    message: WsMessageFromMap<TIncomingMap>;
  }): Promise<void> {
    this.options.onMessage?.(ctx);
    await this.dispatchTypedHandler(ctx.message.type as keyof TIncomingMap, ctx as any);
  }

  protected parseIncomingMessage (raw: RawData): WsMessageFromMap<TIncomingMap> | null {
    try {
      const text = typeof raw === "string" ? raw : raw.toString();
      const parsed = JSON.parse(text) as unknown;

      if (this.options.validateIncomingMessage) {
        return this.options.validateIncomingMessage(parsed) ? parsed : null;
      }

      return parsed as WsMessageFromMap<TIncomingMap>;
    } catch {
      return null;
    }
  }

  public getConnectedClients (): WsConnectedClient<TClientData>[] {
    return Array.from(this.clients.values());
  }
  private handleRawMessage (
    client: WsConnectedClient<TClientData>,
    raw: RawData
  ): void {
    const message = this.parseIncomingMessage(raw);
    if (!message) return;

    this.handleMessage({
      raw,
      socket: client.socket,
      client,
      message,
    });
  }

  private sendSerialized (socket: WebSocket, payload: string): void {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(payload);
  }
}
