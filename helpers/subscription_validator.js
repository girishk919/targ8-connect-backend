/** @format */

const { default: mongoose } = require('mongoose');
const Companies = require('../models/company/company_model');

const subscription_validater = async (req, res, next) => {
	try {
		// console.log(req.user);
		console.log('time start from validator', new Date().getSeconds());

		if (req.user.role !== 'COMPANY') {
			next();
		} else {
			// console.log(req.user);
			const company = await Companies.findOne({
				_id: mongoose.Types.ObjectId(req.user.id),
			})
				.populate('plan')
				.lean();

			if (!company) {
				return res.status(404).json('No company found !');
			}
			// console.log(company)

			// console.log(company.plan.subscription_end_date , new Date());

			if (company.planType !== 'PYG') {
				if (!company.plan || company.plan.isExpired === true) {
					return res
						.status(401)
						.json('Your Plan is Expired , please upgrade !');
				}
			}
			next();
		}
	} catch (err) {
		console.log(err);
		res.status(400).json('There was an error !');
	}
};

module.exports = subscription_validater;
