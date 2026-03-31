type CoerceFail = { ok: false };
type CoerceOk<T> = { ok: true; value: T };
type CoerceResult<T extends ValueKind> = CoerceOk<ToPrimitive<T>> | CoerceFail;

interface Hexadecimal<N extends number | string = number> {
  get (): N extends number ? N : number;
  toString(): N extends number ? `${N}` : `${N}`;
  actual: N;
}
function testMultiple<T>(tester: (arg: T) => boolean, value: T, ...args: [...T[]]) {
  // Check if tester returns true for value and all args
  let index = 0;
  const allValues = [value, ...args];
  while (index < args.length) {}
}
interface Typer<T> {
  <T> (value: T): value is T extends ToPrimitive<"string"> ? T : never;
  value: T;
  getPrimitive(value: T): ToPrimitive<T>;
  isValid(value: T): value is T extends ToPrimitive<ValueKind> ? T : never;
}


type MaybeBlank<T extends string | number | bigint | boolean | null | undefined> = `${ T | "" }`;
type PreviousNumber<N extends number> = N extends 0 ? never : N extends 1 ? 0 : N extends 2 ? 1 : N extends 3 ? 2 : N extends 4 ? 3 : N extends 5 ? 4 : N extends 6 ? 5 : N extends 7 ? 6 : N extends 8 ? 7 : N extends 9 ? 8 : never;
type AndOr<T extends string> = T extends `${ infer Left }&&${ infer Right }` ? [AndOr<Left>, AndOr<Right>] : T extends `${ infer Left }||${ infer Right }` ? [AndOr<Left>, AndOr<Right>] : T;
function runCallbacks<T, CB extends ((<F>(input: F, index: number, array: F[], ...args: any) => any)[]),B extends boolean = false> (value: T, options: {
  typeOf?: ValueKind;
  isCoercion?: B = false as B;
  allAnd?: boolean = false;
}, ...callbacks: CB): void {

  for (const cb of callbacks) {
    if (options.isCoercion) {
      const coercionResult = TypeCoercion[ `${ options.typeOf ? Capitalize<Extract<ValueKind, string>> : "String" }Coercion` as keyof typeof TypeCoercion ](value);
    }
    cb();
  }
}



type StringValidator = <T>(value: T) => { (value: T): value is T extends ToPrimitive<"string"> ? T : never };
type NumberValidator = <T>(value: T) => value is T extends ToPrimitive<"number"> ? T : never;
type BooleanValidator = <T>(value: T) => value is T extends ToPrimitive<"boolean"> ? T : never;
type ArrayValidator = <T>(value: T) => value is T extends ToPrimitive<"array"> ? T : never;
type ObjectValidator = <T>(value: T) => value is T extends ToPrimitive<"object"> ? T : never;
type FunctionValidator = <T>(value: T) => value is T extends ToPrimitive<"function"> ? T : never;
type BigIntValidator = <T>(value: T) => value is T extends ToPrimitive<"bigint"> ? T : never;
type SymbolValidator = <T>(value: T) => value is T extends ToPrimitive<"symbol"> ? T : never;
type UndefinedValidator = <T> (value: T) => value is T extends ToPrimitive<"undefined"> ? T : never;
type NullValidator = <T>(value: T) => value is T extends ToPrimitive<"null"> ? T : never;

type CoerceString = <T>(value: T) => FromPrimitive<T>
type CoerceNumber = <T>(value: T) => CoerceResult<"number">;
type CoerceBoolean = <T>(value: T) => CoerceResult<"boolean">;
type CoerceArray = <T>(value: T) => CoerceResult<"array">;
type CoerceObject = <T>(value: T) => CoerceResult<"object">;
type CoerceFunction = <T>(value: T) => CoerceResult<"function">;
type CoerceBigInt = <T>(value: T) => CoerceResult<"bigint">;
type CoerceSymbol = <T>(value: T) => CoerceResult<"symbol">;
type CoerceUndefined = <T> (value: T) => CoerceResult<"undefined">;
type CoerceNull = <T>(value: T) => CoerceResult<"null">;
type ValidatorObject<T extends ValueKind> = {
  [K in T as `is${K extends "bigint" ? "BigInt" : Capitalize<K>}`]: (value: T) => value is T extends ToPrimitive<K> ? T : never
};
function capitalize<K extends ValueKind>(value: K): Capitalize<K> {
  return value.charAt(0).toUpperCase() + value.slice(1) as Capitalize<K>;
}
function isPrimitiveKey<K extends ValidatorName<ValueKind> | null = null> (type: K): type is K {
  const primitiveKeys = ["isString", "isNumber", "isBoolean", "isBigInt", "isSymbol", "isObject", "isFunction", "isUndefined", "isNull", "isArray"] as const;
  return type && primitiveKeys.includes(type);

}

export const primitiveValidators: PrimitiveValidatorMap = {
  isString<I> (this: Primitive<ToPrimitive<"string">>, value: I): value is I extends ToPrimitive<"string"> ? I : never { return typeof value === "string" && value !== ""; },
  isNumber<I> (this: Primitive<ToPrimitive<"number">>, value: I): value is I extends ToPrimitive<"number"> ? I : never {
    const testResult = parseNumericSmart(typeof value === "string" && value.trim().toLowerCase() || "");
    return (typeof value === "number" && Number.isFinite(value)) ||
      (testResult.ok && testResult.kind === "number");
  },
  isBoolean<I> (this: Primitive<ToPrimitive<"boolean">>, value: I): value is I extends ToPrimitive<"boolean"> ? I : never {
    if (typeof value === "boolean") return true;
    const str = typeof value === "string" && value.trim().toLowerCase() || null;
    if (str) return ["0", "1", "true", "false"].includes(str.replace(/^[-+]?(0|1)n$/i, "$1"));
    if (typeof value === "number" || typeof value === "bigint") return [0, 1].includes(Number(value));
    return false;
  },
  isArray<I> (this: Primitive<ToPrimitive<"array">>, value: I): value is I extends ToPrimitive<"array"> ? I : never {
    return Array.isArray(value) || (
      typeof value === "object" &&
      value !== null &&
      Object.keys(value).every((key, i) => key === String(i))
    );
  },
  isObject<I> (this: Primitive<ToPrimitive<"object">>, value: I): value is I extends ToPrimitive<"object"> ? I : never { return typeof value === "object" && value !== null && !Array.isArray(value); },
  isFunction<I> (this: Primitive<ToPrimitive<"function">>, value: I): value is I extends ToPrimitive<"function"> ? I : never { return typeof value === "function"; },
  isBigInt<I> (this: Primitive<ToPrimitive<"bigint">>, value: I): value is I extends ToPrimitive<"bigint"> ? I : never {
    if (typeof value === "bigint") return true;
    if (typeof value === "string" && typeof scientificToBigInt(value.trim().toLowerCase()) === "bigint") return true;
    return false;
  },
  isSymbol<I>(this: Primitive<ToPrimitive<"symbol">>, value: I): value is I extends ToPrimitive<"symbol"> ? I : never { return typeof value === "symbol"; },
  isUndefined<I>(this: Primitive<ToPrimitive<"undefined">>, value: I): value is I extends ToPrimitive<"undefined"> ? I : never { return value === "" || typeof value === "undefined"; },
  isNull<I>(this: Primitive<ToPrimitive<"null">>, value: I): value is I extends ToPrimitive<"null"> ? I : never { return value === null || value === "null"; }
};
Object.freeze(primitiveValidators);

function determineTypeOfValue<P extends TypeOf | PrimitiveArray, T extends NonNullValueKind> (value: P, desiredType?: T) {
  let returnValue: P extends ToPrimitive<T> ? P : P;
  let int, num, bool, str, sym, func, obj, arr;
  if (typeof value === "undefined") return undefined as P extends ToPrimitive<T> ? P : P;
  if (typeof value === "bigint") {
    int = value as P & bigint;
  }
  if (typeof value === "number") {
    num = value as P & number;
  }
  if (typeof value === "boolean") {
    bool = value as P & boolean;
  }
  if (typeof value === "string") {
    const str = value.trim().toLowerCase();
    const bool = ["0", "1", "true", "false"].includes(str.replace(/^[-+]?(0|1)n$/i, "$1"));
    const num = Number(str.replace(/^[-+]?(0|1)n$/i, "$1"));
  }
  if (typeof value === "symbol") {
    sym = value as P & symbol;
  }
  if (typeof value === "function") {
    func = value as P & Function;
  }
  if (typeof value === "object") {
    if (value === null) {
      obj = value as P & null;
    } else {
      if (Array.isArray(value)) {
        arr = [...value] as P & Array<P[keyof P]>;
      }
      if (value.hasOwnProperty("length") && Object.keys(value).every((key, i) => key === String(i))) {
        arr = Array.from(value as ArrayLike<P[keyof P]>) as P & P[keyof P][];
      }
      obj = value as P & object;
    }
  }
  let validator = {} as PrimitiveValidator<T>;
  if (desiredType) {
    const validatorKey = (`is${ desiredType === "bigint" ? "BigInt" : capitalize(desiredType) }`) as ValidatorName<T>;
    validator = primitiveValidators[validatorKey] as PrimitiveValidator<T>;
  }
}

var Primitive: PrimitiveConstructor;
var Primitive: PrimitiveConstructor;
var Primitive: PrimitiveConstructor = function <T extends NonNullValueKind, V extends NonNullPrimitive> (type: T, input?: V): V extends unknown ? Primitive<ToPrimitive<T>> : Primitive<V, T> {

  const primitive  = function <V extends NonNullPrimitive> (this: Primitive<V, T>, input: V): V {
    const primitiveKey = (`is${ type === "bigint" ? "BigInt" : capitalize(type) }`) as ValidatorName<typeof type>;
    const isValid = primitiveValidators[primitiveKey] as PrimitiveValidator<T>;

    this.input = input as V extends ToPrimitive<T> ? V : never;
    this.isValid = isValid.bind(this) as Primitive<V, T>["isValid"];
    return this.input;
  }
  primitive.type = type;
  primitive.input = input;

  const primitiveKey = (`is${ type === "bigint" ? "BigInt" : capitalize(type) }`) as ValidatorName<typeof type>;
  const primitiveGuard =  primitiveValidators[primitiveKey] as PrimitiveValidatorMap[ValidatorName<typeof type>];

  var Primitive = primitive as Primitive<T, Exclude<V, unknown>>;
  if (input !== undefined && primitiveGuard(input)) {
    return primitive as V extends unknown ? Primitive<ToPrimitive<T>> : never;
  }
  return primitive as V extends unknown ? never : Primitive<V, T>;
};

function isInvalid<T>(
  value: T,
  ...validators: Array<<V>(input: V | T) => input is Exclude<V, T>>
): value is T {
  for (const validator of validators) {
    if (!validator(value)) {
      // At least one validator failed: this is the "invalid" case
      return true;
    }
  }
  // All validators passed: not invalid
  return false;
}

type StringEscapable = string | number | bigint | boolean | null | undefined;

function coerceToNumber(value: string | number): CoerceResult<"number"> {
  const num = Number(value);
  return Number.isFinite(num) && !Number.isNaN(num) ? { ok: true, value: num } as const : { ok: false };
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);
const INT_REGEX = /^(?<value>[-+]?\d+(?:[eE][+-]?\d+)?)n?$/;
const BIGINT_REGEX = /^(?<value>[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$/;
const THRESHOLD = Number.MAX_SAFE_INTEGER * 0.9;

function toSafeNumeric(value: number): number | bigint {
  if (Math.abs(value) >= THRESHOLD) {
    return BigInt(value);
  }
  return value;
}

function scientificToBigInt(str: string): bigint | null {
  const m = str.match(/^(?<sign>[+-]?)(?<int>\d+)(?:\.(?<frac>\d+))?(?:e(?<exp>[+-]?\d+))?$/);
  if (m?.groups) {

    const sign = m.groups.sign === "-" ? -1n : 1n;
    const int = m.groups.int ?? "";
    const frac = m.groups.frac ?? "";
    const exp = Number(m.groups.exp ?? "0");

    const digits = (int + frac).replace(/^0+/, "") || "0";
    const fracLen = frac.length;
    const scale = exp - fracLen;

    if (scale >= 0) return sign * BigInt(digits + "0".repeat(scale));

    // Need exact integer after shifting right
    const divisor = 10n ** BigInt(-scale);
    const n = BigInt(digits);

    if (n % divisor !== 0n) return null; // would be fractional, can't be bigint
    return sign * (n / divisor);
  }
  return null;
}

type NumericResult =
  | Readonly<{ ok: true; kind: "number"; value: number; normalized: string }>
  | Readonly<{ ok: true; kind: "bigint"; value: bigint; normalized: string }>
  | Readonly<{ ok: false; }>;

/**
 * Main parser:
 * string → number (if safe) → bigint (fallback)
 */
export function parseNumericSmart(str: string): NumericResult {
  const s = str.trim();

  // Step 1: Validate numeric shape
  const numMatch = s.match(BIGINT_REGEX);
  if (!numMatch?.groups?.value) {
    return { ok: false };
  }

  const valueStr = numMatch.groups.value;

  // Step 2: Try Number
  const n = Number(valueStr);

  // Reject NaN / Infinity early
  if (!Number.isFinite(n)) {
    // only allow bigint fallback if it LOOKS like integer
    const b = scientificToBigInt(valueStr);
    if (b !== null) {
      return {
        get ok() { return true as const },
        get kind() { return "bigint" as const },
        get value() { return b },
        get normalized () { return b.toString(); },
      };
    }

    return { ok: false };
  }

  // Step 3: Check safe integer bounds
  if (Number.isSafeInteger(n)) {
    return {
      get ok() { return true as const },
      get kind() { return "number" as const },
      get value() { return n },
      get normalized() { return String(n) },
    };
  }

  // Step 4: Fallback to BigInt if possible
  const b = scientificToBigInt(valueStr);
  if (b !== null) {
    return {
      get ok() { return true as const },
      get kind() { return "bigint" as const },
      get value() { return b },
      get normalized() { return b.toString() },
    };
  }

  return { ok: false };
}

/**
 * Direct BigInt coercion (strict integer only)
 */
export function toBigIntStrict(raw: string): bigint | null {
  const s = raw.trim();

  const match = s.match(BIGINT_REGEX);
  if (!match?.groups?.value) return null;

  try {
    return BigInt(match.groups.value);
  } catch {
    return null;
  }
}

function getAssertedType<T> (value: T) {


  let int: bigint | number | null = null;
  let trimmed: string | null = null;
  let str: string | null = null;
  let intResult: NumericResult | null = null;
  let bool: boolean | null = null;
  let arr: unknown[] | null = null;
  let obj: object | ArrayLike<unknown> | null = null;
  switch (typeof value) {
    case "string":
      trimmed = value.trim();
      str = trimmed === "NaN" ? "NaN" : trimmed.toLowerCase();
      intResult = parseNumericSmart(str);
      if (intResult.ok) {
        return intResult.value;
      }
      break;
    case "number":
      if (Number.isFinite(value) && !Number.isNaN(value)) {
        int = value;
        return int;
      }
  }
}


type Pair<T> = [key: T, value: T];

type RepeatingPairs<T> = [
  ...first: Pair<T>,
  ...rest: T[]
];
const results = (val: boolean) => val ? { ok: true, value: val } as const : yield new Error("Value is not a boolean") as CoerceFail;
class TypeCoercion<T> {
  static isString: StringValidator = (value): value is string extends ToPrimitive<"string"> ? typeof value : never => {
    const tc = TypeCoercion;
    if (tc.multiValidator(value, (v): v is Exclude<typeof v, typeof value> => typeof value === "string"))
      const boolResult = tc.multiValidator(value, (v): v is typeof v extends Exclude<typeof v, typeof value> ? typeof v : never => typeof value === "string");
    if (!tc.multiValidator<typeof value>(value, <I> (v: I | typeof value): v is Exclude<typeof v, typeof value> => typeof value === "string")) {
        return true;
      } {
    }
    return typeof value === "string";
  };

  static isNumber= <T> (value: T): value is T extends ToPrimitive<"number"> ? T : never => isFinite(Number(value)) && !isNaN(Number(value));
  static isBoolean= <T>(value: T): value is T extends ToPrimitive<"boolean"> ? T : never => [0, false, "", null, undefined, -0, 0n, NaN].includes(Boolean(value)) || typeof value === "boolean";
  static isArray= <T> (value: T): value is T extends ToPrimitive<"array"> ? T : never => {
    if (Array.isArray(value)) {
      return true;
    }
    return false;
  }
  static equalsAny = <T>(value: T, ...comparisons: T[]) => comparisons.includes(value);
  static keyIsValue = <T extends any>(...keyValues: RepeatingPairs<T>) => Object.entries(keyValues).some(([key, val]) => key === val);
  static isObject= <T>(value: T): value is T extends ToPrimitive<"object"> ? T : never => typeof value === "object" && value !== null;
  static isFunction= <T>(value: T): value is T extends ToPrimitive<"function"> ? T : never => typeof value === "function";
  static isBigInt= <T>(value: T): value is T extends ToPrimitive<"bigint"> ? T : never => typeof value === "bigint";
  static isSymbol= <T>(value: T): value is T extends ToPrimitive<"symbol"> ? T : never => typeof value === "symbol";
  static isUndefined= <T> (value: T): value is T extends ToPrimitive<"undefined"> ? T : never => typeof value === "undefined";
  static isNull= <T> (value: T): value is T extends ToPrimitive<"null"> ? T : never => value === null || value === "null";


  static stringCoercion = <T>(value: T) => typeof value === "string" ? "string" : false;
  static numberCoercion = <T>(value: T) => isFinite(Number(value)) && !isNaN(Number(value)) ? "number" : false;
  static booleanCoercion = <T>(value: T) => [0, false, "", null, undefined, -0, 0n, NaN].includes(Boolean(value)) || typeof value === "boolean" ? "boolean" : false;
  static arrayCoercion = <T>(value: T) => Array.isArray(value) ? "array" : false;
  static objectCoercion = <T>(value: T) => typeof value === "object" && value !== null ? "object" : false;
  static functionCoercion = <T>(value: T) => typeof value === "function" ? "function" : false;
  static bigintCoercion = <T>(value: T) => typeof value === "bigint" ? "bigint" : false;
  static symbolCoercion = <T>(value: T) => typeof value === "symbol" ? "symbol" : false;
  static undefinedCoercion = <T> (value: T) => typeof value === "undefined" ? "undefined" : false;
  static nullCoercion = <T> (value: T) => value === null || value === "null" ? "null" : false;

  static isBigIntCandidate (str: string): boolean {
    TypeCoercion.keyIsValue(str, "", str, str, str, "") && !str.endsWith("n");
    const trimmed = str.trim();
    // Only digits, optional sign, no decimal, no 'n'
    if (/^[-+]?\d+$/.test(trimmed)) {
      // 16+ digits is always unsafe for JS Number
      return trimmed.replace(/^[-+]/, '').length >= 16;
    }
    return false;
  }

  static isBigIntLiteral(value: string | bigint): boolean {
    if (typeof value === "bigint") return true;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return /^[-+]?\d+n$/.test(trimmed) || this.isBigIntCandidate(trimmed);
    }
    return false;
  }
  static cleanString (value: string) {
    const trimmed = value.trim();
    return trimmed === "NaN" ? trimmed as "NaN" : trimmed.endsWith("n") ? trimmed.slice(0, -1) : trimmed;
  }
  static isHexString(value: string): boolean {
    const hexRegex = /^0x[0-9a-f]+n?$/i;
    return hexRegex.test(value.trim());
  }
  static isNumericString (value: string): boolean {
    const jsNumberRegex = /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?n?$/;
    const trimmed = value.trim();
    const hex = 0x9909ce0n;
    return jsNumberRegex.test(trimmed) && TypeCoercion.isBigIntCandidate(trimmed);
    if (TypeCoercion.isBigIntCandidate(trimmed))
    return trimmed !== "" && !isNaN(Number(trimmed));
  }
  static isBlank = (value: string) => TypeCoercion.equalsAny(value, "", "null", "undefined");

  static multiValidator = isInvalid.bind(TypeCoercion);
  static readonly falsyStrings = ["", "null", "undefined", "NaN", "0", "0n", "-0", "-0n", "false", "nan", "-"];
  static isFalsyString (value: string): boolean {
    const falsyStrings = ["", "null", "undefined", "NaN", "0", "0n", "-0", "-0n", "false", "nan", "-"];
    return value.startsWith("")
  }

  static coerceByType = <T extends ValueKind> (input: unknown, type: T): CoerceResult<T> => {
    switch (type) {
      case "string": {
        if (typeof input === "string") return { ok: true, value: input as ToPrimitive<T> };
        return { ok: false };
      }

      case "number": {
        if (typeof input === "number" && Number.isFinite(input)) {
          return { ok: true, value: input as ToPrimitive<T> };
        }
        if (typeof input === "string" && input.trim() !== "") {
          const n = Number(input);
          if (Number.isFinite(n)) return { ok: true, value: n as ToPrimitive<T> };
        }
        return { ok: false };
      }

      case "boolean": {
        const value = String(input).trim();
        const val = value.toLowerCase();
        const str = val.split("")[-1] === "n" ? val.slice(0, -1) : val;
        const int = val.endsWith("n") ? BigInt(str) : Number(str);

        const falsey = str === "" || val === "null" || val === "undefined" || value === "NaN" || int === 0 || val === "0n" || val === "-0" || val === "-0n" || val === "false" || (typeof input === "boolean" && input === false);
        const truthy = val === "true" || val === "1" || val === "1n" || val === "-1" || (val !== "" && val !== "0" && val !== "0n" && val !== "-0n" && val !== "false" && val !== "null" && val !== "null" && val !== "undefined" && value !== "NaN" && val !== "nan" && ) || (typeof input === "boolean" && input === true);
        if (typeof input === "boolean") return { ok: true, value: input as ToPrimitive<T> };
        if (value === "1") return { ok: true, value: true as ToPrimitive<T> };
        if (value === "0") return { ok: true, value: false as ToPrimitive<T> };
        if (value === "0n") return { ok: true, value: false as ToPrimitive<T> };
        if (value === "null") return { ok: true, value: false as ToPrimitive<T> };
        if (value === "undefined") return { ok: true, value: false as ToPrimitive<T> };
        if (value === "") return { ok: true, value: false as ToPrimitive<T> };
        if (value === "NaN") return { ok: true, value: false as ToPrimitive<T> };
        if (val === "true") return { ok: true, value: true as ToPrimitive<T> };
        if (val === "false") return { ok: true, value: false as ToPrimitive<T> };
        return { ok: false };
      }

      case "bigint": {
        if (typeof input === "bigint") return { ok: true, value: input as ToPrimitive<T> };
        if (typeof input === "number" && Number.isInteger(input)) {
          return { ok: true, value: BigInt(input) as ToPrimitive<T> };
        }
        if (typeof input === "string") {
          const s = input.trim().toLowerCase();
          if (/^-?\d+n?$/.test(s)) {
            const normalized = s.endsWith("n") ? s.slice(0, -1) : s;
            return { ok: true, value: BigInt(normalized) as ToPrimitive<T> };
          }
        }
        return { ok: false };
      }

      case "symbol": {
        return typeof input === "symbol"
          ? { ok: true, value: input as ToPrimitive<T> }
          : { ok: false };
      }

      case "function": {
        return typeof input === "function"
          ? { ok: true, value: input as ToPrimitive<T> }
          : { ok: false };
      }

      case "array": {
        if (Array.isArray(input)) return { ok: true, value: input as ToPrimitive<T> };
        if (typeof input === "string") {
          try {
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed)) return { ok: true, value: parsed as ToPrimitive<T> };
          } catch { }
        }
        return { ok: false };
      }

      case "object": {
        if (typeof input === "object" && input !== null && !Array.isArray(input)) {
          return { ok: true, value: input as ToPrimitive<T> };
        }
        if (typeof input === "string") {
          try {
            const parsed = JSON.parse(input);
            if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
              return { ok: true, value: parsed as ToPrimitive<T> };
            }
          } catch { }
        }
        return { ok: false };
      }

      case "undefined": {
        if (input === undefined || input === "undefined") {
          return { ok: true, value: undefined as ToPrimitive<T> };
        }
        return { ok: false };
      }

      default:
        return { ok: false };
    }
  };
}
