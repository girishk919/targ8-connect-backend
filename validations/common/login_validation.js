const Joi = require('joi');

const loginSchema = Joi.object({
	email: Joi.string().required().min(6).email(),
	remember_me: Joi.boolean().required(),
	password: Joi.string().required().min(6),
	location: Joi.string(),
	browserType: Joi.string(),
});

module.exports = loginSchema;
