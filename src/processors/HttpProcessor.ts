import { GenericHttpHandler } from '../core/ProtocolHandlerCore';
import { BoundHandlers, HttpMethod } from '../types';

/**
 * The shape of an outgoing HTTP request accepted by the HttpProcessor
 * interface.  Implementations may choose to ignore unused fields
 * depending on their internal behaviour.  For example, a minimal
 * implementation might ignore `headers` entirely.  The `query`
 * property allows structu
export type {
  WsProcessor,
  WsConnectInput,
  WsSendInput,
  WsCloseInput,
} from './processors/WsProcessor';
red query parameters to be passed in a type
 * safe manner.
 */
export interface HttpRequestInput<R extends object> {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: R;
  query?: Record<string, string | number | boolean>;
}

/**
 * HttpProcessor defines the contract for executing raw HTTP requests.
 * The protocol handler uses an injected implementation of this
 * interface to perform the actual network operation, enabling the
 * calling code to remain agnostic of the underlying HTTP client
 * (fetch, axios, node's http module, etc.).
 */
export interface HttpProcessor<T extends Record<string, GenericHttpHandler<any>>> {
  /**
   * Execute an HTTP request.  The return value should be a promise
   * resolving to whatever data your handlers expect.  It is up to
   * the implementation to encode the body, append query parameters,
   * and parse the response appropriately.
   */
  request<R extends object>(input: HttpRequestInput<R>): Promise<R>;
  handlers: BoundHandlers<T>;
}
