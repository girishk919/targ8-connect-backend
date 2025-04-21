const Joi = require('joi');

const resetPasswordSchema = Joi.object({
    reset_id: Joi.string()
        .required()
        .min(6),
    password: Joi.string()
        .required()
        .min(6)
        .regex(new RegExp("^(?=.*?[#?!@$%^&*-]).{6,}$"))
        .messages({'string.pattern.base': 'Password should contain minimum  1 Special Charcter'}),
    confirm_password: Joi.string()
        .required()
        .min(6)
        .regex(new RegExp("^(?=.*?[#?!@$%^&*-]).{6,}$"))
        .messages({'string.pattern.base': 'Confirm Password should contain minimum  1 Special Charcter'}),
})

module.exports = resetPasswordSchema;