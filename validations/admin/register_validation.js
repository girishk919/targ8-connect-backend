const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string()
        .required()
        .min(1)
        .regex(new RegExp("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"))
        .messages({'string.pattern.base': 'Name should only contain alphabets!'}),
    email: Joi.string()
        .required()
        .min(6)
        .email(),
    password: Joi.string()
        .required()
        .min(6)
        .regex(new RegExp("^(?=.*?[#?!@$%^&*-]).{6,}$"))
        .messages({'string.pattern.base': 'Password should contain minimum 1 Special Charcter'}),
    confirm_password: Joi.string()
        .required()
        .min(6)
        .regex(new RegExp("^(?=.*?[#?!@$%^&*-]).{6,}$"))
        .messages({'string.pattern.base': 'Confirm Password should contain minimum 1 Special Charcter'}),
        
});

module.exports = registerSchema;