import { matchPath } from './tooling';
import { stringValidator } from './validators';

/**
 * Validates an object using a validator shape.
 *
 * Example:
 * shape = { userID: numberValidator }
 * input = { userID: "42" }
 * output = { userID: 42 }
 */
const validateShape = <TValidator, TShape extends ValidatorShape<TValidator>>(
  input: TValidator,
  shape: TShape
): { [K in keyof TShape]: ReturnType<TShape[K]['parse']> } => {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Expected an object');
  }

  const source = input as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const key of Object.keys(shape)) {
    const validator = shape[key];
    output[key] = validator.parse(source[key]);
  }

  return output as { [K in keyof TShape]: ReturnType<TShape[K]['parse']> };
};

/**
 * Builds the typed request object using the route's validator configuration.
 */
const buildTypedRequest = <
  TMethod extends string,
  TPath extends string,
  TParamsShape extends PathParamsValidatorShape<TPath>,
  TQueryShape extends ValidatorShape<unknown> | undefined,
  TBodyShape extends ValidatorShape<unknown> | undefined,
  TContext,
  TResponseBody,
>(
  req: any,
  route: RouteDefinition<
    TMethod & any,
    TPath,
    TParamsShape,
    TQueryShape,
    TBodyShape,
    TContext,
    TResponseBody
  >
): TypedRequest<TPath, TParamsShape, TQueryShape, TBodyShape> => {
  const paramsShape = route.request?.params;
  const queryShape = route.request?.query;
  const bodyShape = route.request?.body;

  const typedReq = Object.assign({}, req, {
    params: paramsShape ? validateShape(req.params ?? {}, paramsShape) : (req.params ?? {}),
    query: queryShape ? validateShape(req.query ?? {}, queryShape) : (req.query ?? {}),
    body: bodyShape ? validateShape(req.body ?? {}, bodyShape) : (req.body ?? {}),
  });

  return typedReq as TypedRequest<TPath, TParamsShape, TQueryShape, TBodyShape>;
};

/**
 * Sends the structured handler result to Express response.
 */
const sendHandlerResult = <TResponseBody = unknown>(res: any, result: TypedResponse<TResponseBody> | void): void => {
  if (res.headersSent || result === undefined) {
    return;
  }

  if (result.headers) {
    for (const [headerName, headerValue] of Object.entries(result.headers)) {
      res.setHeader(headerName, headerValue);
    }
  }

  const status = result.status ?? 200;
  const body = result.body ?? null;

  res.status(status).json(body);
};


/**
 * Builds one route into an Express-compatible controller.
 */
export const buildRoute = <
  TMethod extends HttpMethod,
  TPath extends string,
  TParamsShape extends PathParamsValidatorShape<TPath> = PathParamsValidatorShape<TPath>,
  TQueryShape extends ValidatorShape | undefined = undefined,
  TBodyShape extends ValidatorShape | undefined = undefined,
  TContext = undefined,
  TResponseBody = unknown,
>(
  route: RouteDefinition<
    TMethod,
    TPath,
    TParamsShape,
    TQueryShape,
    TBodyShape,
    TContext,
    TResponseBody
  >
): BuiltRoute<TMethod, TPath, TParamsShape, TQueryShape, TBodyShape, TContext, TResponseBody> => {
  const controller = async (req: TypedRequest<TPath, TParamsShape, TQueryShape, TBodyShape>, res: TypedResponse<TResponseBody>, next: import("express").NextFunction): Promise<void> => {
    try {
      const typedReq = buildTypedRequest(req, route);

      const ctx = route.handlers.context
        ? await route.handlers.context(typedReq)
        : (undefined as TContext);

      const result = await route.handlers.callback(typedReq, res, ctx);

      sendHandlerResult(res, result);
    } catch (error) {
      next(error);
    }
  };

  return {
    method: route.method,
    path: route.path,
    controller,
  };
};

// /**
//  * Builds many routes at once from an object map.
//  */
// export const buildRoutes = <TRoutes extends RouteMap>(
//   routes: TRoutes
// ): BuiltRouteMap<TRoutes> => {
//   const output = {} as BuiltRouteMap<TRoutes>;

//   for (const key in routes) {
//     const route = routes[key];
//     output[key] = buildRoute(route) as BuiltRouteMap<TRoutes>[typeof key];
//   }

//   return output;
// };

/**
 * Registers one built route on an Express app.
 */
export const registerRoute = (
  app: ExpressLike,
  route: BuiltRoute
): void => {
  app[route.method](route.path, route.controller as typeof route.controller extends import("express").RequestHandler<infer P, infer Res, infer Q, infer B> ? typeof route.controller : never);
};

/**
 * Registers many built routes on an Express app.
 */
export const registerRoutes = (
  app: ExpressLike,
  routes: Record<string, BuiltRoute>
): void => {
  for (const key in routes) {
    registerRoute(app, routes[key]);
  }
};

/**
 * Identity helper for defining a single route with strong inference.
 */
const defineRoute = <
  TMethod extends HttpMethod,
  TPath extends string,
  TParamsShape extends PathParamsValidatorShape<TPath> = PathParamsValidatorShape<TPath>,
  TQueryShape extends ValidatorShape | undefined = undefined,
  TBodyShape extends ValidatorShape | undefined = undefined,
  TContext = undefined,
  TResponseBody = unknown,
>(
  route: RouteDefinition<
    TMethod,
    TPath,
    TParamsShape,
    TQueryShape,
    TBodyShape,
    TContext,
    TResponseBody
  >
) => route;

const definer = <TMethod extends HttpMethod,
  TPath extends string,
  TParamsShape extends PathParamsValidatorShape<TPath> = PathParamsValidatorShape<TPath>,
  TQueryShape extends ValidatorShape | undefined = undefined,
  TBodyShape extends ValidatorShape | undefined = undefined,
  TContext = undefined,
  TResponseBody = unknown,
  > (method: TMethod, path: TPath, options: {} = () => {
    const request = {} as RouteRequestDefinition<TPath, TParamsShape, TQueryShape, TBodyShape>;
    const matches = matchPath(path);
    for (let i = 0; i < matches.length; i++) {
      if (matches[i].hasParam) {
        request.params = {
          ...request.params,
          [matches[i].groups.param!]: stringValidator,
        } as TParamsShape;
      }
    }
    request.query = undefined;
    request.body = undefined;

    return request;
  }) => ({});

/**
 * Identity helper for defining multiple routes at once with strong inference.
 */
const defineRoutes = <O extends Record<string, RouteDefinition<HttpMethod, string, PathParamsValidatorShape<string>, ValidatorShape | undefined, ValidatorShape | undefined, any, unknown>>
>(
  routes: O
) => routes;


const getUser = defineRoute({
  method: 'get',
  path: '/users/:userID',
  request: {
    params: {
      userID: stringValidator,
    },
  },
  handlers: {
    context: async (req) => {
      // ... fetch user from DB logic ...
      return { userRole: 'admin' }; // inferred as { userRole: string }
    }
    callback: async (req, res, ctx) => {
      const userID = req.params.userID; // inferred as string
      // ... fetch user logic ...
      res.status(200)
    },
  },
});
