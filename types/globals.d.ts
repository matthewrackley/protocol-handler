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

  export type FromValueKind<T extends ValueKind> =
    T extends "null" ? null :
    T extends "undefined" ? undefined :
    T extends "boolean" ? boolean :
    T extends "bigint" ? bigint :
    T extends "number" ? number :
    T extends "symbol" ? symbol :
    T extends "object" ? object :
    T extends "function" ? Function :
    T extends "string" ? string :
    T extends "array" ? Array<FromValueKind<any>>  :
    never;



  export type IncludeAll<T extends readonly any[], U extends any> =
    [U] extends [T[number]] ? T : never;

  export type MustInclude = {
    [K in ValueKind]: K extends "array" ? Exclude<FromValueKind<K>, undefined | null> : FromValueKind<K>;
  };

  export type RequireKeys<T, K extends PropertyKey> = T extends Record<K, unknown> ? T : never;

  export type RuntimeValue<T = unknown> =
    [T] extends ["null"] ? null :
    [T] extends ["undefined"] ? undefined :
    [T] extends ["boolean"] ? boolean :
    [T] extends ["string"] ? string :
    [T] extends ["bigint"] ? bigint :
    [T] extends ["number"] ? number :
    [T] extends ["symbol"] ? symbol :
    [T] extends ["array"] ? PrimitiveArray :
    [T] extends ["function"] ? Function :
    [T] extends ["object"] ? object :
    [T] extends [unknown] ? NonNullPrimitive :
    never;

  export type FromPrimitive<T = unknown> =
    [T] extends [null] ? "null" :
    [T] extends [undefined] ? "undefined" :
    [T] extends [number] ? "number" :
    [T] extends [bigint] ? "bigint" :
    [T] extends [boolean] ? "boolean" :
    [T] extends [string] ? "string" :
    [T] extends [symbol] ? "symbol" :
    [T] extends [PrimitiveArray] ? "array" :
    [T] extends [Function] ? "function" :
    [T] extends [object] ? "object" :
    never;

  export type ToPrimitive<T = unknown> =
    T extends ValueKind ?
      [T] extends ["number"] ? number :
      [T] extends ["bigint"] ? bigint :
      [T] extends ["boolean"] ? boolean :
      [T] extends ["string"] ? string :
      [T] extends ["symbol"] ? symbol :
      [T] extends ["array"] ? PrimitiveArray :
      [T] extends ["function"] ? Function :
      [T] extends ["object"] ? object :
      [T] extends ["null"] ? null :
      [T] extends ["undefined"] ? undefined :
    RuntimeValue<NonNullValueKind> :
  never;


  export interface FunctionDeclaration {
    <T>(...args: [...T[]]): any;
  }
  export type ValidatorName<K extends ValueKind> = `is${K extends "bigint" ? "BigInt" : Capitalize<K>}`;

  export type TypeOf = string | number | boolean | bigint | symbol | object | Function | null | undefined;
  export type PrimitiveArray = [...Exclude<TypeOf, undefined | null>[]];
  export type NonNullPrimitive = Exclude<TypeOf, undefined | null>;
  export type NonNullValueKind = Exclude<ValueKind, "null" | "undefined">;
  export type ValueKind = "string" | "number" | "boolean" | "bigint" | "symbol" | "object" | "function" | "undefined" | "array" | "null";

  export type PrimitiveValidators<T> = {
    [K in ValueKind as ValidatorName<K>]: <I>(value: I) => value is I extends ToPrimitive<T> ? I : never;
  };
  export type PrimitiveValidatorMap = {
    [K in ValueKind as ValidatorName<K>]: <I>(value: I) => value is I extends ToPrimitive<K> ? I : never;
  };
  export type OrString<T> = T extends string | number | bigint | boolean | null | undefined ? `${ T }` | T : T;
  export type BooleanLike = OrString<null | undefined | 0 | 0n | 1 | 1n | boolean> | "NaN" | number | `${ "-" | "" }${ number }${ "n" | "" }`;
  export type NumberLike = `${ "-" | "" }${ number }${ "n" | "" }` | number | bigint;
  export type NegativeNumberLike = `-${ number }`;

  export type ToNegative<T extends number> = `${T extends Negative<T> ? "" : "-"}${T}`;
  export type Negative<T extends number> = `-${T}` | T;
  export type NumToString<N extends number> = `${N}`;
  export type PosNeg<T extends `${ number }`> = T extends `${ infer V extends number }` ? V : never;
  export type Falsey = OrString<0 | false | null | undefined> | "NaN";
  export type ToBoolean<T extends OrString<"" | "NaN" | null | undefined | boolean | 0>> = "boolean";

  export interface Primitives<T extends ValueKind> {
    (): PrimitiveValidators<T>;
    <I>(value: I): value is ToPrimitive<T>;
  }
  export interface Primitive<T extends Exclude<TypeOf, undefined | null>> {
    (): ToPrimitive<T>;
    type: T;
    input: ToPrimitive<T>;
    isValid<I>(value: I): value is I extends ToPrimitive<T> ? I : never;
  }

  export interface ValidatorOptions<B extends boolean> {
    initialInput?: unknown;
    optional?: B;
    typeOf?: TypeOf;
  }

  export type InferOptional<T, B extends boolean = false> = B extends true ? T | undefined : T;

  export type IsTypeOf = <I, TType extends TypeOf>(input: I, type: TType) => input is I extends FromPrimitive<TType> ? I : never;
  export type TypedError = <I, TType extends TypeOf> (input: I, expected: TType) => never;
  /**
   * Basic runtime validator.
   *
   * It accepts unknown input and either:
   * - returns a validated/converted value
   * - throws an error
   */
  export interface ValidateType<T, B extends boolean = false> {
    validatedInput: InferOptional<T, B>;
    #valid: boolean;
    #optional: B;
    typeOf: TypeOf;
    get valid (): boolean;
    get optional (): B;
    validate: <I>(input: I) => input is I extends T ? I & T : never;
    parse: <I>(input: I) => I extends T ? I & T : never;
  }
  namespace Validator {
    let string: import("../src/resolvers/validators").Validator<string>;
    let number: import("../src/resolvers/validators").Validator<number>;
    let boolean: import("../src/resolvers/validators").Validator<boolean>;
    let bigint: import("../src/resolvers/validators").Validator<bigint>;
    let symbol: import("../src/resolvers/validators").Validator<symbol>;
    let object: import("../src/resolvers/validators").Validator<object>;
    let func: import("../src/resolvers/validators").Validator<Function>;
    let array: import("../src/resolvers/validators").Validator<FromPrimitive<TypeOf>>;
    let typeError: <TType extends TypeOf, I>(input: I, expected: TType) => never;
    let typeOf: <I, TType extends TypeOf> (input: I, type: TType = typeof input as TType) => input is I extends FromPrimitive<TType> ? I : never;

  }

  export type RequiredValidator<T> = import("../src/resolvers/validators").Validator<T, false>;
  export type OptionalValidator<T> = import("../src/resolvers/validators").Validator<T, true>;
  /**
   * Pulls the TypeScript type out of a import("../src/resolvers/validators").Validator<T>.
   */
  export type InferValidator<TValidator> = TValidator extends import("../src/resolvers/validators").Validator<infer TValue>
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
  export type ValidatorShape<T = any> = Record<string, import("../src/resolvers/validators").Validator<T>>;

  /**
   * Converts a validator object into its inferred object type.
   *
   * Example:
   * {
   *   userID: import("../src/resolvers/validators").Validator<number>,
   *   search: import("../src/resolvers/validators").Validator<string>
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


  export type CreateValidator = <T, B extends boolean = false>(validate: <I>(input: I) => input is I extends T ? I & T : never, options?: ValidatorOptions<B>) => import("../src/resolvers/validators").Validator<T, B>
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
   *   userID: import("../src/resolvers/validators").Validator<any>;
   *   postID: import("../src/resolvers/validators").Validator<any>;
   * }
   */
  export type PathParamsValidatorShape<TPath extends string> = [PathParamNames<TPath>] extends [never]
    ? {}
    : {
      [K in PathParamNames<TPath>]: import("../src/resolvers/validators").Validator<any>;
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
