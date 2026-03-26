/*
 * Common types used throughout the protocol handler library.
 *
 * The HttpMethod union represents the set of valid HTTP methods accepted
 * by the library. WebSocket actions are represented by WsAction.  These
 * enums help constrain user input and improve type safety across the
 * request routing logic.
 */

export { };

declare global {
  export type ParamsDict<TPath extends string> = TPath extends `${ infer _Start }/:${ infer Param }/${ infer Rest }`
    ? Param | ParamsDict<`/${ Rest }`>
    : TPath extends `${ infer _Start }/:${ infer Param }`
    ? Param
    : import("express").Request["params"];

  export type WsMessageScope = "broadcast" | "channel" | "client";

  export type WsEnvelopeBase<TScope extends WsMessageScope> = TScope extends "broadcast" ? { scope: "broadcast"; channelId?: undefined, targetId?: undefined; } : TScope extends "channel" ? { scope: "channel"; channelId: string; targetId?: undefined; } : TScope extends "client" ? { scope: "client"; targetId: string; channelId?: undefined; } : never;
  /**
   * Valid HTTP methods recognised by the protocol handler.  Additional
   * methods may be added here if your application needs to support
   * custom verbs.
   */
  export type HttpMethod =
    | 'get'
    | 'post'
    | 'put'
    | 'patch'
    | 'delete';

  /**
   * Basic runtime validator.
   *
   * It accepts unknown input and either:
   * - returns a validated/converted value
   * - throws an error
   */
  export type Validator<T> = {
    parse: (input: unknown) => T;
  };

  /**
   * Pulls the TypeScript type out of a Validator<T>.
   */
  export type InferValidator<TValidator> = TValidator extends Validator<infer TValue>
    ? TValue
    : never;

  /**
   * A map of validators for object-like input.
   *
   * Example:
   * {
   *   userID: numberValidator,
   *   search: stringValidator
   * }
   */
  export type ValidatorShape<T = any> = Record<string, Validator<T>>;

  /**
   * Converts a validator object into its inferred object type.
   *
   * Example:
   * {
   *   userID: Validator<number>,
   *   search: Validator<string>
   * }
   *
   * becomes:
   * {
   *   userID: number,
   *   search: string
   * }
   */
  export type InferValidatorShape<TShape extends ValidatorShape> = {
    [K in keyof TShape]: InferValidator<TShape[K]>;
  };

  /**
   * Extracts route param names from a path string.
   *
   * "/users/:userID/posts/:postID"
   * => "userID" | "postID"
   */
  export type PathParamNames<TPath extends string> =
    TPath extends `${ string }:${ infer Param }/${ infer Rest }`
    ? Param | PathParamNames<`/${ Rest }`>
    : TPath extends `${ string }:${ infer Param }`
    ? Param
    : never;

  /**
   * Builds the required validator shape for route params based on the path.
   *
   * "/users/:userID/posts/:postID"
   * =>
   * {
   *   userID: Validator<any>;
   *   postID: Validator<any>;
   * }
   */
  export type PathParamsValidatorShape<TPath extends string> = [PathParamNames<TPath>] extends [never]
    ? {}
    : {
      [K in PathParamNames<TPath>]: Validator<any>;
    };

  /**
   * Route request definition.
   *
   * - params shape is dictated by the path string
   * - query/body are optional validator maps
   */
  export type RouteRequestDefinition<
    TPath extends string,
    TParamsShape extends PathParamsValidatorShape<TPath>,
    TQueryShape extends ValidatorShape | undefined,
    TBodyShape extends ValidatorShape | undefined,
  > = {
    params?: TParamsShape;
    query?: TQueryShape;
    body?: TBodyShape;
  };

  /**
   * Inferred params type.
   */
  export type InferRouteParams<
    TPath extends string,
    TParamsShape extends PathParamsValidatorShape<TPath> | undefined,
  > =
    TParamsShape extends ValidatorShape
    ? InferValidatorShape<TParamsShape>
    : [PathParamNames<TPath>] extends [never]
    ? {}
    : Record<PathParamNames<TPath>, string>;

  /**
   * Inferred query type.
   */
  export type InferRouteQuery<TQueryShape extends ValidatorShape | undefined> =
    TQueryShape extends ValidatorShape ? InferValidatorShape<TQueryShape> : {};

  /**
   * Inferred body type.
   */
  export type InferRouteBody<TBodyShape extends ValidatorShape | undefined> =
    TBodyShape extends ValidatorShape ? InferValidatorShape<TBodyShape> : {};

  /**
   * The typed request that handlers receive after validation.
   *
   * It extends Express.Request but replaces:
   * - params
   * - query
   * - body
   */
  export type TypedRequest<
    TPath extends string,
    TParamsShape extends PathParamsValidatorShape<TPath> | undefined,
    TQueryShape extends ValidatorShape | undefined,
    TBodyShape extends ValidatorShape | undefined,
  > = Omit<
    import("express").Request<
      InferRouteParams<TPath, TParamsShape>,
      any,
      InferRouteBody<TBodyShape>,
      InferRouteQuery<TQueryShape>
    >,
    'params' | 'query' | 'body'
  > & {
    params: InferRouteParams<TPath, TParamsShape>;
    query: InferRouteQuery<TQueryShape>;
    body: InferRouteBody<TBodyShape>;
  };

  /**
   * What handlers are allowed to return.
   *
   * You can expand this later.
   */
  export type TypedResponse<TResponseBody = unknown> = import("express").Response<TResponseBody> & {
    status?: number;
    body?: TResponseBody;
    headers?: Record<string, string>;
  };

  /**
   * Route definition.
   *
   * Context is optional.
   * Callback receives the typed request + response + context.
   */
  export type RouteDefinition<
    TMethod extends HttpMethod,
    TPath extends string,
    TParamsShape extends PathParamsValidatorShape<TPath> = PathParamsValidatorShape<TPath>,
    TQueryShape extends ValidatorShape | undefined = undefined,
    TBodyShape extends ValidatorShape | undefined = undefined,
    TContext = undefined,
    TResponseBody = unknown,
  > = {
    method: TMethod;
    path: TPath;
    request?: RouteRequestDefinition<TPath, TParamsShape, TQueryShape, TBodyShape>;
    handlers: {
      context?: (
        req: TypedRequest<TPath, TParamsShape, TQueryShape, TBodyShape>
      ) => MaybePromise<TContext>;
      callback: (
        req: TypedRequest<TPath, TParamsShape, TQueryShape, TBodyShape>,
        res: TypedResponse<TResponseBody>,
        ctx: TContext
      ) => MaybePromise<HandlerResult<TResponseBody> | void>;
    };
  };

  /**
   * The built route returned by the builder.
   */
  export type BuiltRoute<
    TMethod extends HttpMethod = HttpMethod,
    TPath extends string = string,
    TParamsShape extends PathParamsValidatorShape<TPath> = PathParamsValidatorShape<TPath>,
    TQueryShape extends ValidatorShape | undefined = undefined,
    TBodyShape extends ValidatorShape | undefined = undefined,
    TContext = undefined,
    TResponseBody = unknown,
  > = {
    method: TMethod;
    path: TPath;
      controller: (
        req: TypedRequest<TPath, TParamsShape, TQueryShape, TBodyShape> extends import("express").Request
          ? TypedRequest<TPath, TParamsShape, TQueryShape, TBodyShape>
          : never,
        res: TypedResponse<TResponseBody> extends import("express").Response<TResponseBody, infer U> ? TypedResponse<TResponseBody> : never,
        next: import("express").NextFunction
      ) => Promise<void>;
  };

  /**
   * A map of route definitions.
   *
   * Example:
   * {
   *   getUser: RouteDefinition<...>,
   *   uploadFile: RouteDefinition<...>
   * }
   */
  export type RouteMap<O extends object> = { [K in keyof O as O[K] extends infer T extends RouteDefinition<HttpMethod, string, PathParamsValidatorShape<string>, ValidatorShape | undefined, ValidatorShape | undefined, any, unknown> ? K : never]: O[K] extends infer T extends RouteDefinition<HttpMethod, string, PathParamsValidatorShape<string>, ValidatorShape | undefined, ValidatorShape | undefined, any, unknown> ? T extends RouteDefinition<infer U, infer V, infer W, infer X, infer Y, infer Z, infer A> ? RouteDefinition<U, V, W, X, Y, Z, A> : never : never };//Record<string, RouteDefinition<any, any, any, any, any, any, any>>;

  /**
   * A map of built routes.
   */
  export type BuiltRouteMap<TRoutes extends RouteMap> = {
    [K in keyof TRoutes]: TRoutes[K] extends RouteDefinition<infer TMethod, infer TPath, any, any, any, any, any>
    ? BuiltRoute<TMethod, TPath>
    : never;
  };

  /**
   * Helper for registering route maps onto an Express app.
   */
  export type ExpressLike = Pick<
    import("express").Express,
    'get' | 'post' | 'put' | 'patch' | 'delete'
  >;

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
    headers?: import("node:http").IncomingHttpHeaders;
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
  export type WsHandlerRequest<T extends string = string> =
    | WsConnectHandlerRequest<T>
    | WsSendHandlerRequest<T>
    | WsCloseHandlerRequest<T>;

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

  export type TypeFromLiteral<T> =
    T extends FieldDefinition<infer U> ? U
    : T extends (...args: any[]) => infer R ? R
    : T extends readonly [unknown, ...unknown[]]
    ? { [K in keyof T]: TypeFromLiteral<T[K]> }
    : T extends readonly (infer U)[]
    ? Array<TypeFromLiteral<U>>
    : T extends object
    ? { [K in keyof T]: TypeFromLiteral<T[K]> }
    : T;

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
      type: K; // keep literal key
      payload: Widen<T[K]["payload"]>; // widen leaf literals
      target: T[K]["target"] extends AnyEnvelope
      ? T[K]["target"]
      : WsEnvelopeBase<"broadcast">;
    };
  };

  export type Widen<T> =
    T extends string ? string :
    T extends number ? number :
    T extends boolean ? boolean :
    T extends readonly (infer U)[] ? Widen<U>[] :
    T extends (...args: any[]) => any ? T :
    T extends object ? { [K in keyof T]: Widen<T[K]> } :
    T;

  export interface RegExpMatchPathArray extends RegExpExecArray {
    groups: RegExpExecArray["groups"] & {
      path: string;
      param: string | undefined;
    };
    hasParam: boolean;
  };

  export type UserContext<
    Ctx extends Record<string, any>,
    TPath extends string = string,
    TResBody extends Record<string, unknown> | null = null,
    TBody extends Record<string, unknown> | null = null,
    TQuery extends Record<string, unknown> | null = null,
    TLocals extends Record<string, any> = Record<string, any>
  > = (
    request: import("express").Request<ParamsDict<TPath>, TResBody, TBody, TQuery, TLocals>
  ) => Ctx;




  export type DefinedCallback<TReq extends import("express").Request<any, any, any, any, any>, TResp extends import("express").Response> = (request: TReq, response: TResp) => any | Promise<any>;

  export type UserCallback<P extends string, F extends UserContext<any, P, any, any, any, any>> = (req: import('express').Request<ParamsDict<P>, any, any, any, any>, response: import("express").Response<any, any>, ctx: ReturnType<F>) => any;

  // type BuildCallback<P extends string> = <
  //   Ctx extends Record<string, unknown>,
  //   TResBody extends Record<string, any> | null,
  //   TBody extends Record<string, any> | null,
  //   TQry extends Record<string, any> | null
  // >(request: import("express").Request<ParamsDict<P>, TResBody, TBody, TQry>, response: import("express").Response<TResBody>, context: UserContext<Ctx, P, TResBody, TBody, TQry>) => DefinedCallback<typeof request, typeof response>;

  export type BuildCallback<Pth extends string> = <
    Ctx extends Record<string, any>,
    Qry extends Record<string, unknown> | null,
    Bdy extends Record<string, unknown> | null,
    RBdy extends Record<string, unknown> | null,
    TLocals extends Record<string, any>,
    F extends UserContext<Ctx, Pth, RBdy, Bdy, Qry, TLocals>,
    C extends UserCallback<Pth, F>
  >(
    context: F,
    controller: C
  ) => (req: import("express").Request<ParamsDict<Pth>, RBdy, Bdy, Qry, TLocals>, response: import("express").Response<RBdy, TLocals>) => ReturnType<C>;
}
// export type BuildCallback<P extends string> = <
//   Ctx extends Record<string, unknown>,
//   TResBody extends Record<string, any> | null,
//   TBody extends Record<string, any> | null,
//   TQry extends Record<string, any> | null
// >(request: import("express").Request<ParamsDict<P>, TResBody, TBody, TQry>, response: import("express").Response<TResBody>, context: UserContext<Ctx, P, TResBody, TBody, TQry>) => DefinedCallback<typeof request, typeof response>;
