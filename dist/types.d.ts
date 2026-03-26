import { InferHttpRoutes, HttpRouteMap, ParamsDict } from './processors/HttpProcessor';
import { WsEnvelopeBase, WsMessageScope } from './processors/WsProcessor';
import type { IncomingHttpHeaders } from 'node:http';
/**
 * Valid HTTP methods recognised by the protocol handler.  Additional
 * methods may be added here if your application needs to support
 * custom verbs.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/**
 * Valid WebSocket actions used to discriminate between connection
 * lifecycle operations and message sending.  These values correspond
 * to typical WebSocket interactions: establishing a connection,
 * sending data, and closing the connection.
 */
export type WsAction = 'connect' | 'send' | 'close';
/**
 * Base fields required by routed handler requests.
 */
export interface RoutedRequest<T extends string = string> {
    handler: T;
}
/**
 * Canonical HTTP request shape accepted by protocol handlers.
 *
 * `endpoint` is required because the core normaliser can derive `url`
 * from endpoint + default host when `url` is omitted.
 */
export interface HttpHandlerRequest<T extends string = string> extends RoutedRequest<T> {
    method: HttpMethod;
    endpoint: string;
    url?: string;
    headers?: IncomingHttpHeaders;
    body?: unknown;
    query?: Record<string, string | number | boolean | Array<string | number | boolean>>;
}
/**
 * Canonical WebSocket connect request accepted by protocol handlers.
 */
export interface WsConnectHandlerRequest<T extends string = string> extends RoutedRequest<T> {
    action: 'connect';
    url?: string;
    protocols?: string | string[];
}
/**
 * Canonical WebSocket send request accepted by protocol handlers.
 */
export interface WsSendHandlerRequest<T extends string = string> extends RoutedRequest<T> {
    action: 'send';
    connectionId: string;
    event: string;
    payload?: unknown;
}
/**
 * Canonical WebSocket close request accepted by protocol handlers.
 */
export interface WsCloseHandlerRequest<T extends string = string> extends RoutedRequest<T> {
    action: 'close';
    connectionId: string;
    code?: number;
    reason?: string;
}
/**
 * Canonical WebSocket request union accepted by protocol handlers.
 */
export type WsHandlerRequest<T extends string = string> = WsConnectHandlerRequest<T> | WsSendHandlerRequest<T> | WsCloseHandlerRequest<T>;
/**
 * Canonical protocol request union accepted by dispatch.
 */
export type ProtocolHandlerRequest<T extends string = string> = HttpHandlerRequest<T> | WsHandlerRequest<T>;
/**
 * Generic object response envelope for consumers who prefer
 * consistent object-based responses.
 */
export interface ResponseEnvelope<TData = unknown> {
    ok: boolean;
    data?: TData;
    error?: string;
}
/**
 * Helper type to represent a promise or a synchronous value.  Several
 * handler signatures accept or return MaybePromise<T> to allow both
 * synchronous and asynchronous implementations.
 */
export type MaybePromise<T> = T | Promise<T>;
export type FieldDefinition<T> = {
    __kind: "field";
    default?: T;
    create?: () => T;
};
export type TypeFromLiteral<T> = T extends FieldDefinition<infer U> ? U : T extends (...args: any[]) => infer R ? R : T extends readonly [unknown, ...unknown[]] ? {
    [K in keyof T]: TypeFromLiteral<T[K]>;
} : T extends readonly (infer U)[] ? Array<TypeFromLiteral<U>> : T extends object ? {
    [K in keyof T]: TypeFromLiteral<T[K]>;
} : T;
export type CreatedTypes<S extends Record<string, any>> = S extends object ? {
    [K in keyof S]: S[K] extends null ? null : TypeFromLiteral<S[K]>;
} : never;
export type HttpRequestDefinition = {
    params: object | null;
    query: object | null;
    body: object | null;
};
export type Payload = Record<string, unknown> | null;
export type AnyEnvelope = WsEnvelopeBase<WsMessageScope>;
export type MessageInput = {
    payload: Payload;
    target?: AnyEnvelope;
};
export type MessageInputMap<T extends string> = Record<T, MessageInput>;
export type EvaluatedMessages<T extends MessageInputMap<string>> = {
    [K in keyof T & string]: {
        type: K;
        payload: Widen<T[K]["payload"]>;
        target: T[K]["target"] extends AnyEnvelope ? T[K]["target"] : WsEnvelopeBase<"broadcast">;
    };
};
export type Widen<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T extends readonly (infer U)[] ? Widen<U>[] : T extends (...args: any[]) => any ? T : T extends object ? {
    [K in keyof T]: Widen<T[K]>;
} : T;
export interface RegExpMatchPathArray extends RegExpMatchArray {
    groups: RegExpMatchArray["groups"] & {
        path: string;
        param: string | undefined;
    };
    hasParam: boolean;
}
export type UserContext<Ctx extends Record<string, any>, TPath extends string = string, TResBody extends Record<string, unknown> | null = null, TBody extends Record<string, unknown> | null = null, TQuery extends Record<string, unknown> | null = null, TLocals extends Record<string, any> = Record<string, any>> = (request: import("express").Request<ParamsDict<TPath>, TResBody, TBody, TQuery, TLocals>) => Ctx;
export type Request<TPath extends string = string, RBdy extends Record<string, unknown> | null = null, TBody extends Record<string, unknown> | null = null, TQuery extends Record<string, unknown> | null = null, TLocals extends Record<string, any> = Record<string, any>> = import('express').Request<ParamsDict<TPath>, RBdy, TBody, TQuery, TLocals>;
export type DefinedCallback<TReq extends import("express").Request<any, any, any, any, any>, TResp extends import("express").Response> = (request: TReq, response: TResp) => any | Promise<any>;
export type UserCallback<P extends string, F extends UserContext<any, P, any, any, any, any>> = (req: import('express').Request<ParamsDict<P>, any, any, any, any>, response: import("express").Response<any, any>, ctx: ReturnType<F>) => any;
export type BuildCallback<Pth extends string> = <Ctx extends Record<string, any>, Qry extends Record<string, unknown> | null, Bdy extends Record<string, unknown> | null, RBdy extends Record<string, unknown> | null, TLocals extends Record<string, any>, F extends UserContext<Ctx, Pth, RBdy, Bdy, Qry, TLocals>, C extends UserCallback<Pth, F>>(context: F, controller: C) => (req: import("express").Request<ParamsDict<Pth>, RBdy, Bdy, Qry, TLocals>, response: import("express").Response<RBdy, TLocals>) => ReturnType<C>;
export type RouteFactory<P extends string, T extends HttpRouteMap<P>> = () => InferHttpRoutes<T, P>;
