import { GenericHttpHandler, GenericWsHandler, ProtocolHandlerCoreConfig } from '../core/ProtocolHandlerCore';
import { IncomingMessage, ServerResponse } from 'node:http';
import { HttpRouteMap } from '../processors/HttpProcessor';
import { WsMessageMap } from '../processors/WsProcessor';
import { ProtocolHandlerRequest } from '../types/index';
type AnyFn = (...args: any[]) => any;
type HandlerRequest<T extends AnyFn> = Parameters<T>[0];
type HandlerResult<T extends AnyFn> = ReturnType<T>;
type OptionalHandlerMap = Partial<Record<string, AnyFn>>;
type ApiFromHandlers<THandlers extends OptionalHandlerMap> = {
    [K in Extract<keyof THandlers, string>]: THandlers[K] extends AnyFn ? (req: Omit<HandlerRequest<NonNullable<THandlers[K]>>, 'handler'>) => HandlerResult<NonNullable<THandlers[K]>> : never;
};
interface ProtocolConfig<THttpRoutes extends HttpRouteMap<string>, TWsMessages extends WsMessageMap, THttpHandlers extends Partial<Record<string, GenericHttpHandler>>, TWsHandlers extends Partial<Record<string, GenericWsHandler>>> extends ProtocolHandlerCoreConfig<THttpRoutes, TWsMessages> {
    handlers?: {
        http?: THttpHandlers;
        ws?: TWsHandlers;
    };
}
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
export declare function createProtocolHandler<THttpRoutes extends HttpRouteMap<string>, TWsMessages extends WsMessageMap, THttpHandlers extends Partial<Record<Extract<keyof THttpRoutes, string>, GenericHttpHandler>>, TWsHandlers extends Partial<Record<Extract<keyof TWsMessages, string>, GenericWsHandler>>>(config: ProtocolConfig<THttpRoutes, TWsMessages, THttpHandlers, TWsHandlers>): {
    /**
     * Dispatch a raw request.  This method can be used when the
     * protocol and handler should be determined dynamically at
     * runtime.  The request must still include either HTTP or
     * WebSocket discriminating properties (method/endpoint for
     * HTTP, action for WS).
     */
    handle: (request: ProtocolHandlerRequest, node?: {
        req: IncomingMessage;
        res: ServerResponse;
    }) => Promise<unknown>;
    /**
     * Namespace for calling registered HTTP handlers directly.  Each
     * property corresponds to one of the handler names provided
     * during configuration.  Requests passed to these methods
     * should omit the `handler` field; it will be injected
     * automatically by the factory.
     */
    http: ApiFromHandlers<THttpHandlers>;
    /**
     * Namespace for calling registered WebSocket handlers directly.
     * Each property corresponds to one of the handler names
     * provided during configuration.  Requests passed to these
     * methods should omit the `handler` field; it will be
     * injected automatically by the factory.
     */
    ws: ApiFromHandlers<TWsHandlers>;
};
export {};
