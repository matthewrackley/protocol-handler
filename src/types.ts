/*
 * Common types used throughout the protocol handler library.
 *
 * The HttpMethod union represents the set of valid HTTP methods accepted
 * by the library. WebSocket actions are represented by WsAction.  These
 * enums help constrain user input and improve type safety across the
 * request routing logic.
 */

/**
 * Valid HTTP methods recognised by the protocol handler.  Additional
 * methods may be added here if your application needs to support
 * custom verbs.
 */
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'UPDATE';

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
export interface RoutedRequest<T> {
  handler: T;
}

/**
 * Canonical HTTP request shape accepted by protocol handlers.
 *
 * `endpoint` is required because the core normaliser can derive `url`
 * from endpoint + default host when `url` is omitted.
 */
export interface HttpHandlerRequest<T> extends RoutedRequest<T> {
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
export interface WsConnectHandlerRequest<T> extends RoutedRequest<T> {
  action: 'connect';
  url?: string;
  protocols?: string | string[];
}

/**
 * Canonical WebSocket send request accepted by protocol handlers.
 */
export interface WsSendHandlerRequest<T> extends RoutedRequest<T> {
  action: 'send';
  connectionId: string;
  event: string;
  payload?: unknown;
}

/**
 * Canonical WebSocket close request accepted by protocol handlers.
 */
export interface WsCloseHandlerRequest<T> extends RoutedRequest<T> {
  action: 'close';
  connectionId: string;
  code?: number;
  reason?: string;
}

/**
 * Canonical WebSocket request union accepted by protocol handlers.
 */
export type WsHandlerRequest<T> =
  | WsConnectHandlerRequest<T>
  | WsSendHandlerRequest<T>
  | WsCloseHandlerRequest<T>;

/**
 * Canonical protocol request union accepted by dispatch.
 */
export type ProtocolHandlerRequest<T> = HttpHandlerRequest<T> | WsHandlerRequest<T>;

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


export type AnyHandler = (...args: any[]) => any;
export type RemoveCtx<F> =
  F extends (ctx: any, ...args: infer A) => infer R
    ? (...args: A) => R
    : F extends (...args: infer A) => infer R
    ? (...args: A) => R
    : never;

export type BoundHandlers<F extends Record<string, AnyHandler>> = {
  [K in keyof F]: RemoveCtx<F[K]>;
};

export type Handler<
  T extends object,
  F extends Record<string, AnyHandler>
> = Omit<T, "handlers"> & {
  handlers: BoundHandlers<F>;
};


function createFunc<
  T extends object,
  F extends Record<string, (ctx: T, ...args: any[]) => any>
>(
  ctx: T,
  handlers: F
): Handler<T, F> {
  const boundHandlers = {} as BoundHandlers<F>;

  for (const key in handlers) {
    const handler = handlers[key];
    boundHandlers[key] = ((...args: any[]) => handler(ctx, ...args)) as BoundHandlers<F>[typeof key];
  }

  return {
    ...ctx,
    handlers: boundHandlers,
  } as Handler<T, F>;
}
