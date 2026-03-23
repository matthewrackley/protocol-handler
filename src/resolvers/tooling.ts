import { CreatedTypes, FieldDefinition, HttpStructure, InferHttpRoutes, RegExpMatchPathArray, TypeFromLiteral } from '../types';

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isField(value: unknown): value is FieldDefinition<unknown> {
  return isObjectRecord(value) && value.__kind === "field";
}

export function resolveValue<T>(value: T): TypeFromLiteral<T> {
  if (isField(value)) {
    if (value.create) {
      return value.create() as TypeFromLiteral<T>;
    }

    return (value.default ?? null) as TypeFromLiteral<T>;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item)) as TypeFromLiteral<T>;
  }

  if (isObjectRecord(value)) {
    const result: Record<string, unknown> = {};

    for (const key in value) {
      result[key] = resolveValue(value[key]);
    }

    return result as TypeFromLiteral<T>;
  }

  return value as TypeFromLiteral<T>;
}
export const define = {
  field<T>(config?: {
    default?: T;
    create?: () => T;
  }): FieldDefinition<T> {
    return {
      __kind: "field",
      default: config?.default,
      create: config?.create,
    };
  },

  value<T>(create: () => T): FieldDefinition<T> {
    return this.field<T>({ create });
  },

  bigint (initial: undefined | bigint = undefined ):FieldDefinition<undefined | bigint>  {
    return this.field<bigint>({ default: initial });
  },

  symbol (description: string): FieldDefinition<symbol> {
    return this.field<symbol>({ default: Symbol(description) });
  },

  object(initial: undefined | object = undefined ):FieldDefinition<undefined | object>  {
    return this.field<object>({ default: initial});
  },

  function<T extends (...args: any[]) => any> (initial?: T): FieldDefinition<T> {
    return this.field<T>({ default: initial});
  },

  array<T extends any[]> (...initials: T): FieldDefinition<T> {
    return this.field<T>({ default: initials });
  },

  string (initial: undefined | string = undefined ):FieldDefinition<undefined | string>  {

    return this.field<string>({ default: initial});
  },

  number(initial: undefined | number = undefined ):FieldDefinition<undefined | number>  {
    return this.field<number>({ default: initial});
  },

  boolean(initial: undefined | boolean = undefined ):FieldDefinition<undefined | boolean>  {
    return this.field<boolean>({ default: initial});
  },
};

export function createWsTypes<S extends Record<string, any>>(structure: S): CreatedTypes<S> {
  const result = {} as CreatedTypes<S>;

  for (const key in structure) {
    const value = structure[key];
    result[key] = (value === null ? null : resolveValue(value)) as CreatedTypes<S>[typeof key];
  }

  return result;
}

export function createHttpTypes<T extends HttpStructure>(structure: T): InferHttpRoutes<T> {
  const result = {} as InferHttpRoutes<T>;

  for (const key in structure) {
    const route = structure[key];

    result[key] = {
      method: route.method,
      path: route.path,
      request: {
        params: route.request.params === null ? null : resolveValue(route.request.params),
        query: route.request.query === null ? null : resolveValue(route.request.query),
        body: route.request.body === null ? null : resolveValue(route.request.body),
      },
      response: route.response === null ? null : resolveValue(route.response),
    } as InferHttpRoutes<T>[typeof key];
  }

  return result;
}

export function matchPath (value: string) {
  const pathRegex = /^(?<path>\/[a-z0-9_-]+)(?:\/:(?<param>[a-z0-9_-]+))?$/i;
  const match = value.match(pathRegex) as RegExpMatchPathArray | null;
  if (match) {
    let param: boolean | undefined = undefined;
    Object.defineProperty(match, 'hasParam', {
      value: match.groups?.param != null,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    return match;
  } else {
    return null;
  }
}
