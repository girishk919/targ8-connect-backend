const Joi = require("joi");

const departmentSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(1)
    .regex(new RegExp("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"))
    .messages({ "string.pattern.base": "Deparment should only contain alphabets!" }),
});

module.exports = departmentSchema;
