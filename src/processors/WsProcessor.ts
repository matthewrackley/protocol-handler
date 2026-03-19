import { GenericWsHandler } from '../core/ProtocolHandlerCore';
import { BoundHandlers } from '../types';

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
export interface WsSendInput<R extends object> {
  connectionId: string;
  event: string;
  payload?: R;
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

export interface WsListenerInput<R extends object> {
  connectionId: string;
  event: string;
  payload?: R;
}

/**
 * WsProcessor defines the contract for interacting with WebSocket
 * connections.  The protocol handler delegates all low level
 * connection management and message transmission to an instance of
 * this interface, allowing flexible integration with different
 * WebSocket libraries or custom implementations.
 */
export interface WsProcessor<R extends Record<string, GenericWsHandler<any>>> {
  /**
   * Open a new WebSocket connection.  Implementations should
   * allocate and return a unique identifier for the connection,
   * which will be passed back to subsequent calls to `send` or
   * `close`.
   */
  connect(input: WsConnectInput): Promise<{ connectionId: string }>;

  /**
   * Send a message over an established WebSocket connection.  The
   * `event` field is arbitrary and may be interpreted by higher
   * level handlers to determine routing on the server side.
   */
  send<R extends object>(input: WsSendInput<R>): Promise<R>;

  /**
   * Gracefully close an existing WebSocket connection.  Implementations
   * should free any resources associated with the identified
   * connection.
   */
  close(input: WsCloseInput): Promise<unknown>;
  handlers: BoundHandlers<R>;

  /**
   * Register a listener for incoming WebSocket messages.  The
   * protocol handler will invoke this listener whenever a message is
   * received on any active connection, allowing the handler to route
   * the message to the appropriate high level handler based on its
   * content.
   */

  on(type: 'message', listener: <R extends object>(input: WsListenerInput<R>) => void): void;
  once(type: 'message', listener: <R extends object>(input: WsListenerInput<R>) => void): void;
}
