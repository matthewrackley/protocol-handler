
const defaultOptions = <B extends boolean>() => ({
  initialInput: undefined,
  optional: false as B,
  typeOf: "undefined" as TypeOf
}) as ValidatorOptions<B>;
/**
 * Validator class and related utilities for validating and parsing input data in resolvers.
 *
 * This module defines a flexible Validator class that can be used to create custom validators for various types of input. It includes built-in validators for strings, numbers, and booleans, as well as utilities for handling optional values and type conversion.
 *
 * The Validator class provides methods for validating input data and parsing it into the expected type. It also tracks whether the validation was successful and whether the validator is optional.
 *
 * The module exports the Validator class, a createValidator function for convenience, and some basic validators for common types.
 * @class Validator
 * @template T - The type that the validator will validate against.
 * @template B - A boolean indicating whether the validator is optional (true) or required (false).  Defaults to false.
 * @implements {ValidateType<T, B>}
 */
export class Validator<T, B extends boolean = false> implements ValidateType<T, B> {
  /**
   * The validated input after parsing.  This will be of type T if validation succeeded, or undefined if validation failed and the validator is optional.  If the validator is required and validation fails, an error will be thrown instead.
   * @type {B extends true ? T | undefined : T}
   */
  validatedInput!: B extends true ? T | undefined : T;
  /**
   * The type of the validated input, as a string.  This is used for error messages and can be set manually or inferred from the input during validation.
   * @type {TypeOf}
   */
  typeOf: TypeOf;

  #valid: boolean = false;
  #optional: B;

  /**
   * Indicates whether the last validation attempt was successful.  This is a getter that returns the internal #valid property, which is set during validation.
   * @readonly
   * @type {boolean}
   */
  get valid (): boolean {
    return this.#valid;
  }

  /**
   * Indicates whether this validator is optional.  This is a getter that returns the internal #optional property, which is set during construction and can be modified using the setOptional and setRequired methods.
   * @readonly
   * @type {B}
   */
  get optional (): B {
    return this.#optional;
  }

  static string: Validator<string> = genericValidator("string");
  static number: Validator<number> = genericValidator("number");
  static boolean: Validator<boolean> = genericValidator("boolean");
  static bigint: Validator<bigint> = genericValidator("bigint");
  static symbol: Validator<symbol> = genericValidator("symbol");
  static object: Validator<object> = genericValidator("object");
  static func: Validator<Function> = genericValidator("function");
  static array: Validator<Primitive<TypeOf>> = genericValidator("array");
  /**
   * Static helper method to throw a standardized type error when validation fails.  This method is used internally by the parse method to provide consistent error messages when input does not match the expected type.
   * @template TType - The expected type of the input, as a string literal type (e.g., "string", "number").
   * @template I - The actual type of the input that failed validation.
   * @param {I} input - The input value that failed validation.
   * @param {TType} expected - The expected type of the input, used for error messaging.
   * @returns {never} This function always throws an error and never returns a value.
   * @throws {Error} Throws an error with a message indicating the expected and actual types of the input.
   */
  static typeError: <TType extends TypeOf, I>(input: I, expected: TType) => never = (input, expected) => {
    throw new Error(`Input is not of expected type: \nExpected: ${ expected }\nActual: ${ input }`);
  };

  /**
   * Static helper method to check if a given input is of a specified type.  This method is used by the generic validators to determine if the input matches the expected type, and it includes special handling for numbers and booleans to allow for common string representations of these types.
   * @template I - The type of the input to check.
   * @template TType - The expected type of the input, as a string literal type (e.g., "string", "number").
   * @param {I} input - The input value to check.
   * @param {TType} [type=typeof input as TType] - The expected type of the input.  If not provided, it will be inferred from the input using typeof.
   * @returns {input is I extends Primitive<TType> ? I : never} Returns true if the input is of the expected type, false otherwise.  The return type is a type predicate that narrows the type of the input if validation succeeds.
   */
  static isTypeOf<I, TType extends TypeOf> (input: I, type: TType = typeof input as TType): input is I extends Primitive<TType> ? I : never {
    if (type === "number") {
      if (typeof input === 'string' && input.trim() !== '') {
        return (Number.isFinite(Number(input)) && !Number.isNaN(Number(input)))
      }
      return typeof input === "number" && Number.isFinite(input) && !Number.isNaN(input);
    }
    if (type === "boolean") {
      return typeof input === 'boolean' || input === 1 || input === 0 || (typeof input === "string" && (input.toLowerCase() === 'true' || input.toLowerCase() === 'false'));
    }
    return typeof input === type;
  }


  /**
   * Sets this validator to be optional.  If the validator is already optional, this method has no effect.  If the validator is required, this method returns a new Validator instance that is identical to this one but with the optional flag set to true.  The validatedInput type will be updated to allow undefined if the validator becomes optional.
   * @returns {B extends true ? this : Validator<T, true>}
   */
  setOptional (): B extends true ? this : Validator<T, true> {
    const validator = new Validator(this.validate, { initialInput: this.validatedInput, optional: true, typeOf: typeof this.validatedInput });
    return (this.optional ? this : validator) as B extends true ? this : Validator<T, true>;
  }


  /**
   * Sets this validator to be required.  If the validator is already required, this method has no effect.  If the validator is optional, this method returns a new Validator instance that is identical to this one but with the optional flag set to false.  The validatedInput type will be updated to disallow undefined if the validator becomes required.
   * @returns {B extends true ?  Validator<T, false> : this}
   */
  setRequired(): B extends true ?  Validator<T, false> : this {
    const validator = new Validator(this.validate, { initialInput: this.validatedInput, optional: false, typeOf: typeof this.validatedInput });
    return (this.optional ? validator : this) as B extends true ?  Validator<T, false> : this;
  }

  /**
   * Validates the given input using the validator's validation function.  If validation succeeds, the validatedInput property is set to the input value (cast to type T) and the method returns true.  If validation fails and the validator is optional, the validatedInput property is set to undefined and the method returns false.  If validation fails and the validator is required, an error is thrown.  The typeOf property is also updated to reflect the type of the input during validation, which can be used for error messages.
   * @template I - The type of the input to validate.
   * @param {I} input - The input value to validate.
   * @returns {input is I extends T ? I & T : never} Returns true if validation succeeded, false if validation failed and the validator is optional.  If validation fails and the validator is required, an error is thrown.  The return type is a type predicate that narrows the type of the input if validation succeeds.
   * @throws {Error} Throws an error if validation fails and the validator is required.
   */
  validate: <I>(input: I) => input is I extends T ? I & T : never;


  /**
   * Parses the given input using the validator's validation function.  This method is similar to validate, but instead of returning a boolean, it returns the validated input if validation succeeds, or throws an error if validation fails and the validator is required.  If validation fails and the validator is optional, it returns undefined.  The typeOf property is also updated to reflect the type of the input during validation, which can be used for error messages.
   * @template I - The type of the input to parse.
   * @param {I} input - The input value to parse.
   * @returns {I extends T ? I & T : never} Returns the validated input if validation succeeded, or undefined if validation failed and the validator is optional.  If validation fails and the validator is required, an error is thrown.  The return type is a conditional type that narrows the type of the input if validation succeeds.
   * @throws {Error} Throws an error if validation fails and the validator is required.

   */
  parse: <I>(input: I) => I extends T ? I & T : never = (input) => {
    const ok = this.validate(input);
    this.#valid = ok;
    this.validatedInput = (ok ? (input as T) : undefined) as this['validatedInput'];
    return (ok ? input : Validator.typeError(input, this.typeOf)) as typeof input extends T ? typeof input & T : never;
  };

  /**
   * Creates a new Validator instance with the given validation function and options.  The validate parameter is a function that takes an input value and returns a boolean indicating whether the input is valid according to the validator's rules.  The options parameter can include an initialInput to validate immediately, an optional flag to indicate whether the validator should be optional, and a typeOf string for error messaging.  If initialInput is provided, it will be validated immediately, and if validation fails and the validator is required, an error will be thrown.
   */
  constructor (validate: <I>(input: I) => input is I extends T ? I & T : never, private options: ValidatorOptions<B> = defaultOptions<B>()) {
    /** {@link Validator.initialInput initialInput-default} */
    const initialInput = this.options.initialInput;
    this.#optional = this.options.optional ?? false as B;
    this.typeOf = this.options.typeOf ?? "undefined";
    this.validate = (input) => {
      const ok = validate(input);
      this.#valid = ok;
      this.validatedInput = (ok ? (input as T) : undefined) as this['validatedInput'];
      this.typeOf ??= typeof input;
      return ok;
    };

    if (initialInput !== undefined) {
      return this.validate(initialInput) ? this : Validator.typeError(initialInput, this.typeOf);
    }
    this.validate(undefined);
  }
}

/**
 * Factory function to create a new Validator instance.  This is a convenience function that allows you to create a Validator without using the new keyword directly.  It takes the same parameters as the Validator constructor and returns a new Validator instance.
 * @type CreateValidator
 * @template T - The type that the validator will validate against.
 * @template {boolean} B - A boolean indicating whether the validator should be optional (true) or required (false).  Defaults to false.
 * @param {<I>(input: I) => input is I extends T ? I & T : never} validate  - A validation function that takes an input value and returns a boolean indicating whether the input is valid according to the validator's rules.  The function should be a type predicate that narrows the type of the input if validation succeeds.
 * @param {ValidatorOptions<B>} [options={}] An optional object containing additional options for the validator.  This can include:
 * - `initialInput`: An initial input value to validate immediately upon creation of the validator.  {@linkcode Validator.options ValidatorOptions<B>.initialInput}:`defaults to undefined.`
 * - `optional`: A boolean indicating whether the validator should be optional (true) or required (false).  {@linkcode Validator.options ValidatorOptions<B>.optional}:`defaults to false.`
 * - `typeOf`: A string representing the expected type of the input for error messaging purposes.  {@linkcode Validator.options ValidatorOptions<B>.typeOf}:`defaults to "undefined".`
 * @returns {Validator<T, B>}
 */
export const createValidator: CreateValidator = function (
    validate,
    options = {}
  ) {
    return new Validator(validate, options);
  };

/**
 * Converts a value to its corresponding `TypeOf` string, with special handling for constructors.  If a constructor is provided and the value is an instance of that constructor, the constructor itself is returned.  Otherwise, the function checks for primitive types and returns the appropriate `TypeOf` string.  This utility is used to determine the type of a value for validation and error messaging purposes.
 * @template T - The type of the value to convert.
 * @template {(new (...args: any) => any) | undefined} [C=undefined] - A constructor type that can be used to check if the value is an instance of a specific class.  This should be a newable type (i.e., a class constructor).
 * @param {T} value - The value to convert to a `TypeOf` string.  This can be any value, and the function will determine its type based on the provided constructor and its actual type.
 * @param {C} [constructor=undefined as C] - An optional constructor that can be used to check if the value is an instance of a specific class.  If the value is an instance of this constructor, the constructor itself will be returned instead of a `TypeOf` string.  If not provided, this defaults to undefined, and the function will only check for primitive types.
 * @returns {C extends (new (...args: any) => any) ? C : TypeOf}  Returns the constructor if the value is an instance of it, or a `TypeOf` string representing the type of the value.  The return type is a conditional type that returns the constructor type if a constructor is provided and the value is an instance of it, or a `TypeOf` string otherwise.
 */
export function convertToTypeOf<T, C extends (new (...args: any) => any) | undefined = undefined>(value: T, constructor: C = undefined as C): C extends (new (...args: any) => any) ? C : TypeOf {
  const falsyValues = [0, false, "", null, undefined, -0, 0n, NaN];
  const isConstructor = constructor && value instanceof constructor ? constructor : null;
  const isString = typeof value === "string" ? "string" : null;
  const isNumber = isFinite(Number(value)) && !isNaN(Number(value)) ? "number" : null;
  const isBoolean = falsyValues.includes(Boolean(value)) || typeof value === "boolean" ? "boolean" : null;
  const isArray = Array.isArray(value) ? "array" : null;
  const isObject = typeof value === "object" && value !== null ? "object" : null;
  const isFunction = typeof value === "function" ? "function" : null;
  const isBigInt = typeof value === "bigint" ? "bigint" : null;
  const isSymbol = typeof value === "symbol" ? "symbol" : null;
  const isUndefined = typeof value === "undefined" ? "undefined" : null;

  return (isConstructor || isNumber || isBoolean || isArray || isObject || isFunction || isBigInt || isSymbol || isUndefined || isString || typeof value) as C extends (new (...args: any) => any) ? C : TypeOf;
}

/**
 * Generic validator factory that creates a validator for a specific primitive type.  This function takes a `TypeOf` string representing the expected type and returns a Validator instance that validates input against that type.  The validator will use the static isTypeOf method to check if the input matches the expected type, and it will handle type coercion for numbers and booleans to allow for common string representations of these types.
 * @template {TypeOf} T - The `TypeOf` string representing the expected type of the input (e.g., "string", "number").
 * @param {T} type - The `TypeOf` string representing the expected type of the input.  This should be one of the valid `TypeOf` values (e.g., "string", "number", "boolean").
 * @returns {Validator<Primitive<T>, false>} Returns a Validator instance that validates input against the specified primitive type.  The validatedInput type will be the corresponding primitive type for the given `TypeOf` string (e.g., string for "string", number for "number").
 */
function genericValidator<T extends TypeOf> (type: T) {
  return createValidator<Primitive<T>>((input) => Validator.isTypeOf(input, type));
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
/**
 * Optional validator wrapper.
 */
export const makeOptional = <T> (validator: Validator<T>): Validator<T | undefined> => {
  return createValidator<T | undefined>(
    (input) => (
      input === undefined
        ? undefined
        : validator.parse(input)
    ) as typeof input extends T | undefined ? typeof input : never
  );
};
