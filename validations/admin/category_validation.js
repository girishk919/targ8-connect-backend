const Joi = require('joi');

const categorySchema = Joi.object({
    name: Joi.string()
        .required()
        .min(1)
        .regex(new RegExp("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"))
        .messages({'string.pattern.base': 'Name should only contain alphabets!'}),
    status: Joi.boolean()
        .required()
})

module.exports = categorySchema;