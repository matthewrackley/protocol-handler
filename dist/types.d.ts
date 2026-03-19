/**
 * Valid HTTP methods recognised by the protocol handler.  Additional
 * methods may be added here if your application needs to support
 * custom verbs.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/**
 * Valid WebSocket actions used to discriminate between connection
 * lifecycle operations and message sending.  These values correspond
 * to typical WebSocket interactions: establishing a connection,
 * sending data, and closing the connection.
 */
export type WsAction = 'connect' | 'send' | 'close';
/**
 * Base fields required by routed handler requests.
 */
export interface RoutedRequest {
    handler: string;
}
/**
 * Canonical HTTP request shape accepted by protocol handlers.
 *
 * `endpoint` is required because the core normaliser can derive `url`
 * from endpoint + default host when `url` is omitted.
 */
export interface HttpHandlerRequest extends RoutedRequest {
    method: HttpMethod;
    endpoint: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string | number | boolean>;
}
/**
 * Canonical WebSocket connect request accepted by protocol handlers.
 */
export interface WsConnectHandlerRequest extends RoutedRequest {
    action: 'connect';
    url?: string;
    protocols?: string | string[];
}
/**
 * Canonical WebSocket send request accepted by protocol handlers.
 */
export interface WsSendHandlerRequest extends RoutedRequest {
    action: 'send';
    connectionId: string;
    event: string;
    payload?: unknown;
}
/**
 * Canonical WebSocket close request accepted by protocol handlers.
 */
export interface WsCloseHandlerRequest extends RoutedRequest {
    action: 'close';
    connectionId: string;
    code?: number;
    reason?: string;
}
/**
 * Canonical WebSocket request union accepted by protocol handlers.
 */
export type WsHandlerRequest = WsConnectHandlerRequest | WsSendHandlerRequest | WsCloseHandlerRequest;
/**
 * Canonical protocol request union accepted by dispatch.
 */
export type ProtocolHandlerRequest = HttpHandlerRequest | WsHandlerRequest;
/**
 * Generic object response envelope for consumers who prefer
 * consistent object-based responses.
 */
export interface ResponseEnvelope<TData = unknown> {
    ok: boolean;
    data?: TData;
    error?: string;
}
/**
 * Helper type to represent a promise or a synchronous value.  Several
 * handler signatures accept or return MaybePromise<T> to allow both
 * synchronous and asynchronous implementations.
 */
export type MaybePromise<T> = T | Promise<T>;
