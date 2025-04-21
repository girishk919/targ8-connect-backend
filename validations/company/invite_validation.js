const Joi = require('joi');

const inviteSchema = Joi.object({
    name: Joi.string()
        .required()
        .min(1)
        .regex(new RegExp("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"))
        .messages({'string.pattern.base': 'Name should only contain alphabets!'}),
    email: Joi.string()
        .required()
        .min(6)
        .email(),
    credits: Joi.number()
        .min(0),
})

module.exports = inviteSchema;