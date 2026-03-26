"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedExpressHttpServer = exports.TypedHttpServer = void 0;
const node_http_1 = require("node:http");
const express_1 = __importDefault(require("express"));
const tooling_1 = require("../resolvers/tooling");
function handleRequestAndLoadContext(key, req, res) {
    const context = {};
    context.req = req;
    context.res = res;
    context.routeKey = key;
    context.server = this;
    return context;
}
class TypedHttpServer {
    constructor(options) {
        var _a, _b;
        this.handlers = (_a = options.handlers) !== null && _a !== void 0 ? _a : {};
        this.routes = options.routes;
        this.port = options.port;
        this.host = (_b = options.host) !== null && _b !== void 0 ? _b : "127.0.0.1";
        this.onError = options.onError;
        this.server = (0, node_http_1.createServer)(async (req, res) => {
            await this.handleNodeRequest(req, res);
        });
    }
    listen(port, callback) {
        const resolvedPort = port !== null && port !== void 0 ? port : this.port;
        if (typeof resolvedPort !== "number") {
            throw new Error("No port provided.");
        }
        this.server.listen(resolvedPort, this.host, callback);
    }
    close(callback) {
        this.server.close((error) => {
            callback === null || callback === void 0 ? void 0 : callback(error !== null && error !== void 0 ? error : undefined);
        });
    }
    getDefinitions() {
        const result = {};
        for (const key in this.routes) {
            const route = this.routes[key];
            result[key] = {
                method: route.method,
                path: route.path,
                request: {
                    params: route.request.params === null ? null : (0, tooling_1.resolveValue)(route.request.params),
                    query: route.request.query === null ? null : (0, tooling_1.resolveValue)(route.request.query),
                    body: route.request.body === null ? null : (0, tooling_1.resolveValue)(route.request.body),
                },
                response: route.response === null ? null : (0, tooling_1.resolveValue)(route.response),
            };
        }
        return result;
    }
    createHandlerContext(req, res, routeKey) {
        return {
            req,
            res,
            routeKey,
            server: this,
        };
    }
    async call(routeKey, args, ctx) {
        const route = this.routes[routeKey];
        if (!route) {
            throw new Error(`Unknown route: ${String(routeKey)}`);
        }
        const runtimeHandler = this.handlers[routeKey];
        const routeHandler = route.run;
        const handler = runtimeHandler !== null && runtimeHandler !== void 0 ? runtimeHandler : routeHandler;
        if (!handler) {
            throw new Error(`Route "${String(routeKey)}" has no handler.`);
        }
        if (!route.run) {
            throw new Error(`Route "${String(routeKey)}" has no run() handler.`);
        }
        const result = await handler(args, ctx);
        return result;
    }
    async handleNodeRequest(req, res) {
        var _a, _b, _c, _d;
        try {
            const method = ((_a = req.method) !== null && _a !== void 0 ? _a : "GET").toUpperCase();
            const url = new URL((_b = req.url) !== null && _b !== void 0 ? _b : "/", `http://${(_c = req.headers.host) !== null && _c !== void 0 ? _c : "127.0.0.1"}`);
            for (const key in this.routes) {
                const route = this.routes[key];
                if (route.method !== method)
                    continue;
                const params = this.matchPath(route.path, url.pathname);
                if (!params)
                    continue;
                const query = this.parseQuery(url);
                const body = await this.parseBody(req);
                if (!route.run) {
                    this.sendJson(res, 500, {
                        ok: false,
                        error: `Route "${key}" has no run() handler.`,
                    });
                    return;
                }
                const result = await route.run({
                    params: route.request.params === null ? null : params,
                    query: route.request.query === null ? null : query,
                    body: route.request.body === null ? null : body,
                }, { req, res, routeKey: key });
                this.sendJson(res, 200, {
                    ok: true,
                    data: result,
                });
                return;
            }
            this.sendJson(res, 404, {
                ok: false,
                error: "Route not found.",
            });
        }
        catch (error) {
            (_d = this.onError) === null || _d === void 0 ? void 0 : _d.call(this, { error, req, res });
            this.sendJson(res, 500, {
                ok: false,
                error: error instanceof Error ? error.message : "Unknown server error",
            });
        }
    }
    matchPath(routePath, actualPath) {
        const routeParts = routePath.split("/").filter(Boolean);
        const actualParts = actualPath.split("/").filter(Boolean);
        if (routeParts.length !== actualParts.length) {
            return null;
        }
        const params = {};
        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const actualPart = actualParts[i];
            if (routePart.startsWith(":")) {
                params[routePart.slice(1)] = decodeURIComponent(actualPart);
                continue;
            }
            if (routePart !== actualPart) {
                return null;
            }
        }
        return params;
    }
    parseQuery(url) {
        var _a;
        const query = {};
        for (const key of url.searchParams.keys()) {
            const values = url.searchParams.getAll(key);
            query[key] = values.length <= 1 ? ((_a = values[0]) !== null && _a !== void 0 ? _a : "") : values;
        }
        return query;
    }
    async parseBody(req) {
        var _a, _b;
        const contentType = String((_a = req.headers["content-type"]) !== null && _a !== void 0 ? _a : "").toLowerCase();
        const expectsBinary = contentType.includes("application/octet-stream") ||
            contentType.startsWith("image/") ||
            contentType.startsWith("audio/") ||
            contentType.startsWith("video/");
        if (expectsBinary) {
            const bytes = await this.readRequestBytes(req);
            return bytes.length === 0 ? null : bytes;
        }
        const raw = await this.readRequestText(req);
        if (raw.length === 0) {
            return null;
        }
        if (contentType.includes("application/json") || contentType.includes("+json")) {
            try {
                return JSON.parse(raw);
            }
            catch {
                throw new Error("Invalid JSON request body.");
            }
        }
        if (contentType.includes("application/x-www-form-urlencoded")) {
            const params = new URLSearchParams(raw);
            const parsed = {};
            for (const key of params.keys()) {
                const values = params.getAll(key);
                parsed[key] = values.length <= 1 ? ((_b = values[0]) !== null && _b !== void 0 ? _b : "") : values;
            }
            return parsed;
        }
        return raw;
    }
    async readRequestText(req) {
        const decoder = new TextDecoder("utf-8");
        let raw = "";
        for await (const chunk of req) {
            if (typeof chunk === "string") {
                raw += chunk;
            }
            else {
                raw += decoder.decode(chunk, { stream: true });
            }
        }
        raw += decoder.decode();
        return raw;
    }
    async readRequestBytes(req) {
        const chunks = [];
        for await (const chunk of req) {
            if (typeof chunk === "string") {
                chunks.push(new TextEncoder().encode(chunk));
            }
            else {
                chunks.push(chunk);
            }
        }
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
        }
        return merged;
    }
    sendJson(res, status, body) {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(body));
    }
}
exports.TypedHttpServer = TypedHttpServer;
class TypedExpressHttpServer {
    constructor(options) {
        var _a, _b, _c;
        this.instance = null;
        this.routes = options.routes;
        this.handlers = (_a = options.handlers) !== null && _a !== void 0 ? _a : {};
        this.app = (_b = options.app) !== null && _b !== void 0 ? _b : (0, express_1.default)();
        this.host = (_c = options.host) !== null && _c !== void 0 ? _c : '127.0.0.1';
        this.port = options.port;
        this.onError = options.onError;
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.registerRoutes();
    }
    getApp() {
        return this.app;
    }
    listen(port, callback) {
        const resolvedPort = port !== null && port !== void 0 ? port : this.port;
        if (typeof resolvedPort !== 'number') {
            throw new Error('No port provided.');
        }
        this.instance = this.app.listen(resolvedPort, this.host, callback);
    }
    close(callback) {
        if (!this.instance) {
            callback === null || callback === void 0 ? void 0 : callback();
            return;
        }
        this.instance.close((error) => {
            callback === null || callback === void 0 ? void 0 : callback(error !== null && error !== void 0 ? error : undefined);
        });
    }
    getDefinitions() {
        const result = {};
        for (const key in this.routes) {
            const route = this.routes[key];
            result[key] = {
                method: route.method,
                path: route.path,
                request: {
                    params: route.request.params === null ? null : (0, tooling_1.resolveValue)(route.request.params),
                    query: route.request.query === null ? null : (0, tooling_1.resolveValue)(route.request.query),
                    body: route.request.body === null ? null : (0, tooling_1.resolveValue)(route.request.body),
                },
                response: route.response === null ? null : (0, tooling_1.resolveValue)(route.response),
            };
        }
        return result;
    }
    registerRoutes() {
        for (const key in this.routes) {
            const route = this.routes[key];
            const method = route.method.toLowerCase();
            this.app[method](route.path, async (req, res) => {
                var _a;
                try {
                    const runtimeHandler = this.handlers[key];
                    const routeHandler = route.run;
                    const handler = runtimeHandler !== null && runtimeHandler !== void 0 ? runtimeHandler : routeHandler;
                    if (!handler) {
                        res.status(500).json({ ok: false, error: `Route "${key}" has no handler.` });
                        return;
                    }
                    const ctx = {
                        req: req,
                        res: res,
                        routeKey: key,
                        server: this,
                    };
                    const result = await handler({
                        params: route.request.params === null ? null : req.params,
                        query: route.request.query === null ? null : req.query,
                        body: route.request.body === null ? null : req.body,
                    }, ctx);
                    res.status(200).json({ ok: true, data: result });
                }
                catch (error) {
                    (_a = this.onError) === null || _a === void 0 ? void 0 : _a.call(this, { error, req, res });
                    res.status(500).json({
                        ok: false,
                        error: error instanceof Error ? error.message : 'Unknown server error',
                    });
                }
            });
        }
    }
}
exports.TypedExpressHttpServer = TypedExpressHttpServer;
