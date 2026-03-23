import { createServer, IncomingMessage, Server as HttpServer } from 'node:http';
import type { OutgoingHttpHeaders } from 'node:http';
import express, { type Express, type Request, type Response } from 'express';
import { HttpMethod, TypeFromLiteral, UserCallback, type Request as PRequest } from '../types';
import { resolveValue } from '../resolvers/tooling';

/**
 * The shape of an outgoing HTTP request accepted by the HttpProcessor
 * interface.  Implementations may choose to ignore unused fields
 * depending on their internal behaviour.  For example, a minimal
 * implementation might ignore `headers` entirely.  The `query`
 * property allows structured query parameters to be passed in a type
 * safe manner.
 */
export interface HttpRequestInput {
  method: HttpMethod;
  url: string;
  headers?: OutgoingHttpHeaders;
  body?: unknown;
  query?: Record<string, string | number | boolean | Array<string | number | boolean>>;
}
export type HttpHandlerContext<
  TRoutes extends HttpRouteMap<string>,
  TKey extends keyof TRoutes
> = {
  req: IncomingMessage;
  res: import("node:http").ServerResponse;
  routeKey: TKey;
  server: TypedHttpServer<TRoutes>;
};

function handleRequestAndLoadContext<T extends HttpRouteMap<string>, K extends keyof T, Ctx extends HttpHandlerContext<T, keyof T>> (this: TypedHttpServer<T>, key: K, req: IncomingMessage, res: import("node:http").ServerResponse) {
  const context = {} as Ctx;
  context.req = req;
  context.res = res;
  context.routeKey = key;
  context.server = this;
  return context;
}
/**
 * HttpProcessor defines the contract for executing raw HTTP requests.
 * The protocol handler uses an injected implementation of this
 * interface to perform the actual network operation, enabling the
 * calling code to remain agnostic of the underlying HTTP client
 * (fetch, axios, node's http module, etc.).
 */
export interface HttpProcessor {
  /**
   * Execute an HTTP request.  The return value should be a promise
   * resolving to whatever data your handlers expect.  It is up to
   * the implementation to encode the body, append query parameters,
   * and parse the response appropriately.
   */
  request (input: HttpRequestInput): Promise<unknown>;
}
type Params<T extends string> = T extends `${infer U}/:${infer V}` ? Record<V, unknown> : null;
export type HttpRouteDefinition<T extends string> = {
  method: HttpMethod;
  path: T;
  request: {
    params: PathParams<T>;
    query: object | null;
    body: object | null;
  };
  response: object | null;
  run: BuildCallback<T>;
};
export type UserRouteDefinition<T extends string> = {
  method: HttpMethod;
  path: T;
  run: {
    context: UserContext<any, T, any, any, any, any>;
    callback: UserCallback<T, any>;
  }
}

type UserContext<
  Ctx extends Record<string, unknown>,
  TPath extends string = string,
  TResBody extends Record<string, unknown> | null = null,
  TBody extends Record<string, unknown> | null = null,
  TQuery extends Record<string, unknown> | null = null,
  TLocals extends Record<string, any> = Record<string, any>
> = (
  request: Request<TPath, TResBody, TBody, TQuery, TLocals>
) => Ctx;

type DefinedCallback<TReq extends import("express").Request<any, any, any, any, any>, TResp extends import("express").Response> = (request: TReq, response: TResp) => any | Promise<any>;

type BuildCallback<P extends string> = <
  Ctx extends Record<string, unknown>,
  TResBody extends Record<string, any> | null,
  TBody extends Record<string, any> | null,
  TQry extends Record<string, any> | null
>(request: import("express").Request<ParamsDict<P>, TResBody, TBody, TQry>, response: import("express").Response<TResBody>, context: UserContext<Ctx, P, TResBody, TBody, TQry>) => DefinedCallback<typeof request, typeof response>;

export type PathParams<TPath extends string = string> =
  TPath extends `${infer _Start}/:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof PathParams<`/${Rest}`>]: string }
    : TPath extends `${infer _Start}/:${infer Param}`
      ? { [K in Param]: string }
  : null;

export type ParamsDict<TPath extends string> = TPath extends `${infer _Start}/:${infer Param}/${infer Rest}`
  ? Param | ParamsDict<`/${Rest}`>
  : TPath extends `${infer _Start}/:${infer Param}`
    ? Param
  : import("express").Request["params"];

export type HttpRouteMap<P extends string> = Record<string, HttpRouteDefinition<P>>;

export type InferHttpRequest<T extends HttpRouteDefinition<P>, P extends string = string> = {
  params: string extends P ? P extends `${infer U extends string}/:${infer V extends string}`
        ? Record<V, unknown>
        : P extends `${string}/:${infer V extends string}` ? Record<V, unknown> : null;
  query: T["request"]["query"] extends null ? null : Partial<TypeFromLiteral<T["request"]["query"]>>;
  body: T["request"]["body"] extends null ? null : Partial<TypeFromLiteral<T["request"]["body"]>>;
};

export type InferHttpResponse<T extends HttpRouteDefinition<P>, P extends string = string> =
  T["response"] extends null ? null : TypeFromLiteral<T["response"]>;

export type InferHttpRoute<T extends HttpRouteDefinition<P>, P extends string = string> = {
  method: T["method"];
  path: T["path"] extends P ? T["path"] : never;
  request: InferHttpRequest<T, P>;
  response: InferHttpResponse<T, P>;
  run: T["run"] extends (request: PRequest<infer TPath, infer RBdy, infer TBody, infer TQry, infer Ctx extends Record<string, unknown>>, response: import("express").Response<infer RBdy, infer Ctx2 extends Record<string, unknown>>, ctx: infer Ctx3 extends Record<string, unknown>) => infer R ? (request: PRequest<Ctx, TPath, TBody, TQry>, response: import("express").Response<RBdy, Ctx>, ctx: Ctx) => R : never;
};

export type InferHttpRoutes<T extends HttpRouteMap<P>, P extends string = string> = {
  [K in keyof T]: InferHttpRoute<T[K], P>;
};

export interface TypedHttpServerOptions<TRoutes extends HttpRouteMap<string>> {
  port?: number;
  host?: string;
  routes: TRoutes;
  handlers?: HttpHandlerMap<TRoutes>;
  onError?: (ctx: {
    error: unknown;
    req: IncomingMessage;
    res: import("node:http").ServerResponse;
  }) => void;
}

export interface TypedExpressHttpServerOptions<TRoutes extends HttpRouteMap<string>> {
  port?: number;
  host?: string;
  routes: TRoutes;
  handlers?: HttpHandlerMap<TRoutes>;
  app?: Express;
  onError?: (ctx: {
    error: unknown;
    req: Request;
    res: Response;
  }) => void;
}

export type HttpHandlerMap<TRoutes extends HttpRouteMap<string>> = {
  [K in keyof TRoutes]?: (
    args: InferHttpRequest<TRoutes[K]>,
    ctx: HttpHandlerContext<TRoutes, K>
  ) => InferHttpResponse<TRoutes[K]> | Promise<InferHttpResponse<TRoutes[K]>>;
};
export class TypedHttpServer<TRoutes extends HttpRouteMap<string>> {
  private readonly routes: TRoutes;
  private readonly server: HttpServer;
  private readonly port?: number;
  private readonly host: string;
  private readonly onError?: TypedHttpServerOptions<TRoutes>["onError"];
  private readonly handlers: HttpHandlerMap<TRoutes>;
  public constructor (options: TypedHttpServerOptions<TRoutes>) {
    this.handlers = options.handlers ?? {};
    this.routes = options.routes;
    this.port = options.port;
    this.host = options.host ?? "127.0.0.1";
    this.onError = options.onError;

    this.server = createServer(async (req, res) => {
      await this.handleNodeRequest(req, res);
    });
  }

  public listen (port?: number, callback?: () => void): void {
    const resolvedPort = port ?? this.port;
    if (typeof resolvedPort !== "number") {
      throw new Error("No port provided.");
    }

    this.server.listen(resolvedPort, this.host, callback);
  }

  public close (callback?: (error?: Error) => void): void {
    this.server.close((error) => {
      callback?.(error ?? undefined);
    });
  }

  public getDefinitions (): InferHttpRoutes<TRoutes> {
    const result = {} as InferHttpRoutes<TRoutes>;

    for (const key in this.routes) {
      const route = this.routes[key];

      result[key] = {
        method: route.method,
        path: route.path,
        request: {
          params: route.request.params === null ? null : resolveValue(route.request.params),
          query: route.request.query === null ? null : resolveValue(route.request.query),
          body: route.request.body === null ? null : resolveValue(route.request.body),
        },
        response: route.response === null ? null : resolveValue(route.response),
      } as InferHttpRoutes<TRoutes>[typeof key];
    }

    return result;
  }

  public createHandlerContext<TKey extends keyof TRoutes> (
    req: IncomingMessage,
    res: import("node:http").ServerResponse,
    routeKey: TKey
  ): HttpHandlerContext<TRoutes, TKey> {
    return {
      req,
      res,
      routeKey,
      server: this,
    };
  }

  public async call<TKey extends keyof TRoutes> (
    routeKey: TKey,
    args: InferHttpRequest<TRoutes[TKey]>,
    ctx: HttpHandlerContext<TRoutes, TKey>
  ): Promise<InferHttpResponse<TRoutes[TKey]>> {
    const route = this.routes[routeKey];
    if (!route) {
      throw new Error(`Unknown route: ${ String(routeKey) }`);
    }

    const runtimeHandler = this.handlers[routeKey];
    const routeHandler = route.run;

    const handler = runtimeHandler ?? routeHandler;

    if (!handler) {
      throw new Error(`Route "${ String(routeKey) }" has no handler.`);
    }
    if (!route.run) {
      throw new Error(`Route "${ String(routeKey) }" has no run() handler.`);
    }

    const result = await handler(args, ctx);
    return result as InferHttpResponse<TRoutes[TKey]>;
  }

  private async handleNodeRequest (
    req: IncomingMessage,
    res: import("node:http").ServerResponse
  ): Promise<void> {
    try {
      const method = (req.method ?? "GET").toUpperCase() as HttpMethod;
      const url = new URL(req.url ?? "/", `http://${ req.headers.host ?? "127.0.0.1" }`);

      for (const key in this.routes) {
        const route = this.routes[key];

        if (route.method !== method) continue;

        const params = this.matchPath(route.path, url.pathname);
        if (!params) continue;

        const query = this.parseQuery(url);
        const body = await this.parseBody(req);

        if (!route.run) {
          this.sendJson(res, 500, {
            ok: false,
            error: `Route "${ key }" has no run() handler.`,
          });
          return;
        }

        const result = await route.run(
          {
            params: route.request.params === null ? null : params,
            query: route.request.query === null ? null : query,
            body: route.request.body === null ? null : body,
          },
          { req, res, routeKey: key }
        );

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
    } catch (error) {
      this.onError?.({ error, req, res });

      this.sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown server error",
      });
    }
  }

  private matchPath (
    routePath: string,
    actualPath: string
  ): Record<string, string> | null {
    const routeParts = routePath.split("/").filter(Boolean);
    const actualParts = actualPath.split("/").filter(Boolean);

    if (routeParts.length !== actualParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

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

  private parseQuery (url: URL): Record<string, string | string[]> {
    const query: Record<string, string | string[]> = {};

    for (const key of url.searchParams.keys()) {
      const values = url.searchParams.getAll(key);
      query[key] = values.length <= 1 ? (values[0] ?? "") : values;
    }

    return query;
  }

  private async parseBody (req: IncomingMessage): Promise<unknown> {
    const contentType = String(req.headers["content-type"] ?? "").toLowerCase();

    const expectsBinary =
      contentType.includes("application/octet-stream") ||
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
      } catch {
        throw new Error("Invalid JSON request body.");
      }
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(raw);
      const parsed: Record<string, string | string[]> = {};

      for (const key of params.keys()) {
        const values = params.getAll(key);
        parsed[key] = values.length <= 1 ? (values[0] ?? "") : values;
      }

      return parsed;
    }

    return raw;
  }
  private async readRequestText (req: IncomingMessage): Promise<string> {
    const decoder = new TextDecoder("utf-8");
    let raw = "";

    for await (const chunk of req) {
      if (typeof chunk === "string") {
        raw += chunk;
      } else {
        raw += decoder.decode(chunk, { stream: true });
      }
    }

    raw += decoder.decode();
    return raw;
  }

  private async readRequestBytes (req: IncomingMessage): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];

    for await (const chunk of req) {
      if (typeof chunk === "string") {
        chunks.push(new TextEncoder().encode(chunk));
      } else {
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

  private sendJson (
    res: import("node:http").ServerResponse,
    status: number,
    body: unknown
  ): void {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  }
}

export class TypedExpressHttpServer<TRoutes extends HttpRouteMap<string>> {
  private readonly routes: TRoutes;
  private readonly handlers: HttpHandlerMap<TRoutes>;
  private readonly app: Express;
  private readonly host: string;
  private readonly port?: number;
  private readonly onError?: TypedExpressHttpServerOptions<TRoutes>["onError"];
  private instance: import('node:http').Server | null = null;

  public constructor (options: TypedExpressHttpServerOptions<TRoutes>) {
    this.routes = options.routes;
    this.handlers = options.handlers ?? {};
    this.app = options.app ?? express();
    this.host = options.host ?? '127.0.0.1';
    this.port = options.port;
    this.onError = options.onError;

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.registerRoutes();
  }

  public getApp (): Express {
    return this.app;
  }

  public listen (port?: number, callback?: () => void): void {
    const resolvedPort = port ?? this.port;
    if (typeof resolvedPort !== 'number') {
      throw new Error('No port provided.');
    }

    this.instance = this.app.listen(resolvedPort, this.host, callback);
  }

  public close (callback?: (error?: Error) => void): void {
    if (!this.instance) {
      callback?.();
      return;
    }

    this.instance.close((error) => {
      callback?.(error ?? undefined);
    });
  }

  public getDefinitions (): InferHttpRoutes<TRoutes> {
    const result = {} as InferHttpRoutes<TRoutes>;

    for (const key in this.routes) {
      const route = this.routes[key];

      result[key] = {
        method: route.method,
        path: route.path,
        request: {
          params: route.request.params === null ? null : resolveValue(route.request.params),
          query: route.request.query === null ? null : resolveValue(route.request.query),
          body: route.request.body === null ? null : resolveValue(route.request.body),
        },
        response: route.response === null ? null : resolveValue(route.response),
      } as InferHttpRoutes<TRoutes>[typeof key];
    }

    return result;
  }

  private registerRoutes (): void {
    for (const key in this.routes) {
      const route = this.routes[key];
      const method = route.method.toLowerCase() as Lowercase<HttpMethod>;

      this.app[method](route.path, async (req, res) => {
        try {
          const runtimeHandler = this.handlers[key as keyof TRoutes];
          const routeHandler = route.run;
          const handler = runtimeHandler ?? routeHandler;

          if (!handler) {
            res.status(500).json({ ok: false, error: `Route "${ key }" has no handler.` });
            return;
          }

          const ctx = {
            req: req as IncomingMessage,
            res: res as unknown as import('node:http').ServerResponse,
            routeKey: key as keyof TRoutes,
            server: this as unknown as TypedHttpServer<TRoutes>,
          } as HttpHandlerContext<TRoutes, keyof TRoutes>;

          const result = await handler(
            {
              params: route.request.params === null ? null : (req.params as any),
              query: route.request.query === null ? null : (req.query as any),
              body: route.request.body === null ? null : req.body,
            } as InferHttpRequest<TRoutes[typeof key]>,
            ctx as HttpHandlerContext<TRoutes, typeof key>
          );

          res.status(200).json({ ok: true, data: result });
        } catch (error) {
          this.onError?.({ error, req, res });
          res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown server error',
          });
        }
      });
    }
  }
}
