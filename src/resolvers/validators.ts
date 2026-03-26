
/**
 * Creates a validator from a parse function.
 */
export const createValidator = <T>(parse: <I>(input: I) => I extends T ? I : never): Validator<T> => ({ parse });
export const genericValidator = <T extends TypeOf>(type: T): Validator<Primitive<T>> => ({ parse: (input) => isTypeOf(input, type) ? input : throwTypeError(input, type) });


function isTypeOf<V, T extends TypeOf>(value: V, type: T): value is V extends Primitive<T> ? V : never {
  if (type === "number") {
    if (typeof value === 'string' && value.trim() !== '') {
      return (Number.isFinite(Number(value)) && !Number.isNaN(Number(value)))
    }
    return typeof value === "number" && Number.isFinite(value) && !Number.isNaN(value);
  }
  if (type === "boolean") {
    return typeof value === 'boolean' || value === 1 || value === 0 || (typeof value === "string" && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false'));
  }
  return typeof value === type;
}
const throwTypeError = (actual: any, expected: TypeOf) => {
  throw new Error(`Input is not of expected type: \nExpected: ${expected}\nActual: ${actual}`);
};

/**
 * Basic string validator.
 */
export const stringValidator = genericValidator("string");

/**
 * Number validator.
 *
 * Handles numbers and numeric strings.
 */
export const numberValidator = genericValidator("number");

/**
 * Boolean validator.
 *
 * Handles booleans and "true"/"false" strings.
 */
export const booleanValidator = genericValidator("boolean");
export const optionalBooleanValidator = optional(booleanValidator);
/**
 * Optional validator wrapper.
 */
export const optional = <T>(validator: Validator<T>): Validator<T | undefined> =>
  createValidator<T | undefined>((input = undefined as typeof input) => (input === undefined ? undefined : validator.parse(input)) as typeof input extends T | undefined ? typeof input : never);
