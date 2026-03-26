import { type IncomingMessage, type Server as HttpServer } from "node:http";
import { WebSocket, type RawData } from "ws";
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
    connect(input: WsConnectInput): Promise<{
        connectionId: string;
    }>;
    /**
     * Send a message over an established WebSocket connection.  The
     * `event` field is arbitrary and may be interpreted by higher
     * level handlers to determine routing on the server side.
     */
    send(input: WsSendInput): Promise<unknown>;
    /**
     * Gracefully close an existing WebSocket connection.  Implementations
     * should free any resources associated with the identified
     * connection.
     */
    close(input: WsCloseInput): Promise<unknown>;
}
export type WsMessageMap = Record<string, unknown>;
export type WsMessageScope = "broadcast" | "channel" | "client";
export type WsEnvelopeBase<TScope extends WsMessageScope> = TScope extends "broadcast" ? {
    scope: "broadcast";
    channelId?: undefined;
    targetId?: undefined;
} : TScope extends "channel" ? {
    scope: "channel";
    channelId: string;
    targetId?: undefined;
} : TScope extends "client" ? {
    scope: "client";
    targetId: string;
    channelId?: undefined;
} : never;
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
export interface TypedWebSocketServerOptions<TIncomingMap extends WsMessageMap, TOutgoingMap extends WsMessageMap, TClientData extends object = {}> {
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
    validateIncomingMessage?: (value: unknown) => value is WsMessageFromMap<TIncomingMap>;
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
export type WsHandlerMap<TIncomingMap extends Record<string, unknown>, TOutgoingMap extends Record<string, unknown>, TClientData extends object> = {
    [K in keyof TIncomingMap]?: (ctx: WsHandlerContext<TIncomingMap, TOutgoingMap, TClientData, K>) => void | Promise<void>;
};
export type WsHandlerContext<TIncomingMap extends Record<string, unknown>, TOutgoingMap extends Record<string, unknown>, TClientData extends object, K extends keyof TIncomingMap> = {
    client: WsConnectedClient<TClientData>;
    socket: WebSocket;
    type: K;
    data: TIncomingMap[K];
    message: Extract<WsMessageFromMap<TIncomingMap>, {
        type: K;
    }>;
    server: TypedWebSocketServer<TIncomingMap, TOutgoingMap, TClientData>;
};
export declare class TypedWebSocketServer<TIncomingMap extends WsMessageMap, TOutgoingMap extends WsMessageMap, TClientData extends object = {}> {
    private readonly httpServer;
    private readonly wsServer;
    private readonly clients;
    protected readonly options: TypedWebSocketServerOptions<TIncomingMap, TOutgoingMap, TClientData>;
    private readonly handlers;
    constructor(options?: TypedWebSocketServerOptions<TIncomingMap, TOutgoingMap, TClientData>);
    listen(port?: number, callback?: () => void): void;
    close(callback?: (error?: Error) => void): void;
    getClients(): WsConnectedClient<TClientData>[];
    getClientById(clientId: string): WsConnectedClient<TClientData> | null;
    getClientIds(): string[];
    joinChannel(clientId: string, channelId: string): boolean;
    leaveChannel(clientId: string, channelId: string): boolean;
    send<TType extends keyof TOutgoingMap>(message: Extract<WsMessageFromMap<TOutgoingMap>, {
        type: TType;
    }>): void;
    broadcast<TType extends keyof TOutgoingMap>(message: Extract<WsMessageFromMap<TOutgoingMap>, {
        type: TType;
    }>): void;
    sendToChannel<TType extends keyof TOutgoingMap>(channelId: string, message: Extract<WsMessageFromMap<TOutgoingMap>, {
        type: TType;
    }>): void;
    sendToClient<TType extends keyof TOutgoingMap>(clientId: string, message: Extract<WsMessageFromMap<TOutgoingMap>, {
        type: TType;
    }>): void;
    createHandlerContext<K extends keyof TIncomingMap>(ctx: {
        client: WsConnectedClient<TClientData>;
        socket: WebSocket;
        type: K;
        data: TIncomingMap[K];
        message: Extract<WsMessageFromMap<TIncomingMap>, {
            type: K;
        }>;
    }): WsHandlerContext<TIncomingMap, TOutgoingMap, TClientData, K>;
    protected createClientId(ctx: {
        socket: WebSocket;
        request: IncomingMessage;
    }): string;
    protected createClientData(ctx: {
        socket: WebSocket;
        request: IncomingMessage;
        clientId: string;
    }): TClientData;
    protected handleConnect(ctx: {
        socket: WebSocket;
        request: IncomingMessage;
        client: WsConnectedClient<TClientData>;
    }): void;
    protected handleDisconnect(ctx: {
        socket: WebSocket;
        client: WsConnectedClient<TClientData>;
        code: number;
        reason: Buffer;
    }): void;
    protected handleError(ctx: {
        socket: WebSocket;
        client: WsConnectedClient<TClientData> | null;
        error: Error;
    }): void;
    private dispatchTypedHandler;
    protected handleMessage(ctx: {
        raw: RawData;
        socket: WebSocket;
        client: WsConnectedClient<TClientData>;
        message: WsMessageFromMap<TIncomingMap>;
    }): Promise<void>;
    protected parseIncomingMessage(raw: RawData): WsMessageFromMap<TIncomingMap> | null;
    getConnectedClients(): WsConnectedClient<TClientData>[];
    private handleRawMessage;
    private sendSerialized;
}
