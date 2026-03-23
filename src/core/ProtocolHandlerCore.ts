import { IncomingMessage, ServerResponse } from 'node:http';
import { TypedHttpServer, TypedHttpServerOptions, HttpRouteMap, TypedExpressHttpServer } from '../processors/HttpProcessor';
import { TypedWebSocketServer, TypedWebSocketServerOptions, WsMessageMap } from '../processors/WsProcessor';
import {
  HttpHandlerRequest,
  MaybePromise,
  ProtocolHandlerRequest,
  WsHandlerRequest,
} from '../types';

/**
 * Context passed to each handler.  The context exposes the low
 * level HTTP and WebSocket processors as well as default host
 * values.  Handlers use this object to perform protocol specific
 * operations without knowing how the underlying transport is
 * implemented.
 */
export interface HandlerContext<
  THttpRoutes extends HttpRouteMap = HttpRouteMap,
  TWsMessageMap extends WsMessageMap = WsMessageMap
> {
  http: TypedHttpServer<THttpRoutes> | TypedExpressHttpServer<THttpRoutes>;
  ws: TypedWebSocketServer<TWsMessageMap, TWsMessageMap, any>;
  node?: {
    req: IncomingMessage;
    res: ServerResponse;
  };
  defaults: {
    httpHost: string;
    wsHost: string;
  };
}

/**
 * Generic HTTP handler signature.  Each HTTP handler receives a
 * request of type `Req` and the shared context.  It returns a
 * value of type `Res` directly or wrapped in a Promise.  The
 * type parameterisation allows the library to infer request and
 * response shapes for different handlers.
 */
export type GenericHttpHandler<
  Req extends HttpHandlerRequest = HttpHandlerRequest,
  Res = unknown,
> = (
  req: Req,
  ctx: HandlerContext<any, any>
) => MaybePromise<Res>;

export type GenericWsHandler<
  Req extends WsHandlerRequest = WsHandlerRequest,
  Res = unknown,
> = (
  req: Req,
  ctx: HandlerContext<any, any>
) => MaybePromise<Res>;



// type WsHandlerMap<TWsHandlers extends object> = {
//   [K in keyof TWsHandlers]: TWsHandlers[K] extends GenericWsHandler
//     ? TWsHandlers[K]
//     : never;
// };

/**
 * Configuration required to instantiate the protocol handler core.
 * Users typically do not construct this class directly; instead
 * they call the factory function exported from the library.  The
 * generics THttpHandlers and TWsHandlers allow the type system to
 * infer the request and response shapes for each registered
 * handler.
 */
export interface ProtocolHandlerCoreConfig<
  THttpServerOpts extends HttpRouteMap,
  TWSServerOpts extends WsMessageMap
  > {
  http: TypedHttpServerOptions<THttpServerOpts>;
  ws: TypedWebSocketServerOptions<TWSServerOpts, TWSServerOpts, any>;
  httpRuntime?: 'node' | 'express';
  handlers?: {
    http?: Partial<Record<Extract<keyof THttpServerOpts, string>, GenericHttpHandler>>;
    ws?: Partial<Record<Extract<keyof TWSServerOpts, string>, GenericWsHandler>>;
  };
  defaults?: {
    httpHost?: string;
    wsHost?: string;
  };
}

/**
 * Core implementation of the protocol handler.  It takes care of
 * inferring the protocol based on request shape, normalising
 * requests by applying default hosts, and dispatching to the
 * appropriate handler.  Errors are thrown when a protocol or
 * handler cannot be resolved.
 */
export class ProtocolHandlerCore<
  THttpRoutes extends HttpRouteMap,
  TWsMessageMap extends WsMessageMap
> {
  private readonly httpHandlers: Map<string, GenericHttpHandler>;
  private readonly wsHandlers: Map<string, GenericWsHandler>;
  private readonly http: TypedHttpServer<THttpRoutes> | TypedExpressHttpServer<THttpRoutes>;
  private readonly ws: TypedWebSocketServer<TWsMessageMap, TWsMessageMap, any>;
  private readonly defaults: { httpHost: string; wsHost: string };

  constructor (config: ProtocolHandlerCoreConfig<THttpRoutes, TWsMessageMap>) {
    this.httpHandlers = new Map<string, GenericHttpHandler>();
    this.wsHandlers = new Map<string, GenericWsHandler>();

    for (const key in (config.handlers?.http ?? {})) {
      const handler = config.handlers?.http?.[key as Extract<keyof THttpRoutes, string>];
      if (!handler) continue;
      this.httpHandlers.set(key, handler);
    }

    for (const key in (config.handlers?.ws ?? {})) {
      const handler = config.handlers?.ws?.[key as Extract<keyof TWsMessageMap, string>];
      if (!handler) continue;
      this.wsHandlers.set(key, handler);
    }

    if ((config.httpRuntime ?? 'node') === 'express') {
      this.http = new TypedExpressHttpServer({
        routes: config.http.routes,
        handlers: config.http.handlers,
        host: config.http.host,
        port: config.http.port,
      });
    } else {
      this.http = new TypedHttpServer(config.http);
    }
    this.ws = new TypedWebSocketServer(config.ws);
    const httpHost = config.defaults?.httpHost ?? 'http://127.0.0.1';
    const wsHost = config.defaults?.wsHost ?? 'ws://127.0.0.1';
    this.defaults = { httpHost, wsHost };
  }


  /**
   * Infer the protocol of the provided request object based on
   * distinguishing properties.  HTTP requests must include a
   * `method` field and a string `endpoint`.  WebSocket requests
   * must include an `action` field of type WsAction.  If neither
   * set of fields is present or both are present (ambiguous), an
   * error is thrown.  This method could be extended to support
   * additional protocols by adding more branches.
   */
  private inferProtocol(req: ProtocolHandlerRequest | unknown): 'http' | 'ws' {
    const maybeObj = req as {
      method?: unknown;
      endpoint?: unknown;
      action?: unknown;
    };
    const hasMethod = typeof maybeObj?.method === 'string';
    const hasEndpoint = typeof maybeObj?.endpoint === 'string';
    const hasAction = typeof maybeObj?.action === 'string';
    const isHttpLike = hasMethod && hasEndpoint;
    const isWsLike = hasAction;
    if (isHttpLike && !isWsLike) return 'http';
    if (isWsLike && !isHttpLike) return 'ws';
    if (isHttpLike && isWsLike) {
      throw new Error(
        'Ambiguous request: contains both HTTP and WebSocket discriminators.'
      );
    }
    throw new Error('Unable to infer protocol from request properties.');
  }

  /**
   * Normalise a request by applying default hosts.  For HTTP
   * requests the default host is applied only if the caller has
   * not provided a full `url`.  The endpoint is concatenated with
   * the host to form the final URL.  For WebSocket connection
   * requests (action === "connect") the default WebSocket host is
   * applied if no URL is provided.  Other WebSocket actions pass
   * through unchanged.
   */
  private normaliseRequest<T extends string>(req: ProtocolHandlerRequest<T>): ProtocolHandlerRequest<T> {
    const protocol = this.inferProtocol(req);
    // Clone the request to avoid mutating the original object
    const result: ProtocolHandlerRequest<T> = { ...req } as ProtocolHandlerRequest<T>;
    if (protocol === 'http') {
      // For HTTP requests, build a full URL if one is not provided
      if ('endpoint' in result) {
        const httpResult = result as HttpHandlerRequest<T>;
        if (httpResult.url) {
          return httpResult;
        }
        const endpoint = httpResult.endpoint;
        let base = this.defaults.httpHost;
        // Ensure there is exactly one slash between host and endpoint
        if (endpoint.startsWith('/')) {
          base = base.replace(/\/$/, '');
        } else if (!base.endsWith('/')) {
          base += '/';
        }
        httpResult.url = `${base}${endpoint}`;
      }
    } else if (protocol === 'ws') {
      // For WebSocket connect, apply default host if no URL provided
      if ('action' in result && result.action === 'connect' && !result.url) {
        result.url = this.defaults.wsHost;
      }
    }
    return result;
  }

  /**
   * Dispatch the request to the appropriate handler based on its
   * inferred protocol.  This method performs normalisation first
   * then looks up the handler by name.  The shared context is
   * constructed here and passed into the handler.  If no handler
   * exists for the given name an error is thrown.
   */
  async dispatch<T extends string>(
    request: ProtocolHandlerRequest<T>,
    node?: { req: IncomingMessage; res: ServerResponse; }
  ): Promise<unknown> {
    const normalised = this.normaliseRequest(request);
    const protocol = this.inferProtocol(normalised);
    const handlerName = String(normalised.handler);
    const ctx:  HandlerContext<THttpRoutes, TWsMessageMap> = {
      http: this.http,
      ws: this.ws,
      node,
      defaults: this.defaults,
    };

    if (protocol === 'http') {
      const handler = this.httpHandlers.get(handlerName);
      if (!handler) {
        throw new Error(`No HTTP handler found for "${handlerName}"`);
      }

      return handler(normalised as HttpHandlerRequest, ctx);
    }

    if (protocol === 'ws') {
      const handler = this.wsHandlers.get(handlerName);
      if (!handler) {
        throw new Error(`No WebSocket handler found for "${handlerName}"`);
      }

      return handler(normalised as WsHandlerRequest, ctx);
    }

    // Should never reach here due to inferProtocol logic
    throw new Error('Unsupported protocol');
  }
}
