const Joi = require('joi');

const addCompanySchema = Joi.object({
	type: Joi.string().required().min(4),
	name: Joi.string()
		.required()
		.min(1)
		.regex(new RegExp('[a-zA-Z][a-zA-Z ]+[a-zA-Z]$'))
		.messages({ 'string.pattern.base': 'Name should only contain alphabets!' }),
	email: Joi.string().required().min(6).email(),
	mobile: Joi.string().min(0),
	company_name: Joi.string().min(0),
	password: Joi.string()
		.required()
		.min(6)
		.regex(new RegExp('^(?=.*?[#?!@$%^&*-]).{6,}$'))
		.messages({
			'string.pattern.base':
				'Password should contain minimum 1 Special Charcter',
		}),
	subscription_id: Joi.string(),
	isAnnual: Joi.boolean(),
});

module.exports = addCompanySchema;
