"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProtocolHandler = createProtocolHandler;
const ProtocolHandlerCore_1 = require("../core/ProtocolHandlerCore");
const tooling_1 = require("../resolvers/tooling");
function normalizeTypeToken(value) {
    const typeOfValue = ["string", "number", "boolean", "object", "function", "symbol", "bigint"];
    if (typeof value === "string" && typeOfValue.includes(value)) {
        return tooling_1.define[value]((value === "string" ? "" : value === "number"
            ? 0 : value === "boolean"
            ? false : value === "object"
            ? {} : value === "array"
            ? Array(10) : value === "function"
            ? ((...args) => { }) : null));
    }
    if (Array.isArray(value))
        return tooling_1.define.array(...value).default;
    if (value && typeof value === 'object') {
        const normalized = {};
        for (const key in value) {
            normalized[key] = normalizeTypeToken(value[key]);
        }
        return tooling_1.define.field({ default: normalized });
    }
    return tooling_1.define.value(() => value);
}
function normalizeHttpRoutes(routes) {
    const normalized = {};
    for (const key in routes) {
        const route = routes[key];
        normalized[key] = {
            ...route,
            request: {
                params: route.request.params === null ? null : normalizeTypeToken(route.request.params),
                query: route.request.query === null ? null : normalizeTypeToken(route.request.query),
                body: route.request.body === null ? null : normalizeTypeToken(route.request.body),
            },
            response: route.response === null ? null : normalizeTypeToken(route.response),
        };
    }
    return normalized;
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
function createProtocolHandler(config) {
    var _a, _b, _c, _d;
    const normalizedConfig = {
        ...config,
        http: {
            ...config.http,
            routes: normalizeHttpRoutes(config.http.routes),
        },
    };
    const core = new ProtocolHandlerCore_1.ProtocolHandlerCore(normalizedConfig);
    // Build the HTTP API.  For each handler name, produce a
    // function that calls the underlying handler via the core
    // dispatch method.  The handler name is injected onto the
    // request object to aid in routing.  Note that we cast
    // explicitly to ensure TypeScript infers the parameter and
    // return types correctly.
    const httpApi = {};
    Object.keys((_b = (_a = normalizedConfig.handlers) === null || _a === void 0 ? void 0 : _a.http) !== null && _b !== void 0 ? _b : {}).forEach((key) => {
        var _a, _b;
        const handler = (_b = (_a = normalizedConfig.handlers) === null || _a === void 0 ? void 0 : _a.http) === null || _b === void 0 ? void 0 : _b[key];
        if (typeof handler !== 'function') {
            return;
        }
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
    Object.keys((_d = (_c = normalizedConfig.handlers) === null || _c === void 0 ? void 0 : _c.ws) !== null && _d !== void 0 ? _d : {}).forEach((key) => {
        var _a, _b;
        const handler = (_b = (_a = normalizedConfig.handlers) === null || _a === void 0 ? void 0 : _a.ws) === null || _b === void 0 ? void 0 : _b[key];
        if (typeof handler !== 'function') {
            return;
        }
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
        handle: (request, node) => core.dispatch(request, node),
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
// function buildRouteMap<T extends HttpRouteMap> (routes: T): RouteMapWithWidenedRequest<T> {
//   const normalized = {} as RouteMapWithWidenedRequest<T>;
//   for (const key in routes) {
//     const k = key as keyof T;
//     const route = routes[k];
//     normalized[k] = ({
//       method: route.method,
//       path: route.path,
//       request: {
//         params: route.request.params === null ? null : normalizeTypeToken(route.request.params),
//         query: route.request.query === null ? null : normalizeTypeToken(route.request.query),
//         body: route.request.body === null ? null : normalizeTypeToken(route.request.body),
//       } as RouteMapWithWidenedRequest<T>[typeof k]["request"],
//       response: route.response === null ? null : normalizeTypeToken(route.response),
//     }) as RouteMapWithWidenedRequest<T>[typeof k];
//   }
//   return normalized;
// }
// function buildRouteMap<T extends HttpRouteMap<string>>(routes: T) {
//   const normalized = {};
//   for (const key in routes) {
//     const k = key as keyof T;
//     const route = routes[k];
//     normalized[k] = {
//       method: route.method,
//       path: route.path,
//       request: {
//         params: route.request.params === null ? null : normalizeTypeToken(route.request.params),
//         query: route.request.query === null ? null : normalizeTypeToken(route.request.query),
//         body: route.request.body === null ? null : normalizeTypeToken(route.request.body),
//       } as InferHttpRequest<T[typeof k]>,
//       response: route.response === null ? null : normalizeTypeToken(route.response),
//     } ;
//   }
//   return normalized;
// }
// type BuiltRoutes<T extends HttpRouteMap<string>> = {
//   [K in keyof T]: {
//     method: T[K]["method"];
//     path: T[K]["path"]; // exact literal preserved
//     request: InferHttpRequest<T[K]>; // widened shape logic lives here
//     response: InferHttpRoutes<T>[K]["response"];
//   };
// };
const buildRoute = (route) => {
    return route;
};
const buildRouteDefinition = (route) => {
    const match = (0, tooling_1.matchPath)(route.path);
    if (match === null) {
        throw new Error(`Invalid path format: ${route.path}`);
    }
    ;
    let request = {
        params: 
    };
    return {
        method: route.method,
        path: route.path,
        request: {},
        run: createController(route.run.context, route.run.callback),
    };
};
const defineRoutes = (routes) => {
    const newRoutes = {};
    for (const key in routes) {
        newRoutes[key] = buildRoute(routes[key]);
    }
    return newRoutes;
};
function routeErrorHandler(key, route) {
    const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];
    let match = (0, tooling_1.matchPath)(route.path);
    let param = null;
    let path = "";
    let request = {};
    // Handle type errors for method, path, request, and response fields.
    if (key === "method" || key === "path") {
        if (typeof route[key] !== "string") {
            throw new TypeError(`${key} must be a string: ${route[key]}`);
        }
    }
    if (key === "request" && (!route.request || typeof route.request !== "object")) {
        throw new TypeError(`Request must be an object/null: ${route.request}`);
    }
    if (key === "response" && (!route.response || typeof route.response !== "object")) {
        throw new TypeError(`Response must be an object/null: ${route.response}`);
    }
    if (key === "run" && (!route.run || typeof route.run !== "function")) {
        throw new TypeError(`Run must be a function: ${route.run}`);
    }
    // Handle Method validation for HTTP routes
    if (key === "method") {
        if (!httpMethods.includes(route[key])) {
            throw new Error(`Invalid HTTP method: ${route[key]}`);
        }
        else {
            return route[key];
        }
    }
    // Handle path parsing and validation
    if (key === "path") {
        match = (0, tooling_1.matchPath)(route.path);
        if (!match) {
            throw new Error(`Invalid path format: ${route.path}`);
        }
        path = match[0];
        param = match.hasParam ? match.groups.param : null;
    }
    // Handle request validation and parameter extraction
    if (key === "request") {
        request = handleRequest(route.path, route.request);
    }
    if (route.run) {
        createController(route.run);
        route.run(request, { params: request.params, query: request.query, body: request.body });
    }
    console.error(`Error occurred while processing route ${route}: ${errorMessage}`);
    return { status: 500, body: { error: 'Internal Server Error' } };
}
/**
 * Helper function to handle request validation and parameter extraction for a given route.
 */
function handleRequest(path, request) {
    let match = (0, tooling_1.matchPath)(path);
    const builtRequest = {};
    if (match) {
        if (match.hasParam) {
            if (request.params === null) {
                throw new Error("Route defines params in path but request params is null");
            }
            if (typeof request.params !== "object") {
                throw new TypeError("Request params must be an object if path includes params");
            }
            if (!Object.keys(request.params).includes(match.groups.param)) {
                throw new Error("Route defines params in path but request params does not include the expected parameter");
            }
            builtRequest.params = request.params;
            builtRequest.query = request.query;
            builtRequest.body = request.body;
        }
        else {
            builtRequest.params = null;
            builtRequest.query = request.query;
            builtRequest.body = request.body;
        }
    }
    else {
        throw new Error(`Invalid path format: ${path}`);
    }
    return builtRequest;
}
const createController = (context, callback) => {
    const controller = (request, response) => {
        const ctx = context(request);
        return callback(request, response, ctx);
    };
    return controller;
};
let t = createController((req) => {
    return { requestID: Math.random().toString(36).substring(2, 15) };
}, (req, res, ctx) => {
    let value = ctx.requestID;
    req.params.id;
});
function httpRouteFactory(routes) {
    const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];
    let match;
    const buildRoute = (route) => {
        const builtRoute = {};
        // Verify all required properties are present
        for (const key of Object.keys(route)) {
            // Handle HTTP methods
            if (key === "method") {
                if (!httpMethods.includes(route.method)) {
                    throw new Error(`Invalid HTTP method: ${route.method}`);
                }
                else {
                    builtRoute[key] = route.method;
                }
            }
            // Handle path parsing and validation
            if (key === "path") {
                if (typeof route.path !== "string") {
                    throw new TypeError(`Path must be a string: ${route.path}`);
                }
                else {
                    match = (0, tooling_1.matchPath)(route.path);
                    if (!match) {
                        throw new Error(`Invalid path format: ${route.path}`);
                    }
                    else {
                        if (match.hasParam) {
                            builtRoute[key] = match.groups.path + "/:" + match.groups.param;
                        }
                        else {
                            builtRoute[key] = match[0];
                        }
                    }
                    builtRoute[key] = route.path;
                }
            }
            return builtRoute;
        }
    };
}
const createApp = async (routes) => {
    const app = (await Promise.resolve().then(() => __importStar(require("express")))).default();
    for (const keys of Object.keys(routes)) {
        const route = routes[keys];
        const builtRoute = buildRoute(route);
        const ctx = {
            timestamp: Date.now(),
            requestID: Math.random().toString(36).substring(2, 15),
            log: console.log(`[${new Date().toISOString()}] [${route.method} ${route.path}]`),
        };
        const controller = createController(builtRoute, ctx, builtRoute.run);
        app[route.method.toLowerCase()](route.path, controller);
    }
    return app;
};
buildRoute({
    method: 'GET',
    path: '/user/:id',
    request: {
        params: { id: "string" },
        query: null,
        body: null,
    },
    response: { name: 'string', age: 'number' },
    run: (req, res) => {
        // Fetch user data based on id...
        return { name: 'Alice', age: 30 };
    }
});
const route = defineRoutes({
    getUser: {
        method: 'GET',
        path: '/user/:id',
        request: {
            params: { car: "string" },
            query: null,
            body: null,
        },
        response: { name: 'string', age: 'number' },
    },
    buildUser: {
        method: 'POST',
        path: '/user',
        request: {
            params: null,
            query: null,
            body: { name: 'string', age: 'number' },
        },
        response: { id: 'string' },
    }
});
function wsMessageFactory(messages) {
    function buildTarget(target) {
        var _a, _b;
        return (!target ? { scope: "broadcast" } : {
            scope: target.scope,
            channelId: target.scope === "channel" && !target.channelId
                ? (() => { throw new Error("Channel ID is required for channel scope"); })()
                : (_a = target.channelId) !== null && _a !== void 0 ? _a : undefined,
            targetId: target.scope === "client" && !target.targetId
                ? (() => { throw new Error("Target ID is required for client scope"); })()
                : (_b = target.targetId) !== null && _b !== void 0 ? _b : undefined
        });
    }
    function buildMessageMap(messages) {
        const normalized = {};
        for (const key in messages) {
            const k = key;
            const message = messages[k];
            normalized[k] = {
                type: typeof k,
                payload: !message.payload ? null : normalizeTypeToken(message.payload),
                target: buildTarget(message.target)
            };
        }
        return normalized;
    }
    return buildMessageMap(messages);
}
let test = wsMessageFactory({
    chatMessage: {
        payload: { text: 'number' },
        target: { scope: "channel", channelId: "string" },
    },
    privateMessage: {
        payload: { text: 'string', fun: () => void 0 },
        target: { scope: "client", targetId: "string" },
    }
});
test.chatMessage.payload.text;
const createProtocolConfig = (config) => ({ ...config });
const defaultRoutes = {};
const processor = createProtocolHandler({
    http: {
        routes: {
            getUser: {
                method: 'GET',
                path: '/user/:id',
                request: {
                    params: { id: 'string' },
                    query: null,
                    body: null,
                },
                response: { name: 'string', age: 'number' },
            },
        },
        handlers: {
            getUser: async ({ params }) => {
                const { id } = params;
                // Fetch user data based on id...
                return { name: 'Alice', age: 30 };
            },
        },
    },
    ws: {
        messageMap: {
            chatMessage: {
                payload: { text: 'string' },
            },
        },
        handlers: {
            chatMessage: async ({ payload }) => {
                const { text } = payload;
                // Handle incoming chat message...
                console.log(`Received chat message: ${text}`);
            },
        },
    },
});
