/** @format */

const authorize = require('../../helpers/authorize');
const Potentials = require('../../models/admin/potential_customers_model');
const TempCompany = require('../../models/company/tempCompany_model');
const potential_customer_validation = require('../../validations/admin/potential_customer_validation');

const router = require('express').Router();

router.put('/', async (req, res) => {
	const { error } = potential_customer_validation.validate(req.query);
	if (error) {
		return res.status(400).json(error.details[0].message);
	}
	try {
		let email;
		email = await Potentials.findOne({ email: req.query.email });
		console.log('email', email);
		if (email) {
			return res.status(200).json('Proceed to signup !');
		}
		let date = new Date();
		email = await Potentials.create({
			email: req.query.email,
			expiresAt: new Date(date.setDate(date.getDate() + 1)),
		});
		res.status(201).json('User added to the Database !');
	} catch (err) {
		res.status(400).json('Something went wrong !');
	}
});

router.get(
	'/',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const potentials = await TempCompany.find();

			res.status(200).json({
				result: {
					count: potentials.length,
					potentials,
				},
			});
		} catch (err) {
			res.status(400).json('Something went wrong !');
		}
	}
);

module.exports = router;
