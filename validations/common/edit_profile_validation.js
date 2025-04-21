const Joi = require("joi");

const editProfileSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(1)
    .regex(new RegExp("[a-zA-Z][a-zA-Z ]+[a-zA-Z]$"))
    .messages({ "string.pattern.base": "Name should only contain alphabets!" }),
    email : Joi.string().min(0),
  department: Joi.string().min(1),
  mobile: Joi.string().min(0),
  company_name: Joi.string().min(0),
  password: Joi.string()
    .min(0)
    .regex(new RegExp("^(?=.*?[#?!@$%^&*-]).{6,}$"))
    .messages({ "string.pattern.base": "Password should be of min length 6 and contain minimum 1 Special Charcter" }),
});

module.exports = editProfileSchema;
