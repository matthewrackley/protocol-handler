import {
  GenericHttpHandler,
  GenericWsHandler,
  ProtocolHandlerCore,
  ProtocolHandlerCoreConfig,
} from '../core/ProtocolHandlerCore';
import { AnyHandler, BoundHandlers, ProtocolHandlerRequest, WsHandlerRequest } from '../types';
import { StringKeyOf } from '../../dist/core/ProtocolHandlerCore';

type HandlerParams<THandler extends AnyHandler> = THandler extends (...args: infer U) => any ? U : never;
type HandlerResult<THandler extends AnyHandler> = ReturnType<THandler>;

type HttpHandlerMap<THttpHandlers extends object> = {
  [K in keyof THttpHandlers]: THttpHandlers[K] extends GenericHttpHandler
    ? THttpHandlers[K]
    : never;
};

type WsHandlerMap<TWsHandlers extends object> = {
  [K in keyof TWsHandlers]: TWsHandlers[K] extends GenericWsHandler
    ? TWsHandlers[K]
    : never;
};

type HttpApi<THttpHandlers extends object> = {
  [K in keyof THttpHandlers extends string ? keyof THttpHandlers : never]: (
    req: ProtocolHandlerRequest<K>
  ) => HandlerResult<HttpHandlerMap<THttpHandlers>[K]>;
};

type WsApi<TWsHandlers extends object> = {
  [K in keyof TWsHandlers extends string ? keyof TWsHandlers : never]: (
    req: HandlerParams<WsHandlerMap<TWsHandlers>[K]>[0]
  ) => HandlerResult<WsHandlerMap<TWsHandlers>[K]>;
};

/**
 * Build a strongly typed protocol handler tailored to a specific set
 * of HTTP and WebSocket handlers.  The returned object exposes a
 * `handle` method that accepts raw request objects as well as
 * shorthand methods grouped under `http` and `ws` namespaces for
 * calling individual handlers directly.
 *
 * The type parameters THttpHandlers and TWsHandlers capture the
 * mapping of handler names to functions.  The factory infers the
 * request and response types for each handler to provide
 * autocomplete and type safety in consumer code.
 */
export function createProtocolHandler<
  THttpHandlers extends Record<string, GenericHttpHandler<any>>,
  TWsHandlers extends Record<string, GenericWsHandler<any>>
>(config: ProtocolHandlerCoreConfig<THttpHandlers, TWsHandlers>) {
  const core = new ProtocolHandlerCore(config);

  // Build the HTTP API.  For each handler name, produce a
  // function that calls the underlying handler via the core
  // dispatch method.  The handler name is injected onto the
  // request object to aid in routing.  Note that we cast
  // explicitly to ensure TypeScript infers the parameter and
  // return types correctly.
  const httpApi = {} as HttpApi<THttpHandlers>;
  (Object.keys(config.httpHandlers) as (keyof THttpHandlers)[]).forEach(
    (key) => {
      httpApi[key as typeof key extends string ? typeof key : never] = ((
        req: ProtocolHandlerRequest<typeof key extends string ? typeof key : never>
      ): HandlerResult<HttpHandlerMap<THttpHandlers>[typeof key]> => {
        // We cast the result of dispatch to the return type of the
        // corresponding handler.  Dispatch returns a value that may be
        // synchronous or a promise depending on the handler
        // implementation.  Casting through unknown avoids TypeScript
        // complaining about mismatched return types.
        const request = {
          ...req,
          handler: key as string,
        } as ProtocolHandlerRequest<keyof THttpHandlers>;
        return core.dispatch(request) as unknown as HandlerResult<
          HttpHandlerMap<THttpHandlers>[typeof key]
        >;
      }) as HttpApi<THttpHandlers>[typeof key extends string ? typeof key : never];
    }
  );

  // Similarly build the WebSocket API.  Each function sets the
  // handler name on the request before dispatching.
  const wsApi = {} as WsApi<TWsHandlers>;
  (Object.keys(config.wsHandlers) as (keyof TWsHandlers)[]).forEach(
    (key) => {
      wsApi[key as typeof key extends string ? typeof key : never] = (((
        req: HandlerParams<WsHandlerMap<TWsHandlers>[typeof key]>[0]
      ): HandlerResult<WsHandlerMap<TWsHandlers>[typeof key]> => {
        const request = {
          ...req,
          handler: key as string,
        } as ProtocolHandlerRequest<keyof TWsHandlers>;
        return core.dispatch(request) as unknown as HandlerResult<
          WsHandlerMap<TWsHandlers>[typeof key]
        >;
      }) as WsApi<TWsHandlers>[typeof key];
    }

  );

  return {
    /**
     * Dispatch a raw request.  This method can be used when the
     * protocol and handler should be determined dynamically at
     * runtime.  The request must still include either HTTP or
     * WebSocket discriminating properties (method/endpoint for
     * HTTP, action for WS).
     */
    handle: (request: ProtocolHandlerRequest<BoundHandlers<THttpHandlers | TWsHandlers>>) => core.dispatch(request),

    /**
     * Namespace for calling registered HTTP handlers directly.  Each
     * property corresponds to one of the handler names provided
     * during configuration.  Requests passed to these methods
     * should omit the `handler` field; it will be injected
     * automatically by the factory.
     */
    http: httpApi,

    /**
     * Namespace for calling registered WebSocket handlers directly.
     * Each property corresponds to one of the handler names
     * provided during configuration.  Requests passed to these
     * methods should omit the `handler` field; it will be
     * injected automatically by the factory.
     */
    ws: wsApi,
  };
}
