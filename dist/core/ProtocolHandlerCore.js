"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolHandlerCore = void 0;
/**
 * Core implementation of the protocol handler.  It takes care of
 * inferring the protocol based on request shape, normalising
 * requests by applying default hosts, and dispatching to the
 * appropriate handler.  Errors are thrown when a protocol or
 * handler cannot be resolved.
 */
class ProtocolHandlerCore {
    constructor(config) {
        var _a, _b, _c, _d;
        this.httpHandlers = config.httpHandlers;
        this.wsHandlers = config.wsHandlers;
        this.httpProcessor = config.processors.http;
        this.wsProcessor = config.processors.ws;
        const httpHost = (_b = (_a = config.defaults) === null || _a === void 0 ? void 0 : _a.httpHost) !== null && _b !== void 0 ? _b : 'http://127.0.0.1';
        const wsHost = (_d = (_c = config.defaults) === null || _c === void 0 ? void 0 : _c.wsHost) !== null && _d !== void 0 ? _d : 'ws://127.0.0.1';
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
    inferProtocol(req) {
        const maybeObj = req;
        const hasMethod = typeof (maybeObj === null || maybeObj === void 0 ? void 0 : maybeObj.method) === 'string';
        const hasEndpoint = typeof (maybeObj === null || maybeObj === void 0 ? void 0 : maybeObj.endpoint) === 'string';
        const hasAction = typeof (maybeObj === null || maybeObj === void 0 ? void 0 : maybeObj.action) === 'string';
        const isHttpLike = hasMethod && hasEndpoint;
        const isWsLike = hasAction;
        if (isHttpLike && !isWsLike)
            return 'http';
        if (isWsLike && !isHttpLike)
            return 'ws';
        if (isHttpLike && isWsLike) {
            throw new Error('Ambiguous request: contains both HTTP and WebSocket discriminators.');
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
    normaliseRequest(req) {
        const protocol = this.inferProtocol(req);
        // Clone the request to avoid mutating the original object
        const result = { ...req };
        if (protocol === 'http') {
            // For HTTP requests, build a full URL if one is not provided
            if ('endpoint' in result) {
                const httpResult = result;
                if (httpResult.url) {
                    return httpResult;
                }
                const endpoint = httpResult.endpoint;
                let base = this.defaults.httpHost;
                // Ensure there is exactly one slash between host and endpoint
                if (endpoint.startsWith('/')) {
                    base = base.replace(/\/$/, '');
                }
                else if (!base.endsWith('/')) {
                    base += '/';
                }
                httpResult.url = `${base}${endpoint}`;
            }
        }
        else if (protocol === 'ws') {
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
    async dispatch(request) {
        const normalised = this.normaliseRequest(request);
        const protocol = this.inferProtocol(normalised);
        const handlerName = normalised.handler;
        const ctx = {
            http: this.httpProcessor,
            ws: this.wsProcessor,
            defaults: this.defaults,
        };
        if (protocol === 'http') {
            if (!(handlerName in this.httpHandlers)) {
                throw new Error(`No HTTP handler found for "${handlerName}"`);
            }
            const handler = this.httpHandlers[handlerName];
            if (!handler) {
                throw new Error(`No HTTP handler found for "${handlerName}"`);
            }
            return handler(normalised, ctx);
        }
        if (protocol === 'ws') {
            if (!(handlerName in this.wsHandlers)) {
                throw new Error(`No WebSocket handler found for "${handlerName}"`);
            }
            const handler = this.wsHandlers[handlerName];
            if (!handler) {
                throw new Error(`No WebSocket handler found for "${handlerName}"`);
            }
            return handler(normalised, ctx);
        }
        // Should never reach here due to inferProtocol logic
        throw new Error('Unsupported protocol');
    }
}
exports.ProtocolHandlerCore = ProtocolHandlerCore;
