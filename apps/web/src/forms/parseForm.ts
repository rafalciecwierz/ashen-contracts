import type { z } from 'zod';
import type {
  FieldErrors,
  FieldMessageKeys,
  FormDefinition,
} from './form.types';

export function defineForm<TSchema extends z.ZodType>(
  schema: TSchema,
  messageKeys: FieldMessageKeys<z.input<TSchema>>,
): FormDefinition<TSchema> {
  return { schema, messageKeys };
}

export type ParseFormResult<TSchema extends z.ZodType> =
  | { success: true; data: z.output<TSchema> }
  | { success: false; fieldErrors: FieldErrors<z.input<TSchema>> };

/**
 * Validates a form the same way in the browser (onSubmit) and in its Server
 * Action. Reads only the fields named in `messageKeys` (anything else in the
 * FormData, like a hidden redirect field, is ignored, so a strict shared
 * schema doesn't reject it), as strings, and keeps the first error per field.
 * A message the schema sets itself, e.g. a refine with validationKey(), wins
 * over the field's key.
 */
export function parseForm<TSchema extends z.ZodType>(
  { schema, messageKeys }: FormDefinition<TSchema>,
  formData: FormData,
): ParseFormResult<TSchema> {
  const fields = Object.keys(messageKeys) as (keyof typeof messageKeys)[];
  const values = Object.fromEntries(
    fields.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === 'string' ? value : ''];
    }),
  );

  const result = schema.safeParse(values, {
    error: (issue) => messageKeys[issue.path?.[0] as keyof typeof messageKeys],
  });
  if (result.success) return { success: true, data: result.data };

  const fieldErrors: FieldErrors<z.input<TSchema>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof typeof messageKeys;
    fieldErrors[field] ??= issue.message as (typeof messageKeys)[typeof field];
  }
  return { success: false, fieldErrors };
}
