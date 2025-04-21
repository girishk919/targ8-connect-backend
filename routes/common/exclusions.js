/** @format */

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const csvtojson = require('csvtojson');

const router = express.Router();

const authorize = require('../../helpers/authorize');
const { dashLogger } = require('../../logger');
const Activities = require('../../models/company/activity_log_model');
const Companies = require('../../models/company/company_model');
const Members = require('../../models/member/member_model');
const AdminActivities = require('../../models/admin/activity_log_model');
const Subscription = require('../../models/admin/subscription_model');
const Admin = require('../../models/admin/admin_model');
const SubAdmin = require('../../models/sub-admin/sub_admin_model');
const Exclusions = require('../../models/common/exclusion_model');
const subscription_validater = require('../../helpers/subscription_validator');

const upload = multer({ storage: multer.memoryStorage() });

router.post(
	'/add',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	upload.single('file'),
	async (req, res) => {
		try {
			const file = req.file;
			if (!file) {
				return res.status(400).json('File is required');
			}
			if (file.mimetype !== 'text/csv' || !file.originalname.endsWith('.csv')) {
				return res.status(400).json('Only CSV Files are allowed.');
			}

			const person =
				(await Companies.findById(req.user.id).populate('plan')) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
					populate: { path: 'plan' },
				})) ||
				(await Admin.findById(req.user.id)) ||
				(await SubAdmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			let plan = [];

			if (person.role === 'COMPANY') {
				if (person.plan.subscription_type === 'Free Trial') {
					const findPlan = await Subscription.findOne({
						title: 'Growth',
					}).populate('features');
					if (!findPlan) {
						return res.status(400).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				} else {
					const findPlan = await Subscription.findOne({
						title: person.plan.subscription_type,
					}).populate('features');
					if (!findPlan) {
						return res.status(400).json('Buy a plan for using this service.');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				}
			}
			if (person.role === 'MEMBER') {
				if (person.company_id.plan.subscription_type === 'Free Trial') {
					const findPlan = await Subscription.findOne({
						title: 'Growth',
					}).populate('features');
					if (!findPlan) {
						return res.status(400).json('Buy a plan for using this service.');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				} else {
					const findPlan = await Subscription.findOne({
						title: person.company_id.plan.subscription_type,
					}).populate('features');
					if (!findPlan) {
						return res.status(400).json('Buy a plan for using this service.');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				}
			}

			const JSONArray = await csvtojson().fromString(
				req.file.buffer.toString()
			);

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				if (!plan.includes('Exclusion Upload')) {
					return res.status(400).json('Exclusion Upload is not in your plan.');
				}

				let company_id;

				if (person.role === 'COMPANY') {
					company_id = person._id;
				} else if (person.role === 'MEMBER') {
					company_id = person.company_id._id;
				}

				const getList = await Exclusions.findOne({
					list_name: req.body.list_name,
					company_id: company_id,
				});
				if (getList)
					return res
						.status(400)
						.json('Exclusion list with this name already exists!');

				const addExclusion = new Exclusions({
					list_name: req.body.list_name,
					company: company_id,
					leads: JSONArray,
				});

				const genExclusion = await addExclusion.save();

				if (person.role === 'COMPANY') {
					person.exclusions.push(genExclusion._id);
					await person.save();
				} else if (person.role === 'MEMBER') {
					person.company_id.exclusions.push(genExclusion._id);
					await person.company_id.save();
				}

				if (person.role === 'COMPANY') {
					await Activities.create({
						company: company_id,
						heading: 'List Added',
						message: `Excel Sheet Uploaded for exclusion!`,
					});
				}
				if (person.role === 'MEMBER') {
					await Activities.create({
						member: person._id,
						company: company_id,
						heading: 'List Added',
						message: `Excel Sheet Uploaded for exclusion!`,
					});
				}
			} else if (person.role === 'ADMIN') {
				const getList = await Exclusions.findOne({
					list_name: req.body.list_name,
					admin: person._id,
				});
				if (getList)
					return res
						.status(400)
						.json('Exclusion list with this name already exists!');

				const addExclusion = new Exclusions({
					list_name: req.body.list_name,
					admin: person._id,
					leads: JSONArray,
				});

				const genExclusion = await addExclusion.save();

				person.exclusions.push(genExclusion._id);
				await person.save();

				await AdminActivities.create({
					person: person._id,
					role: 'ADMIN',
					heading: 'List Added',
					message: `Excel Sheet Uploaded for exclusion!`,
				});
			} else if (person.role === 'SUB_ADMIN') {
				const getList = await Exclusions.findOne({
					list_name: req.body.list_name,
					subadmin: person._id,
				});
				if (getList)
					return res
						.status(400)
						.json('Exclusion list with this name already exists!');

				const addExclusion = new Exclusions({
					list_name: req.body.list_name,
					subadmin: person._id,
					leads: JSONArray,
				});

				const genExclusion = await addExclusion.save();

				person.exclusions.push(genExclusion._id);
				await person.save();

				// await AdminActivities.create({
				// 	person: person._id,
				// 	role: 'SUB_ADMIN',
				// 	heading: 'List Added',
				// 	message: `Excel Sheet Uploaded for exclusion!`,
				// });
			}

			return res.status(200).json('Exclusion list added!');
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id).populate({
					path: 'exclusions',
					options: { sort: { createdAt: -1 } },
					select: { _id: 1, list_name: 1, createdAt: 1 },
				})) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
					populate: {
						path: 'exclusions',
						options: { sort: { createdAt: -1 } },
						select: { _id: 1, list_name: 1, createdAt: 1 },
					},
				})) ||
				(await Admin.findById(req.user.id).populate({
					path: 'exclusions',
					options: { sort: { createdAt: -1 } },
					select: { _id: 1, list_name: 1, createdAt: 1 },
				})) ||
				(await SubAdmin.findById(req.user.id).populate({
					path: 'exclusions',
					options: { sort: { createdAt: -1 } },
					select: { _id: 1, list_name: 1, createdAt: 1 },
				}));
			if (!person) return res.status(400).json('Account not found!');

			let exclusions;

			if (
				person.role === 'COMPANY' ||
				person.role === 'ADMIN' ||
				person.role === 'SUB_ADMIN'
			) {
				exclusions = person.exclusions;
			} else if (person.role === 'MEMBER') {
				exclusions = person.company_id.exclusions;
			} else {
				return res.status(400).json('Role not found!');
			}

			return res.json(exclusions);
		} catch (err) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(err.message);
		}
	}
);

router.get(
	'/oneExclusionList',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id')) ||
				(await Admin.findById(req.user.id)) ||
				(await SubAdmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			// let company_id;

			// if (person.role === 'COMPANY') {
			// 	company_id = person._id;
			// } else if (person.role === 'MEMBER') {
			// 	company_id = person.company_id._id;
			// } else {
			// 	return res.status(400).json('Role not found!');
			// }

			const exclusion_list = await Exclusions.findOne({
				_id: mongoose.Types.ObjectId(req.query.exclusion_id),
				// company_id: company_id,
			});
			if (!exclusion_list)
				return res.status(404).json('Exclusion List not found!');

			return res.json(exclusion_list);
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json('There was some error!' + error);
		}
	}
);

router.delete(
	'/',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id')) ||
				(await Admin.findById(req.user.id)) ||
				(await SubAdmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			// let company_id;

			// if (person.role === 'COMPANY') {
			// 	company_id = person._id;
			// } else if (person.role === 'MEMBER') {
			// 	company_id = person.company_id._id;
			// } else {
			// 	return res.status(400).json('Role not found!');
			// }

			const getExclusion = await Exclusions.findOne({
				_id: mongoose.Types.ObjectId(req.query.exclusion_id),
				// company_id: company_id,
			});
			if (!getExclusion)
				return res.status(400).json('Exclusion list does not exist!');

			await getExclusion.remove();

			if (
				person.role === 'COMPANY' ||
				person.role === 'ADMIN' ||
				person.role === 'SUB_ADMIN'
			) {
				person.exclusions = person.exclusions.filter((element) => {
					if (element.equals(getExclusion._id)) {
						return false;
					}
					return true;
				});

				await person.save();
			} else if (person.role === 'MEMBER') {
				person.company_id.exclusions = person.company_id.exclusions.filter(
					(element) => {
						if (element.equals(getExclusion._id)) {
							return false;
						}
						return true;
					}
				);

				await person.company_id.save();
			} else {
				return res.status(400).json('Role not found!');
			}

			return res.json('Exclusion list deleted');
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

module.exports = router;
