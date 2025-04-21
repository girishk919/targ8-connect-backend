const Joi = require("joi");

const potential_customer_validation = Joi.object({
  email: Joi.string().email().required(),
});

module.exports = potential_customer_validation;
