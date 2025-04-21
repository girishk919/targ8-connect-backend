/** @format */

const router = require('express').Router();
const TempCompanies = require('../../models/company/tempCompany_model');
const Companies = require('../../models/company/company_model');
const Admins = require('../../models/admin/admin_model');
const Sub_Admins = require('../../models/sub-admin/sub_admin_model');
const Members = require('../../models/member/member_model');
const bcrypt = require('bcryptjs');

const registerValidation = require('../../validations/admin/register_validation');
const captchaVerifier = require('../common/captchaVerification');
const subadminregisterSchema = require('../../validations/admin/sub_admin_validation');
const { default: mongoose } = require('mongoose');
const subadminEditValidation = require('../../validations/admin/sub_admin_edit_validation');

router.get('/', async (req, res) => {
	try {
		const sub_admin = await Sub_Admins.find();

		res.status(200).json(sub_admin);
	} catch (err) {
		res.status(400).json('There was some error !');
	}
});

router.get('/one', async (req, res) => {
	try {
		const sub_admin = await Sub_Admins.findOne({
			_id: mongoose.Types.ObjectId(req.query.id),
		});
		if (!sub_admin) {
			return res.status(404).json('No sub admin with this id exists !');
		}
		res.status(200).json(sub_admin);
	} catch (err) {
		res.status(400).json('There was some error !');
	}
});

router.delete('/', async (req, res) => {
	const sub_admin = await Sub_Admins.findById(req.query.id);
	if (!sub_admin) return res.status(400).json('Sub Admin not found!');

	sub_admin
		.remove()
		.then(() => res.json('Sub Admin deleted!'))
		.catch((err) => res.status(400).json('Error: ' + err));
});

router.post('/add', async (req, res) => {
	const { error } = subadminregisterSchema.validate(req.body);
	if (error) return res.status(400).json(error.details[0].message);

	try {
		const sub_admin = await Sub_Admins.findOne({ email: req.body.email });
		if (sub_admin) {
			return res.status(400).json('Sub Admin with this email already exists!');
		}
		const admin = await Admins.findOne({ email: req.body.email });
		if (admin)
			return res.status(400).json('Admin with this email already exists!');

		const company2 = await Companies.findOne({ email: req.body.email });
		if (company2)
			return res.status(400).json('Company with this email already exists!');

		const company4 = await TempCompanies.findOne({ email: req.body.email });
		if (company4)
			return res.status(400).json('Company with this email already exists!');

		const Member = await Members.findOne({ email: req.body.email });
		if (Member)
			return res.status(400).json('Member with this email already exists !');

		const salt = await bcrypt.genSalt(10);
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		const addSubAdmin = new Sub_Admins({
			name: req.body.name,
			email: req.body.email,
			password: hashPassword,
			access_tabs: req.body.access_tabs,
		});

		await addSubAdmin.save();

		return res.json('Sub Admin Account Added!');
	} catch (error) {
		console.log(error);
		res.status(400).json('There was some error!');
	}
});

router.patch('/edit', async (req, res) => {
	const { error } = subadminEditValidation.validate(req.body);
	try {
		if (error) {
			return res.status(400).json(error.details[0].message);
		}

		let sub_admin = await Sub_Admins.findById(req.query.id);
		if (!sub_admin) {
			return res.status(404).json('No sub admin with this id exists !');
		}

		if (sub_admin.email !== req.body.email) {
			let sub = await Sub_Admins.findOne({ email: req.body.email });

			if (sub) {
				return res.status(400).json('Sub Admin Email already exists !');
			}
			const admin = await Admins.findOne({ email: req.body.email });
			if (admin)
				return res.status(400).json('Admin with this email already exists!');

			const company2 = await Companies.findOne({ email: req.body.email });
			if (company2)
				return res.status(400).json('Company with this email already exists!');

			const company4 = await TempCompanies.findOne({ email: req.body.email });
			if (company4)
				return res.status(400).json('Company with this email already exists!');

			const Member = await Members.findOne({ email: req.body.email });
			if (Member)
				return res.status(400).json('Member with this email already exists !');
		}

		if (req.body.password) {
			const salt = await bcrypt.genSalt(10);
			const hashPassword = await bcrypt.hash(req.body.password, salt);

			req.body.password = hashPassword;
		}

		sub_admin = await Sub_Admins.findByIdAndUpdate(req.query.id, req.body, {
			new: true,
		});

		res.status(200).json('Sub admin edited Successsfully !');
	} catch (err) {
		res.status(400).json('There was some error !');
	}
});

module.exports = router;
