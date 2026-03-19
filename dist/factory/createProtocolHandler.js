"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProtocolHandler = createProtocolHandler;
const ProtocolHandlerCore_1 = require("../core/ProtocolHandlerCore");
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
function createProtocolHandler(config) {
    const core = new ProtocolHandlerCore_1.ProtocolHandlerCore(config);
    // Build the HTTP API.  For each handler name, produce a
    // function that calls the underlying handler via the core
    // dispatch method.  The handler name is injected onto the
    // request object to aid in routing.  Note that we cast
    // explicitly to ensure TypeScript infers the parameter and
    // return types correctly.
    const httpApi = {};
    Object.keys(config.httpHandlers).forEach((key) => {
        httpApi[key] = ((req) => {
            // We cast the result of dispatch to the return type of the
            // corresponding handler.  Dispatch returns a value that may be
            // synchronous or a promise depending on the handler
            // implementation.  Casting through unknown avoids TypeScript
            // complaining about mismatched return types.
            const request = {
                ...req,
                handler: key,
            };
            return core.dispatch(request);
        });
    });
    // Similarly build the WebSocket API.  Each function sets the
    // handler name on the request before dispatching.
    const wsApi = {};
    Object.keys(config.wsHandlers).forEach((key) => {
        wsApi[key] = ((req) => {
            const request = {
                ...req,
                handler: key,
            };
            return core.dispatch(request);
        });
    });
    return {
        /**
         * Dispatch a raw request.  This method can be used when the
         * protocol and handler should be determined dynamically at
         * runtime.  The request must still include either HTTP or
         * WebSocket discriminating properties (method/endpoint for
         * HTTP, action for WS).
         */
        handle: (request) => core.dispatch(request),
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
