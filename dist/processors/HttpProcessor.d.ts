import { IncomingMessage } from 'node:http';
import type { OutgoingHttpHeaders } from 'node:http';
import { type Express, type Request, type Response } from 'express';
import { HttpMethod, TypeFromLiteral, UserCallback, type Request as PRequest } from '../types';
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
export type HttpHandlerContext<TRoutes extends HttpRouteMap<string>, TKey extends keyof TRoutes> = {
    req: IncomingMessage;
    res: import("node:http").ServerResponse;
    routeKey: TKey;
    server: TypedHttpServer<TRoutes>;
};
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
    request(input: HttpRequestInput): Promise<unknown>;
}
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
    };
};
type UserContext<Ctx extends Record<string, unknown>, TPath extends string = string, TResBody extends Record<string, unknown> | null = null, TBody extends Record<string, unknown> | null = null, TQuery extends Record<string, unknown> | null = null, TLocals extends Record<string, any> = Record<string, any>> = (request: Request<TPath, TResBody, TBody, TQuery, TLocals>) => Ctx;
type DefinedCallback<TReq extends import("express").Request<any, any, any, any, any>, TResp extends import("express").Response> = (request: TReq, response: TResp) => any | Promise<any>;
type BuildCallback<P extends string> = <Ctx extends Record<string, unknown>, TResBody extends Record<string, any> | null, TBody extends Record<string, any> | null, TQry extends Record<string, any> | null>(request: import("express").Request<ParamsDict<P>, TResBody, TBody, TQry>, response: import("express").Response<TResBody>, context: UserContext<Ctx, P, TResBody, TBody, TQry>) => DefinedCallback<typeof request, typeof response>;
export type PathParams<TPath extends string = string> = TPath extends `${infer _Start}/:${infer Param}/${infer Rest}` ? {
    [K in Param | keyof PathParams<`/${Rest}`>]: string;
} : TPath extends `${infer _Start}/:${infer Param}` ? {
    [K in Param]: string;
} : null;
export type ParamsDict<TPath extends string> = TPath extends `${infer _Start}/:${infer Param}/${infer Rest}` ? Param | ParamsDict<`/${Rest}`> : TPath extends `${infer _Start}/:${infer Param}` ? Param : import("express").Request["params"];
export type HttpRouteMap<P extends string> = Record<string, HttpRouteDefinition<P>>;
export type InferHttpRequest<T extends HttpRouteDefinition<P>, P extends string = string> = {
    params: string extends P ? P extends `${infer U extends string}/:${infer V extends string}` ? Record<V, unknown> : P extends `${string}/:${infer V extends string}` ? Record<V, unknown> : null : ;
    query: T["request"]["query"] extends null ? null : Partial<TypeFromLiteral<T["request"]["query"]>>;
    body: T["request"]["body"] extends null ? null : Partial<TypeFromLiteral<T["request"]["body"]>>;
};
export type InferHttpResponse<T extends HttpRouteDefinition<P>, P extends string = string> = T["response"] extends null ? null : TypeFromLiteral<T["response"]>;
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
    [K in keyof TRoutes]?: (args: InferHttpRequest<TRoutes[K]>, ctx: HttpHandlerContext<TRoutes, K>) => InferHttpResponse<TRoutes[K]> | Promise<InferHttpResponse<TRoutes[K]>>;
};
export declare class TypedHttpServer<TRoutes extends HttpRouteMap<string>> {
    private readonly routes;
    private readonly server;
    private readonly port?;
    private readonly host;
    private readonly onError?;
    private readonly handlers;
    constructor(options: TypedHttpServerOptions<TRoutes>);
    listen(port?: number, callback?: () => void): void;
    close(callback?: (error?: Error) => void): void;
    getDefinitions(): InferHttpRoutes<TRoutes>;
    createHandlerContext<TKey extends keyof TRoutes>(req: IncomingMessage, res: import("node:http").ServerResponse, routeKey: TKey): HttpHandlerContext<TRoutes, TKey>;
    call<TKey extends keyof TRoutes>(routeKey: TKey, args: InferHttpRequest<TRoutes[TKey]>, ctx: HttpHandlerContext<TRoutes, TKey>): Promise<InferHttpResponse<TRoutes[TKey]>>;
    private handleNodeRequest;
    private matchPath;
    private parseQuery;
    private parseBody;
    private readRequestText;
    private readRequestBytes;
    private sendJson;
}
export declare class TypedExpressHttpServer<TRoutes extends HttpRouteMap<string>> {
    private readonly routes;
    private readonly handlers;
    private readonly app;
    private readonly host;
    private readonly port?;
    private readonly onError?;
    private instance;
    constructor(options: TypedExpressHttpServerOptions<TRoutes>);
    getApp(): Express;
    listen(port?: number, callback?: () => void): void;
    close(callback?: (error?: Error) => void): void;
    getDefinitions(): InferHttpRoutes<TRoutes>;
    private registerRoutes;
}
export {};
