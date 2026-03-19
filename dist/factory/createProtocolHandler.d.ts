import { GenericHttpHandler, GenericWsHandler, ProtocolHandlerCoreConfig } from '../core/ProtocolHandlerCore';
import { ProtocolHandlerRequest } from '../types';
type HandlerRequest<THandler extends (...args: any[]) => any> = Parameters<THandler>[0];
type HandlerResult<THandler extends (...args: any[]) => any> = ReturnType<THandler>;
type HttpHandlerMap<THttpHandlers extends object> = {
    [K in keyof THttpHandlers]: THttpHandlers[K] extends GenericHttpHandler ? THttpHandlers[K] : never;
};
type WsHandlerMap<TWsHandlers extends object> = {
    [K in keyof TWsHandlers]: TWsHandlers[K] extends GenericWsHandler ? TWsHandlers[K] : never;
};
type HttpApi<THttpHandlers extends object> = {
    [K in keyof THttpHandlers]: (req: HandlerRequest<HttpHandlerMap<THttpHandlers>[K]>) => HandlerResult<HttpHandlerMap<THttpHandlers>[K]>;
};
type WsApi<TWsHandlers extends object> = {
    [K in keyof TWsHandlers]: (req: HandlerRequest<WsHandlerMap<TWsHandlers>[K]>) => HandlerResult<WsHandlerMap<TWsHandlers>[K]>;
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
export declare function createProtocolHandler<THttpHandlers extends object, TWsHandlers extends object>(config: ProtocolHandlerCoreConfig<THttpHandlers, TWsHandlers>): {
    /**
     * Dispatch a raw request.  This method can be used when the
     * protocol and handler should be determined dynamically at
     * runtime.  The request must still include either HTTP or
     * WebSocket discriminating properties (method/endpoint for
     * HTTP, action for WS).
     */
    handle: (request: ProtocolHandlerRequest) => Promise<unknown>;
    /**
     * Namespace for calling registered HTTP handlers directly.  Each
     * property corresponds to one of the handler names provided
     * during configuration.  Requests passed to these methods
     * should omit the `handler` field; it will be injected
     * automatically by the factory.
     */
    http: HttpApi<THttpHandlers>;
    /**
     * Namespace for calling registered WebSocket handlers directly.
     * Each property corresponds to one of the handler names
     * provided during configuration.  Requests passed to these
     * methods should omit the `handler` field; it will be
     * injected automatically by the factory.
     */
    ws: WsApi<TWsHandlers>;
};
export {};
