/** @format */

const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

const authorize = require('../../helpers/authorize');

const { dashLogger } = require('../../logger');
const Admins = require('../../models/admin/admin_model');
const Companies = require('../../models/company/company_model');
const Members = require('../../models/member/member_model');
const Sub_Admins = require('../../models/sub-admin/sub_admin_model');

const CompanyActivities = require('../../models/company/activity_log_model');
const MemberActivities = require('../../models/member/activity_log_model');
const AdminActivities = require('../../models/admin/activity_log_model');

const editProfileValidation = require('../../validations/common/edit_profile_validation');
const changePasswordValidation = require('../../validations/common/change_password_validation');
const { profile } = require('winston');
const { access } = require('fs');

router.get('/myProfile', [authorize.verifyToken], async (req, res) => {
	try {
		const person =
			(await Admins.findById(req.user.id)) ||
			(await Companies.findById(req.user.id)) ||
			(await Members.findById(req.user.id).populate({
				path: 'company_id',
			})) ||
			(await Sub_Admins.findById(req.user.id));

		if (!person) return res.status(400).json('Account not found!');

		let data;

		if (person.role === 'ADMIN') {
			data = {
				name: person.name,
				email: person.email,
				department: person.department,
				isOnboard: person.isOnboard,
				type: 'ADMIN',
			};
		}

		if (person.role === 'SUB_ADMIN') {
			data = {
				name: person.name,
				email: person.email,
				isOnboard: person.isOnboard,
				access_tabs: person.access_tabs,
				type: 'SUB_ADMIN',
			};
		}

		if (person.role === 'COMPANY') {
			if (person.plan === null || person.planType === 'PYG') {
				data = {
					name: person?.name,
					email: person?.email,
					mobile: person?.mobile,
					clientCode: person?.clientCode,
					username: person?.username,
				};
			} else {
				data = {
					name: person?.name,
					email: person?.email,
					mobile: person?.mobile,
					clientCode: person?.clientCode,
					username: person?.username,
					isOnboard: person?.isOnboard,
				};
			}
		}

		if (person?.role === 'MEMBER') {
			data = {
				name: person?.name,
				email: person?.email,
				clientCode: person?.clientCode,
				username: person?.username,
				company_clientCode: person?.company_id.clientCode,
				company_name: person?.company_id.name,
				type: 'MEMBER',
				isOnboard: person?.isOnboard,
			};
		}

		return res.json(data);
	} catch (error) {
		console.log(error);
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
		);
		res.status(400).json(error.message);
	}
});

router.post('/edit', [authorize.verifyToken], async (req, res) => {
	// const { error } = editProfileValidation.validate(req.body);
	// if (error) return res.status(400).json(error.details[0].message);

	try {
		const person =
			(await Admins.findById(req.user.id)) ||
			(await Companies.findById(req.user.id)) ||
			(await Members.findById(req.user.id).populate('company_id')) ||
			(await Sub_Admins.findById(req.user.id).populate('access_tabs'));

		if (!person) return res.status(400).json('Account not found!');

		if (person.role === 'ADMIN' || person.role === 'MEMBER') {
			person.name = req.body.name;
			person.department = req.body.department;
		} else if (person.role === 'COMPANY') {
			person.name = req.body.name;
			person.company_name = req.body.company_name;
			// if (person.mobile && person.mobile != req.body.mobile) {
			//   const checkNum = await Companies.findOne({ mobile: req.body.mobile });
			//   if (checkNum) return res.status(400).json("Company with this mobile already exists!");
			// }

			person.mobile = req.body.mobile;
		} else if (person.role === 'SUB_ADMIN') {
			person.name = req.body.name;
		} else {
			res.status(404).json('Role not found!');
		}
		await person.save();

		return res.json('Details updated!');
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
		);
		res.status(400).json('There was some error!' + error);
	}
});

router.post('/changePassword', [authorize.verifyToken], async (req, res) => {
	const { error } = changePasswordValidation.validate(req.body);
	if (error) return res.status(400).json(error.details[0].message);

	try {
		if (req.body.password !== req.body.confirm_password)
			return res.status(400).json('Passwords do not match');

		const person =
			(await Admins.findById(req.user.id)) ||
			(await Companies.findById(req.user.id)) ||
			(await Members.findById(req.user.id).populate('company_id'));
		if (!person) return res.status(400).json('Account not found!');

		const auth = await bcrypt.compare(req.body.old_password, person.password);
		if (!auth) return res.status(400).json('Wrong password!');

		const salt = await bcrypt.genSalt(10);
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		person.password = hashPassword;

		await person.save();

		// var today = new Date().toLocaleDateString('en-us', {
		// 	year: 'numeric',
		// 	month: 'long',
		// 	day: 'numeric',
		// });
		// if (person.role === 'ADMIN') {
		// 	await AdminActivities.create({
		// 		person: person._id,
		// 		role: 'ADMIN',
		// 		heading: 'Password Changed',
		// 		message: `New password set at ${today}!`,
		// 	});
		// }
		// if (person.role === 'SUB_ADMIN') {
		// 	await AdminActivities.create({
		// 		person: person._id,
		// 		role: 'SUB_ADMIN',
		// 		heading: 'Login Successfully',
		// 		message: `Account have login at ${today}!`,
		// 	});
		// }
		// if (person.role === 'COMPANY') {
		// 	await CompanyActivities.create({
		// 		company: person._id,
		// 		heading: 'Password Changed',
		// 		message: `New password set at ${today}!`,
		// 	});
		// }
		// if (person.role === 'MEMBER') {
		// 	await MemberActivities.create({
		// 		member: person._id,
		// 		company: person.company_id._id,
		// 		heading: 'Password Changed',
		// 		message: `New password set at ${today}!`,
		// 	});
		// }

		return res.json('Password Changed');
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
		);
		res.status(400).json('There was some error!');
	}
});

router.get('/onboardFinish', [authorize.verifyToken], async (req, res) => {
	try {
		const person =
			(await Admins.findById(req.user.id)) ||
			(await Companies.findById(req.user.id)) ||
			(await Members.findById(req.user.id).populate('company_id')) ||
			(await Sub_Admins.findById(req.user.id).populate('access_tabs'));

		if (!person) return res.status(400).json('Account not found!');

		person.isOnboard = true;
		await person.save();

		return res.json('Details updated!');
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
		);
		res.status(400).json('There was some error!' + error);
	}
});

router.post(
	'/changeProfileVisit',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person =
				(await Admins.findById(req.user.id)) ||
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id')) ||
				(await Sub_Admins.findById(req.user.id).populate('access_tabs'));

			if (!person) return res.status(400).json('Account not found!');

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				person.profileVisit -= 1;
			}
			await person.save();

			return res.json('Details updated!');
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json('There was some error!' + error);
		}
	}
);

module.exports = router;
