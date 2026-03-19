import { HttpProcessor } from '../processors/HttpProcessor';
import { WsProcessor } from '../processors/WsProcessor';
import { HttpHandlerRequest, MaybePromise, ProtocolHandlerRequest, WsHandlerRequest } from '../types';
/**
 * Context passed to each handler.  The context exposes the low
 * level HTTP and WebSocket processors as well as default host
 * values.  Handlers use this object to perform protocol specific
 * operations without knowing how the underlying transport is
 * implemented.
 */
export interface HandlerContext {
    http: HttpProcessor;
    ws: WsProcessor;
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
export type GenericHttpHandler<Req extends HttpHandlerRequest = HttpHandlerRequest, Res = unknown> = (req: Req, ctx: HandlerContext) => MaybePromise<Res>;
/**
 * Generic WebSocket handler signature.  Similar to GenericHttpHandler
 * but for WebSocket requests.  Each handler receives a request of
 * type `Req` and the shared context and returns a value of type
 * `Res`.
 */
export type GenericWsHandler<Req extends WsHandlerRequest = WsHandlerRequest, Res = unknown> = (req: Req, ctx: HandlerContext) => MaybePromise<Res>;
type HttpHandlerMap<THttpHandlers extends object> = {
    [K in keyof THttpHandlers]: THttpHandlers[K] extends GenericHttpHandler ? THttpHandlers[K] : never;
};
type WsHandlerMap<TWsHandlers extends object> = {
    [K in keyof TWsHandlers]: TWsHandlers[K] extends GenericWsHandler ? TWsHandlers[K] : never;
};
/**
 * Configuration required to instantiate the protocol handler core.
 * Users typically do not construct this class directly; instead
 * they call the factory function exported from the library.  The
 * generics THttpHandlers and TWsHandlers allow the type system to
 * infer the request and response shapes for each registered
 * handler.
 */
export interface ProtocolHandlerCoreConfig<THttpHandlers extends object, TWsHandlers extends object> {
    httpHandlers: HttpHandlerMap<THttpHandlers>;
    wsHandlers: WsHandlerMap<TWsHandlers>;
    processors: {
        http: HttpProcessor;
        ws: WsProcessor;
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
export declare class ProtocolHandlerCore<THttpHandlers extends object, TWsHandlers extends object> {
    private readonly httpHandlers;
    private readonly wsHandlers;
    private readonly httpProcessor;
    private readonly wsProcessor;
    private readonly defaults;
    constructor(config: ProtocolHandlerCoreConfig<THttpHandlers, TWsHandlers>);
    /**
     * Infer the protocol of the provided request object based on
     * distinguishing properties.  HTTP requests must include a
     * `method` field and a string `endpoint`.  WebSocket requests
     * must include an `action` field of type WsAction.  If neither
     * set of fields is present or both are present (ambiguous), an
     * error is thrown.  This method could be extended to support
     * additional protocols by adding more branches.
     */
    private inferProtocol;
    /**
     * Normalise a request by applying default hosts.  For HTTP
     * requests the default host is applied only if the caller has
     * not provided a full `url`.  The endpoint is concatenated with
     * the host to form the final URL.  For WebSocket connection
     * requests (action === "connect") the default WebSocket host is
     * applied if no URL is provided.  Other WebSocket actions pass
     * through unchanged.
     */
    private normaliseRequest;
    /**
     * Dispatch the request to the appropriate handler based on its
     * inferred protocol.  This method performs normalisation first
     * then looks up the handler by name.  The shared context is
     * constructed here and passed into the handler.  If no handler
     * exists for the given name an error is thrown.
     */
    dispatch(request: ProtocolHandlerRequest): Promise<unknown>;
}
export {};
