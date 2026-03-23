import {
  GenericHttpHandler,
  GenericWsHandler,
  ProtocolHandlerCore,
  ProtocolHandlerCoreConfig,
} from '../core/ProtocolHandlerCore';
import { IncomingMessage, ServerResponse } from 'node:http';
import { HttpRouteDefinition, HttpRouteMap, InferHttpRequest, InferHttpRoute, InferHttpRoutes, ParamsDict, PathParams, UserRouteDefinition } from '../processors/HttpProcessor';
import { WsEnvelopeBase, WsMessageMap, WsMessageScope } from '../processors/WsProcessor';
import { AnyEnvelope, BuildCallback, DefinedCallback, EvaluatedMessages, FieldDefinition, HttpMethod, MessageInputMap, ProtocolHandlerRequest, RegExpMatchPathArray, Request, UserCallback, UserContext, Widen } from '../types';
import { define, matchPath } from '../resolvers/tooling';

type AnyFn = (...args: any[]) => any;
type HandlerRequest<T extends AnyFn> = Parameters<T>[0];
type HandlerResult<T extends AnyFn> = ReturnType<T>;

type OptionalHandlerMap = Partial<Record<string, AnyFn>>;

type ApiFromHandlers<THandlers extends OptionalHandlerMap> = {
  [K in Extract<keyof THandlers, string>]: THandlers[K] extends AnyFn
    ? (req: Omit<HandlerRequest<NonNullable<THandlers[K]>>, 'handler'>) => HandlerResult<NonNullable<THandlers[K]>>
    : never;
};

interface ProtocolConfig<
  THttpRoutes extends HttpRouteMap<string>,
  TWsMessages extends WsMessageMap,
  THttpHandlers extends Partial<Record<string, GenericHttpHandler>>,
  TWsHandlers extends Partial<Record<string, GenericWsHandler>>,
> extends ProtocolHandlerCoreConfig<THttpRoutes, TWsMessages> {
  handlers?: {
    http?: THttpHandlers;
    ws?: TWsHandlers;
  };
}

type ExpansiveArray<T> = T extends (infer U)[] ? U[] : T;
type GeneralTypes = string | number | boolean | null | Record<string, any> | any[] | AnyFn | object | undefined | symbol | bigint | void;

type Typeof = "string" | "number" | "bigint" | "boolean" | "symbol" | "object" | "function";
function normalizeTypeToken<T> (value: T extends infer S extends Typeof ? S : T): FieldDefinition<T> {
  const typeOfValue = ["string", "number", "boolean", "object", "function", "symbol", "bigint"];
  if (typeof value === "string" && typeOfValue.includes(value)) {
    return (define[value as keyof typeof define] as Function)(
      (value === "string" ? "" : value === "number"
        ? 0 : value === "boolean"
        ? false : value === "object"
        ? {} : value === "array"
        ? Array(10) : value === "function"
        ? ((...args: any[]) => { }) : null
      ) as any) as FieldDefinition<T>;
  }
  if (Array.isArray(value)) return define.array(...value).default! as any;

  if (value && typeof value === 'object') {
    const normalized: Record<string, any> = {};
    for (const key in value) {
      normalized[key] = normalizeTypeToken((value as Record<string, GeneralTypes>)[key]);
    }
    return define.field({ default: normalized }) as Exclude<FieldDefinition<T>, FieldDefinition<unknown>>;
  }

  return define.value(() => value) as FieldDefinition<T>;
}

function normalizeHttpRoutes<TRoutes extends HttpRouteMap<string>> (routes: TRoutes): TRoutes {
  const normalized = {} as TRoutes;

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
    } as TRoutes[typeof key];
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
export function createProtocolHandler<
  THttpRoutes extends HttpRouteMap<string>,
  TWsMessages extends WsMessageMap,
  THttpHandlers extends Partial<Record<Extract<keyof THttpRoutes, string>, GenericHttpHandler>>,
  TWsHandlers extends Partial<Record<Extract<keyof TWsMessages, string>, GenericWsHandler>>
>(config: ProtocolConfig<THttpRoutes, TWsMessages, THttpHandlers, TWsHandlers>) {
  const normalizedConfig: ProtocolConfig<THttpRoutes, TWsMessages, THttpHandlers, TWsHandlers> = {
    ...config,
    http: {
      ...config.http,
      routes: normalizeHttpRoutes(config.http.routes),
    },
  };

  const core = new ProtocolHandlerCore(normalizedConfig);
  // Build the HTTP API.  For each handler name, produce a
  // function that calls the underlying handler via the core
  // dispatch method.  The handler name is injected onto the
  // request object to aid in routing.  Note that we cast
  // explicitly to ensure TypeScript infers the parameter and
  // return types correctly.
  const httpApi = {} as ApiFromHandlers<THttpHandlers>;
  (Object.keys(normalizedConfig.handlers?.http ?? {}) as Array<Extract<keyof THttpHandlers, string>>).forEach(
    (key) => {
      const handler = normalizedConfig.handlers?.http?.[key];
      if (typeof handler !== 'function') {
        return;
      }

      httpApi[key] = ((
        req: Omit<HandlerRequest<NonNullable<THttpHandlers[typeof key]>>, 'handler'>
      ): HandlerResult<NonNullable<THttpHandlers[typeof key]>> => {
        // We cast the result of dispatch to the return type of the
        // corresponding handler.  Dispatch returns a value that may be
        // synchronous or a promise depending on the handler
        // implementation.  Casting through unknown avoids TypeScript
        // complaining about mismatched return types.
        const request = {
          ...req,
          handler: key as string,
        } as ProtocolHandlerRequest;
        return core.dispatch(request) as unknown as HandlerResult<NonNullable<THttpHandlers[typeof key]>>;
      }) as ApiFromHandlers<THttpHandlers>[typeof key];
    }
  );

  // Similarly build the WebSocket API.  Each function sets the
  // handler name on the request before dispatching.
  const wsApi = {} as ApiFromHandlers<TWsHandlers>;
  (Object.keys(normalizedConfig.handlers?.ws ?? {}) as Array<Extract<keyof TWsHandlers, string>>).forEach(
    (key) => {
      const handler = normalizedConfig.handlers?.ws?.[key];
      if (typeof handler !== 'function') {
        return;
      }

      wsApi[key] = ((
        req: Omit<HandlerRequest<NonNullable<TWsHandlers[typeof key]>>, 'handler'>
      ): HandlerResult<NonNullable<TWsHandlers[typeof key]>> => {
        const request = {
          ...req,
          handler: key as string,
        } as ProtocolHandlerRequest;
        return core.dispatch(request) as unknown as HandlerResult<NonNullable<TWsHandlers[typeof key]>>;
      }) as ApiFromHandlers<TWsHandlers>[typeof key];
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
    handle: (
      request: ProtocolHandlerRequest,
      node?: { req: IncomingMessage; res: ServerResponse; }
    ) => core.dispatch(request, node),

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

type CreateProtocolConfig = ReplaceReturnType<typeof createProtocolHandler, Parameters<typeof createProtocolHandler>[0]>;
type ReplaceReturnType<F, NewReturn> = F extends (...args: infer Args) => any ? (...args: Args) => NewReturn : never;



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

const buildRoute = <const P extends string> (route: HttpRouteDefinition<P>): InferHttpRoute<HttpRouteDefinition<P>, P> => {
  return route;
};

const buildRouteDefinition = <const P extends string>(route: UserRouteDefinition<P>): HttpRouteDefinition<P> => {

  const match = matchPath(route.path);
  if (match === null) {
    throw new Error(`Invalid path format: ${ route.path }`);
  };
  let request = {
    params:
  };
  return {
    method: route.method,
    path: route.path,
    request: {

    }
    run: createController(route.run.context, route.run.callback),
  };
};


const defineRoutes = <const P extends string, T extends HttpRouteMap<P>> (routes: HttpRouteMap<P>) => {
  const newRoutes = {} as { [K in keyof T]: HttpRouteDefinition<T[K]["path"]>; };
  for (const key in routes) {
    newRoutes[key] = buildRoute(routes[key] as any);
  }

  return newRoutes as T;
};

function routeErrorHandler <const P extends string> (key: keyof HttpRouteDefinition<P>, route: HttpRouteDefinition<P>) {
  const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"] as const;
  let match = matchPath(route.path);
  let param: string | null = null;
  let path: string = "";
  let request: Record<string, unknown> = {};

  // Handle type errors for method, path, request, and response fields.
  if (key === "method" || key === "path") {
    if (typeof route[key] !== "string") {
      throw new TypeError(`${key} must be a string: ${ route[key] }`);
    }
  }
  if (key === "request" && (!route.request || typeof route.request !== "object")) {
    throw new TypeError(`Request must be an object/null: ${ route.request }`);
  }
  if (key === "response" && (!route.response || typeof route.response !== "object")) {
    throw new TypeError(`Response must be an object/null: ${ route.response }`);
  }
  if (key === "run" && (!route.run || typeof route.run !== "function")) {
    throw new TypeError(`Run must be a function: ${ route.run }`);
  }
  // Handle Method validation for HTTP routes
  if (key === "method") {
    if (!httpMethods.includes(route[key])) {
      throw new Error(`Invalid HTTP method: ${ route[key] }`);
    } else {
      return route[key];
    }
  }
  // Handle path parsing and validation
  if (key === "path") {
    match = matchPath(route.path);
    if (!match) {
      throw new Error(`Invalid path format: ${ route.path }`);
    }
    path = match[0];
    param = match.hasParam ? match.groups!.param! : null;
  }

  // Handle request validation and parameter extraction
  if (key === "request") {
    request = handleRequest(route.path, route.request);
  }



  if (route.run) {
    createController(route.run)
    route.run(request, { params: request.params, query: request.query, body: request.body });
  }

  console.error(`Error occurred while processing route ${route}: ${errorMessage}`);
  return { status: 500, body: { error: 'Internal Server Error' } };
}

/**
 * Helper function to handle request validation and parameter extraction for a given route.
 */
function handleRequest<const P extends string> (path: P, request: HttpRouteDefinition<P>["request"]) {
  let match = matchPath(path);
  const builtRequest = {} as InferHttpRequest<HttpRouteDefinition<P>, P>;
  if (match) {
    if (match.hasParam) {
      if (request.params === null) {
        throw new Error("Route defines params in path but request params is null");
      }
      if (typeof request.params !== "object") {
        throw new TypeError("Request params must be an object if path includes params");
      }
      if (!Object.keys(request.params).includes(match.groups!.param!)) {
        throw new Error("Route defines params in path but request params does not include the expected parameter");
      }
      builtRequest.params = request.params as any;
      builtRequest.query = request.query;
      builtRequest.body = request.body;
    } else {
      builtRequest.params = null as any;
      builtRequest.query = request.query;
      builtRequest.body = request.body;
    }
  } else {
    throw new Error(`Invalid path format: ${ path }`);
  }
  return builtRequest;
}

const createController = <
  Ctx extends Record<string, any>,
  const Pth extends string,
  Qry extends Record<string, unknown> | null,
  Bdy extends Record<string, unknown> | null,
  RBdy extends Record<string, unknown> | null,
  TLocals extends Record<string, any>,
  F extends UserContext<Ctx, Pth, RBdy, Bdy, Qry, TLocals>,
  C extends UserCallback<Pth, F>
  > (
    context: F,
    callback: C
  ): (req: import("express").Request<ParamsDict<Pth>, RBdy, Bdy, Qry, TLocals>, response: import("express").Response<RBdy, TLocals>) => ReturnType<C> => {

  const controller: DefinedCallback<import("express").Request<ParamsDict<Pth>, RBdy, Bdy, Qry, TLocals>, import("express").Response<RBdy, TLocals>> = (request, response) => {
    const ctx = context(request) as ReturnType<F>;
    return callback(request, response, ctx);
  };
  return controller;
};

let t = createController((req) => {
  return { requestID: Math.random().toString(36).substring(2, 15) };
}, (req, res, ctx) => {
  let value = ctx.requestID;
  req.params.id
});



function httpRouteFactory<P extends string, T extends HttpRouteMap<P>> (routes: T) {
  const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"] as const;
  let match: RegExpMatchPathArray | null;
  const buildRoute = <P extends string, T extends HttpRouteDefinition<P>> (route: T): T => {
    const builtRoute = {} as T;

    // Verify all required properties are present
    for (const key of Object.keys(route) as (keyof HttpRouteDefinition<P>)[]) {
      // Handle HTTP methods
      if (key === "method") {
        if (!httpMethods.includes(route.method)) {
          throw new Error(`Invalid HTTP method: ${ route.method }`);
        } else {
          builtRoute[key] = route.method as any;
        }
      }
      // Handle path parsing and validation
      if (key === "path") {
        if (typeof route.path !== "string") {
          throw new TypeError(`Path must be a string: ${ route.path }`);
        } else {
          match = matchPath(route.path);
          if (!match) {
            throw new Error(`Invalid path format: ${ route.path }`);
          } else {
            if (match.hasParam) {
              (builtRoute[key] as P) = match.groups!.path + "/:" + match.groups!.param as P;
            } else {
              builtRoute[key] = match[0] as any;
            }
          }
          builtRoute[key] = route.path as any;
        }
    }

    return builtRoute;
  }
};

}
const createApp = async <
  const P extends string,
  T extends HttpRouteMap<P>,
  Ctx extends Record<string, unknown>,
  TBody extends Record<string, unknown> | null,
  TQry extends Record<string, unknown> | null,
  RBdy extends Record<string, unknown> | null,
  F extends (req: Request<Ctx, P, TBody, TQry>, response: import("express").Response<RBdy, Ctx>, ctx: Ctx) => any
> (routes: T) => {
  const app = (await import("express")).default();

  for (const keys of Object.keys(routes) as (keyof T)[]) {
    const route = routes[keys];
    const builtRoute = buildRoute(route);
    const ctx = {
      timestamp: Date.now(),
      requestID: Math.random().toString(36).substring(2, 15),
      log: console.log(`[${new Date().toISOString()}] [${route.method} ${route.path}]`),
    } as unknown as Ctx
    const controller = createController(builtRoute, ctx, builtRoute.run);
    app[route.method.toLowerCase() as keyof typeof app](route.path, controller);
  }
  return app;
}

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
})
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


function wsMessageFactory<T extends MessageInputMap<string>> (messages: T) {
  function buildTarget<T extends AnyEnvelope> (target: T | undefined): (T | T['scope']) extends undefined ? WsEnvelopeBase<"broadcast"> : WsEnvelopeBase<T['scope']> {
    return (!target ? { scope: "broadcast" } : {
      scope: target.scope,
      channelId: target.scope === "channel" && !target.channelId
        ? (() => { throw new Error("Channel ID is required for channel scope"); })()
        : target.channelId ?? undefined,
      targetId: target.scope === "client" && !target.targetId
        ? (() => { throw new Error("Target ID is required for client scope"); })()
        : target.targetId ?? undefined
    }) as T extends undefined ? WsEnvelopeBase<"broadcast"> : WsEnvelopeBase<T['scope']>;
  }
  function buildMessageMap<T extends MessageInputMap<string>> (
    messages: T
  ): EvaluatedMessages<T> {
    const normalized = {} as EvaluatedMessages<T>;

    for (const key in messages) {
      const k = key as keyof T & string;
      const message = messages[k];

      normalized[k] = {
        type: typeof k,
        payload: !message.payload ? null : (normalizeTypeToken(message.payload) as T[typeof k]["payload"]),
        target: buildTarget(message.target) as T[typeof k]["target"] extends AnyEnvelope ? T[typeof k]["target"] : WsEnvelopeBase<"broadcast">
      } as EvaluatedMessages<T>[typeof k];
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
    payload: { text: 'string', fun: () => void 0},
    target: { scope: "client", targetId: "string" },
  }
});
test.chatMessage.payload.text

const createProtocolConfig: CreateProtocolConfig = (config) => ({ ...config });
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
        const { id } = params!;
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
        const { text } = payload!;
        // Handle incoming chat message...
        console.log(`Received chat message: ${text}`);
      },
    },
  },
})
