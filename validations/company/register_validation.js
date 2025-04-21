/** @format */

const Joi = require('joi');

const registerSchema = Joi.object({
	name: Joi.string().required().min(1),
	email: Joi.string().required().min(6).email(),
	mobile: Joi.string().allow(null, '').optional(),
	company_name: Joi.string().required().min(2),
	planId: Joi.string(),
	planType: Joi.string(),
	isAnnual: Joi.boolean(),
	fpr: Joi.string(),
	password: Joi.string()
		.required()
		.min(6)
		.regex(new RegExp('^(?=.*?[#?!@$%^&*-]).{6,}$'))
		.messages({
			'string.pattern.base':
				'Password should be of min length 6 and contain minimum 1 Special Charcter',
		}),
	confirm_password: Joi.string()
		.required()
		.min(6)
		.regex(new RegExp('^(?=.*?[#?!@$%^&*-]).{6,}$'))
		.messages({
			'string.pattern.base':
				'Confirm Password should be of min length 6 and contain minimum 1 Special Charcter',
		}),
});

module.exports = registerSchema;
