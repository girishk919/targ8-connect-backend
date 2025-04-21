/** @format */

const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

const Admins = require('../../models/admin/admin_model');
const TempCompanies = require('../../models/company/tempCompany_model');
const Companies = require('../../models/company/company_model');
const Activities = require('../../models/admin/activity_log_model');

const registerValidation = require('../../validations/admin/register_validation');
const captchaVerifier = require('../common/captchaVerification');

router.get('/', async (req, res) => {
	Admins.find()
		.then((admins) => res.json(admins))
		.catch((err) => res.status(400).json('Error: ' + err));
});

router.delete('/', async (req, res) => {
	const admin = await Admins.findById(req.query.id);
	if (!admin) return res.status(400).json('Admin not found!');

	admin
		.remove()
		.then(() => res.json('Admin deleted!'))
		.catch((err) => res.status(400).json('Error: ' + err));
});

router.post('/add', async (req, res) => {
	const { error } = registerValidation.validate(req.body);
	if (error) return res.status(400).json(error.details[0].message);

	try {
		if (req.body.password !== req.body.confirm_password)
			return res.status(400).json('Passwords do not match!');

		const admin = await Admins.findOne({ email: req.body.email });
		if (admin)
			return res.status(400).json('Admin with this email already exists!');

		const company2 = await Companies.findOne({ email: req.body.email });
		if (company2)
			return res.status(400).json('Company with this email already exists!');

		const company4 = await TempCompanies.findOne({ email: req.body.email });
		if (company4)
			return res.status(400).json('Company with this email already exists!');

		const salt = await bcrypt.genSalt(10);
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		const addAdmin = new Admins({
			name: req.body.name,
			email: req.body.email,
			password: hashPassword,
		});

		await addAdmin.save();

		var today = new Date().toLocaleDateString('en-us', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		await Activities.create({
			person: addAdmin._id,
			role: 'ADMIN',
			heading: 'Account Created',
			message: `Account have created at ${today}!`,
		});

		return res.json('Admin Account Added!');
	} catch (error) {
		res.status(400).json('There was some error!');
	}
});

module.exports = router;
