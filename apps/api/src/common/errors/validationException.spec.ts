import { describe, expect, it } from 'vitest';
import { ValidationError } from '@nestjs/common';
import { validationException } from './validationException';

describe('validationException', () => {
  it('returns a 400 with VALIDATION_FAILED and one detail per violated rule', () => {
    const errors: ValidationError[] = [
      {
        property: 'password',
        constraints: {
          isString: 'password must be a string',
          minLength: 'password must be longer than or equal to 8 characters',
        },
        children: [],
      },
      {
        property: 'isAdmin',
        constraints: {
          whitelistValidation: 'property isAdmin should not exist',
        },
        children: [],
      },
    ];

    const exception = validationException(errors);

    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      details: [
        {
          field: 'password',
          constraint: 'isString',
          message: 'password must be a string',
        },
        {
          field: 'password',
          constraint: 'minLength',
          message: 'password must be longer than or equal to 8 characters',
        },
        {
          field: 'isAdmin',
          constraint: 'whitelistValidation',
          message: 'property isAdmin should not exist',
        },
      ],
    });
  });

  it('gives nested fields a dotted path', () => {
    const errors: ValidationError[] = [
      {
        property: 'address',
        children: [
          {
            property: 'city',
            constraints: { isNotEmpty: 'city should not be empty' },
            children: [],
          },
        ],
      },
    ];

    const response = validationException(errors).getResponse();

    expect(response).toMatchObject({
      details: [
        {
          field: 'address.city',
          constraint: 'isNotEmpty',
          message: 'city should not be empty',
        },
      ],
    });
  });
});
