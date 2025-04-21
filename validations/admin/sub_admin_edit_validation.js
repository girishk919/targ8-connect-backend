const Joi = require("joi")
const subadminEditValidation = Joi.object({
    name: Joi.string()
    .required()
    .min(1)
    .regex(new RegExp("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"))
    .messages({ "string.pattern.base": "Name should only contain alphabets!" }),
  email: Joi.string().required().min(6).email(),
  password: Joi.string()
    .min(6)
    .regex(new RegExp("^(?=.*?[#?!@$%^&*-]).{6,}$"))
    .messages({ "string.pattern.base": "Password should contain minimum 1 Special Charcter" }),
  confirm_password: Joi.string()
    .min(6)
    .regex(new RegExp("^(?=.*?[#?!@$%^&*-]).{6,}$"))
    .messages({ "string.pattern.base": "Confirm Password should contain minimum 1 Special Charcter" }),
  access_tabs: Joi.array()
    .required()
    .min(1)
    .messages({ "string.pattern.base": "At lease 1 tab should be mentioned for the SUB ADMIN" }),
}) 

module.exports = subadminEditValidation;