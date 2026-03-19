"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolHandlerCore = void 0;
/**
 * Core protocol dispatcher implementation.
 */
class ProtocolHandlerCore {
    /**
     * Construct a typed protocol dispatch core.
     */
    constructor(config) {
        var _a, _b, _c, _d;
        this.httpHandlers = config.httpHandlers;
        this.wsHandlers = config.wsHandlers;
        this.httpProcessor = this.resolveHttpProcessor(config.processors.http);
        this.wsProcessor = this.resolveWsProcessor(config.processors.ws);
        this.defaults = {
            httpHost: (_b = (_a = config.defaults) === null || _a === void 0 ? void 0 : _a.httpHost) !== null && _b !== void 0 ? _b : 'http://127.0.0.1',
            wsHost: (_d = (_c = config.defaults) === null || _c === void 0 ? void 0 : _c.wsHost) !== null && _d !== void 0 ? _d : 'ws://127.0.0.1',
        };
    }
    /**
     * Resolve an HTTP processor and provide default implementations for missing methods.
     */
    resolveHttpProcessor(processor) {
        var _a;
        return {
            handlers: processor.handlers,
            request: (_a = processor.request) !== null && _a !== void 0 ? _a : (async () => {
                throw new Error('No HTTP request implementation provided.');
            }),
        };
    }
    /**
     * Resolve a WebSocket processor and provide default implementations for missing methods.
     */
    resolveWsProcessor(processor) {
        var _a, _b, _c, _d, _e, _f, _g;
        const on = (_a = processor.on) !== null && _a !== void 0 ? _a : (() => undefined);
        const once = (_b = processor.once) !== null && _b !== void 0 ? _b : (() => undefined);
        return {
            handlers: processor.handlers,
            connect: (_c = processor.connect) !== null && _c !== void 0 ? _c : (async () => ({ connectionId: `ws-${Date.now()}` })),
            send: (_d = processor.send) !== null && _d !== void 0 ? _d : (async () => undefined),
            close: (_e = processor.close) !== null && _e !== void 0 ? _e : (async () => undefined),
            on,
            once,
            listen: (_f = processor.listen) !== null && _f !== void 0 ? _f : on,
            listenOnce: (_g = processor.listenOnce) !== null && _g !== void 0 ? _g : once,
        };
    }
    /**
     * Infer protocol from discriminating request fields.
     */
    inferProtocol(req) {
        const maybeObj = req;
        const isHttpLike = typeof (maybeObj === null || maybeObj === void 0 ? void 0 : maybeObj.method) === 'string' && typeof (maybeObj === null || maybeObj === void 0 ? void 0 : maybeObj.endpoint) === 'string';
        const isWsLike = typeof (maybeObj === null || maybeObj === void 0 ? void 0 : maybeObj.action) === 'string';
        if (isHttpLike && !isWsLike)
            return 'http';
        if (isWsLike && !isHttpLike)
            return 'ws';
        if (isHttpLike && isWsLike)
            throw new Error('Ambiguous request: contains both HTTP and WebSocket discriminators.');
        throw new Error('Unable to infer protocol from request properties.');
    }
    /**
     * Normalize request by inheriting default hosts when missing.
     */
    normaliseRequest(req) {
        const protocol = this.inferProtocol(req);
        const result = { ...req };
        if (protocol === 'http' && 'endpoint' in result) {
            const httpResult = result;
            if (httpResult.url)
                return result;
            const endpoint = httpResult.endpoint;
            const base = endpoint.startsWith('/')
                ? this.defaults.httpHost.replace(/\/$/, '')
                : this.defaults.httpHost.endsWith('/')
                    ? this.defaults.httpHost
                    : `${this.defaults.httpHost}/`;
            httpResult.url = `${base}${endpoint}`;
            return result;
        }
        if (protocol === 'ws' && 'action' in result && result.action === 'connect') {
            const wsConnectResult = result;
            if (!wsConnectResult.url)
                wsConnectResult.url = this.defaults.wsHost;
        }
        return result;
    }
    /**
     * Build a runtime handler context, optionally inheriting overrides.
     */
    buildContext(inheritedContext) {
        var _a, _b, _c, _d, _e, _f;
        return {
            http: (_a = inheritedContext === null || inheritedContext === void 0 ? void 0 : inheritedContext.http) !== null && _a !== void 0 ? _a : this.httpProcessor,
            ws: (_b = inheritedContext === null || inheritedContext === void 0 ? void 0 : inheritedContext.ws) !== null && _b !== void 0 ? _b : this.wsProcessor,
            defaults: {
                httpHost: (_d = (_c = inheritedContext === null || inheritedContext === void 0 ? void 0 : inheritedContext.defaults) === null || _c === void 0 ? void 0 : _c.httpHost) !== null && _d !== void 0 ? _d : this.defaults.httpHost,
                wsHost: (_f = (_e = inheritedContext === null || inheritedContext === void 0 ? void 0 : inheritedContext.defaults) === null || _e === void 0 ? void 0 : _e.wsHost) !== null && _f !== void 0 ? _f : this.defaults.wsHost,
            },
        };
    }
    /**
     * Dispatch a request to the matching typed handler.
     */
    async dispatch(request, inheritedContext) {
        const normalised = this.normaliseRequest(request);
        const protocol = this.inferProtocol(normalised);
        const handlerName = normalised.handler;
        const context = this.buildContext(inheritedContext);
        if (protocol === 'http') {
            const handler = this.httpHandlers[handlerName];
            if (!handler)
                throw new Error(`No HTTP handler found for "${handlerName}"`);
            const result = await handler(context, normalised);
            return result;
        }
        const handler = this.wsHandlers[handlerName];
        if (!handler)
            throw new Error(`No WebSocket handler found for "${handlerName}"`);
        const result = await handler(context, normalised);
        return result;
    }
}
exports.ProtocolHandlerCore = ProtocolHandlerCore;
