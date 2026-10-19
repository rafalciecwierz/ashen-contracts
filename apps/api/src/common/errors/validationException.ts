import { BadRequestException, ValidationError } from '@nestjs/common';
import type {
  ApiErrorCode,
  ValidationErrorDetail,
} from '@ashen-contracts/shared';

/**
 * ValidationPipe's `exceptionFactory`: a 400 with `code: VALIDATION_FAILED`
 * and one detail per violated rule, instead of Nest's default array of
 * English sentences in `message`.
 */
export function validationException(
  errors: ValidationError[],
): BadRequestException {
  const code: ApiErrorCode = 'VALIDATION_FAILED';
  return new BadRequestException({
    code,
    message: 'Validation failed',
    details: flattenValidationErrors(errors),
  });
}

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) => ({ field, constraint, message }),
    );
    // Nested objects (@ValidateNested) report their fields as children.
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}
