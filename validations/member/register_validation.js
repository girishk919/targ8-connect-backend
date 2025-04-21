const Joi = require('joi');

const registerSchema = Joi.object({
    invite_id: Joi.string()
        .required()
        .min(6),
    password: Joi.string()
        .required()
        .min(6)
        .regex(new RegExp("^(?=.*?[#?!@$%^&*-]).{6,}$"))
        .messages({'string.pattern.base': 'Password should contain minimum 1 Special Charcter'}),
})

module.exports = registerSchema;