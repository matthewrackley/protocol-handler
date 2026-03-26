
/**
 * Creates a validator from a parse function.
 */
export const createValidator = <T>(parse: (input: unknown) => T): Validator<T> => ({
  parse,
});

/**
 * Basic string validator.
 */
export const stringValidator = createValidator<string>((input) => {
  if (typeof input !== 'string') {
    throw new Error('Expected a string');
  }

  return input;
});

/**
 * Number validator.
 *
 * Handles numbers and numeric strings.
 */
export const numberValidator = createValidator<number>((input) => {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }

  if (typeof input === 'string' && input.trim() !== '') {
    const parsed = Number(input);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error('Expected a number');
});

/**
 * Boolean validator.
 *
 * Handles booleans and "true"/"false" strings.
 */
export const booleanValidator = createValidator<boolean>((input) => {
  if (typeof input === 'boolean') {
    return input;
  }

  if (input === 'true') return true;
  if (input === 'false') return false;

  throw new Error('Expected a boolean');
});

/**
 * Optional validator wrapper.
 */
export const optional = <T>(validator: Validator<T>): Validator<T | undefined> =>
  createValidator<T | undefined>((input) => {
    if (input === undefined) return undefined;
    return validator.parse(input);
  });
