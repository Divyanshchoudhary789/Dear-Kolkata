const Joi = require('joi');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Joi validation middleware generator
 * @param {object} schema - Joi validation schema { body, query, params }
 */
const validate = (schema) => {
  return catchAsync(async (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Return all errors
      allowUnknown: true, // Allow unknown fields
      stripUnknown: true  // Remove unknown fields
    };

    const toValidate = {};
    if (schema.body) toValidate.body = req.body;
    if (schema.query) toValidate.query = req.query;
    if (schema.params) toValidate.params = req.params;

    const schemaToUse = Joi.object(schema);
    const { error, value } = schemaToUse.validate(toValidate, validationOptions);

    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw new ApiError(400, 'Validation failed', errors);
    }

    // Replace req with validated/sanitized values
    if (value.body) req.body = value.body;
    if (value.query) req.query = value.query;
    if (value.params) req.params = value.params;

    next();
  });
};

// ─── Common Validation Schemas ──────────────────────────────────────────────

const kolkataPin = Joi.string().pattern(/^700\d{3}$/).required().messages({
  'string.pattern.base': 'Invalid Kolkata PIN code. Must start with 700 and be 6 digits.'
});

const phone = Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
  'string.pattern.base': 'Invalid Indian phone number'
});

const objectId = Joi.string().hex().length(24);

module.exports = { validate, kolkataPin, phone, objectId };
