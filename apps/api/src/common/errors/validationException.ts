import { BadRequestException } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
  ApiErrorCode,
  ValidationErrorDetail,
} from '@ashen-contracts/shared';

/**
 * StandardSchemaValidationPipe's `exceptionFactory`: a 400 with
 * `code: VALIDATION_FAILED` and one detail per violated rule, instead of
 * Nest's default array of English sentences in `message`.
 */
export function validationException(
  issues: readonly StandardSchemaV1.Issue[],
): BadRequestException {
  const code: ApiErrorCode = 'VALIDATION_FAILED';
  return new BadRequestException({
    code,
    message: 'Validation failed',
    details: issues.flatMap(toDetails),
  });
}

/**
 * The Standard Schema spec only promises `message` and `path`; Zod's issues
 * also carry `code` (and `keys` for unrecognized keys), which become
 * `constraint`. One `unrecognized_keys` issue names every unknown key at the
 * object's path, so it becomes one detail per key, each with its own field.
 */
function toDetails(issue: StandardSchemaV1.Issue): ValidationErrorDetail[] {
  const field = (issue.path ?? [])
    .map((segment) =>
      String(typeof segment === 'object' ? segment.key : segment),
    )
    .join('.');
  const { code, keys } = issue as { code?: unknown; keys?: unknown };
  const constraint = typeof code === 'string' ? code : 'invalid';

  if (constraint === 'unrecognized_keys' && Array.isArray(keys)) {
    return keys.map((key) => ({
      field: field ? `${field}.${String(key)}` : String(key),
      constraint,
      message: `Unrecognized key: "${String(key)}"`,
    }));
  }
  return [{ field, constraint, message: issue.message }];
}
