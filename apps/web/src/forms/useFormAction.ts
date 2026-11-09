import { useActionState, useState, type SubmitEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { z } from 'zod';
import {
  validationMessageValues,
  type ValidationMessageKey,
} from '@/i18n/validationKey';
import type {
  FieldErrors,
  FormAction,
  FormDefinition,
  FormState,
} from './form.types';
import { parseForm } from './parseForm';

/**
 * Binds a form to its Server Action. The form uses uncontrolled inputs:
 * `name` for the FormData, `defaultValue={values.x}` to show a value again.
 *
 * `onSubmit` validates in the browser first and cancels an invalid submit, so
 * the player gets instant feedback; the action validates again, which is
 * what a form without JavaScript gets. Messages come back translated: one per
 * field (`fieldError`) and one for the form, from the API's code (`error`).
 */
export function useFormAction<TSchema extends z.ZodType>(
  action: FormAction<z.input<TSchema>>,
  form: FormDefinition<TSchema>,
) {
  type Fields = z.input<TSchema>;
  const tValidation = useTranslations('validation');
  const tErrors = useTranslations('errors');

  const initialState: FormState<Fields> = {
    values: {},
    fieldErrors: {},
    error: null,
  };
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [clientErrors, setClientErrors] = useState<FieldErrors<Fields> | null>(
    null,
  );

  function onSubmit(event: SubmitEvent<HTMLFormElement>): void {
    const result = parseForm(form, new FormData(event.currentTarget));
    if (result.success) {
      setClientErrors(null);
    } else {
      event.preventDefault();
      setClientErrors(result.fieldErrors);
    }
  }

  const fieldErrors = clientErrors ?? state.fieldErrors;
  const error = clientErrors ? null : state.error;

  return {
    formAction,
    onSubmit,
    isPending,
    values: state.values,
    fieldError: (field: keyof Fields & string): string | undefined => {
      const key: ValidationMessageKey | undefined = fieldErrors[field];
      return key ? tValidation(key, validationMessageValues[key]) : undefined;
    },
    error: error ? tErrors(error) : undefined,
  };
}
