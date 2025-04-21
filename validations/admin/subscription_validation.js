const Joi = require('joi');

const subscriptionSchema = Joi.object({
	title: Joi.string()
		.required()
		.min(1)
		.regex(new RegExp('[a-zA-Z][a-zA-Z ]+[a-zA-Z]$'))
		.messages({
			'string.pattern.base': 'Title should only contain alphabets!',
		}),
	desc: Joi.string().required().min(3),
	features: Joi.array().items(Joi.string().required()),
	monthly_amount: Joi.number().required().min(1),
	annually_amount: Joi.number().required().min(1),
	monthly_credits: Joi.number().required().min(1),
	annually_credits: Joi.number().required().min(1),
	no_of_user: Joi.number().required().min(1),
	type: Joi.string().required().min(1).valid('INDIVIDUAL', 'COMMON'),
	company_id: Joi.string(),
});

module.exports = subscriptionSchema;
