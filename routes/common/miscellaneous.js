/** @format */

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const authorize = require('../../helpers/authorize');

const { dashLogger } = require('../../logger');
const Admins = require('../../models/admin/admin_model');
const Companies = require('../../models/company/company_model');
const SubAdmin = require('../../models/sub-admin/sub_admin_model');
const Members = require('../../models/member/member_model');
const Notification = require('../../models/common/notification_model');
const Invoices = require('../../models/company/invoice_model');
const AdminActivityLogs = require('../../models/admin/activity_log_model');
const CompanyActivityLogs = require('../../models/company/activity_log_model');
const MemberActivityLogs = require('../../models/member/activity_log_model');

router.get(
	'/myCredits',
	[authorize.verifyToken, authorize.accessCompanyAndMember],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
				}));
			if (!person) return res.status(400).json('Account not found!');

			let data;

			if (person.role === 'COMPANY') {
				if (person.planType === 'PYG') {
					data = {
						credits: person.credits,
						type: 'FREE',
						planType: person.planType,
					};
				} else {
					data = {
						credits: person.credits,
						type: 'PREMIUM',
						planType: person.planType,
					};
				}
			} else if (person.role === 'MEMBER') {
				data = {
					credits: person.credits,
					type: 'NA',
				};
			} else {
				return res.status(400).json('Role not supported!');
			}

			return res.json(data);
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json('There was some error!');
		}
	}
);

router.get('/logs', [authorize.verifyToken], async (req, res) => {
	try {
		const person =
			(await Admins.findById(req.user.id)) ||
			(await SubAdmin.findById(req.user.id)) ||
			(await Companies.findById(req.user.id)) ||
			(await Members.findById(req.user.id).populate('company_id'));
		if (!person) return res.status(400).json('Account not found!');

		let count = 0;

		let logs = [];

		var today = new Date();
		var fromDate = today.setDate(today.getDate() - 3);
		var query = { createdAt: { $gte: fromDate } };

		if (req.query.date) {
			var fromDate = new Date(req.query.date);
			// fromDate.setDate(fromDate.getDate() - 1);
			var toDate = new Date(req.query.date);
			toDate.setDate(toDate.getDate() + 3);
			query = { createdAt: { $gte: fromDate, $lte: toDate } };
		}

		if (person.role === 'ADMIN') {
			//count = await AdminActivityLogs.countDocuments({ role: 'ADMIN' });
			var findquery = { ...query };
			findquery['role'] = 'ADMIN';

			const getLogs = await AdminActivityLogs.find(findquery)
				.sort({ createdAt: 1 })
				.populate('person');

			for (let i = 0; i < getLogs.length; i++) {
				let log;
				if (getLogs[i].person._id.equals(person._id)) {
					log = {
						heading: getLogs[i].heading,
						person: 'You',
						message: getLogs[i].message,
						query: getLogs[i].query,
						createdAt: getLogs[i].createdAt,
					};
				} else {
					log = {
						heading: getLogs[i].heading,
						person: getLogs[i].person.name,
						message: getLogs[i].message,
						query: getLogs[i].query,
						createdAt: getLogs[i].createdAt,
					};
				}
				logs.push(log);
			}
		} else if (person.role === 'SUB_ADMIN') {
			var findquery = { ...query };
			findquery['person'] = person._id;
			const getLogs = await AdminActivityLogs.find(findquery).sort({
				createdAt: 1,
			});

			for (let i = 0; i < getLogs.length; i++) {
				let log = {
					heading: getLogs[i].heading,
					person: 'You',
					message: getLogs[i].message,
					query: getLogs[i].query,
					createdAt: getLogs[i].createdAt,
				};

				logs.push(log);
			}
		} else if (person.role === 'COMPANY') {
			//count = await CompanyActivityLogs.countDocuments({ company: person._id });
			var findquery = { ...query };
			findquery['company'] = person._id;
			const getLogs = await CompanyActivityLogs.find(findquery).sort({
				createdAt: 1,
			});

			for (let i = 0; i < getLogs.length; i++) {
				const log = {
					heading: getLogs[i].heading,
					person: 'You',
					message: getLogs[i].message,
					query: getLogs[i].query,
					createdAt: getLogs[i].createdAt,
				};
				logs.push(log);
			}
		} else if (person.role === 'MEMBER') {
			//count = await MemberActivityLogs.countDocuments({ member: person._id });
			var findquery = { ...query };
			findquery['member'] = person._id;
			const getLogs = await MemberActivityLogs.find(findquery)
				.sort({ createdAt: 1 })
				.populate(['member', 'company']);

			for (let i = 0; i < getLogs.length; i++) {
				let log;
				if (getLogs[i].company != null) {
					log = {
						heading: getLogs[i].heading,
						company: getLogs[i].company.company_name,
						message: getLogs[i].message,
						query: getLogs[i].query,
						createdAt: getLogs[i].createdAt,
					};
				} else {
					log = {
						heading: getLogs[i].heading,
						member: person,
						message: getLogs[i].message,
						query: getLogs[i].query,
						createdAt: getLogs[i].createdAt,
					};
				}
				logs.push(log);
			}
		} else {
			return res.status(404).json('Role not found!');
		}

		return res.json({
			count: count,
			logs: logs,
		});
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
		);
		res.status(400).json('There was some error!' + error);
	}
});

router.get('/memberlogs', [authorize.verifyToken], async (req, res) => {
	try {
		const person = await Members.findById(req.query.id).populate('company_id');
		if (!person) return res.status(400).json('Account not found!');

		var today = new Date();
		var fromDate = today.setDate(today.getDate() - 3);
		var query = { createdAt: { $gte: fromDate } };

		if (req.query.date) {
			var fromDate = new Date(req.query.date);
			var toDate = new Date(req.query.date);
			toDate.setDate(toDate.getDate() + 3);
			query = { createdAt: { $gte: fromDate, $lte: toDate } };
		}

		query['member'] = person._id;

		let logs = [];

		const getLogs = await MemberActivityLogs.find(query)
			.sort({ createdAt: 1 })
			.populate(['member', 'company']);

		for (let i = 0; i < getLogs.length; i++) {
			let log;
			if (getLogs[i].company != null) {
				log = {
					heading: getLogs[i].heading,
					company: getLogs[i].company.company_name,
					message: getLogs[i].message,
					query: getLogs[i].query,
					createdAt: getLogs[i].createdAt,
				};
			} else {
				log = {
					heading: getLogs[i].heading,
					member: person,
					message: getLogs[i].message,
					query: getLogs[i].query,
					createdAt: getLogs[i].createdAt,
				};
			}
			logs.push(log);
		}

		return res.json({
			count: 0,
			logs: logs,
		});
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
		);
		res.status(400).json('There was some error!' + error);
	}
});

router.get('/notifications', [authorize.verifyToken], async (req, res) => {
	try {
		const person =
			(await Admins.findById(req.user.id)) ||
			(await Companies.findById(req.user.id)) ||
			(await Members.findById(req.user.id).populate('company_id'));
		if (!person) return res.status(400).json('Account not found!');

		let count = 0;

		let logs = [];

		if (person.role === 'ADMIN') {
			count = await Notification.countDocuments({
				person: { $exists: true, $ne: '' },
			});

			const getLogs = await Notification.find({
				person: { $exists: true, $ne: '' },
			})
				.skip((req.query.page - 1) * req.query.limits)
				.limit(req.query.limits)
				.sort({ createdAt: 'desc' })
				.populate('person');
			for (let i = 0; i < getLogs.length; i++) {
				let log;
				if (getLogs[i].person._id.equals(person._id)) {
					log = {
						heading: getLogs[i].heading,
						person: 'You',
						message: getLogs[i].message,
						createdAt: getLogs[i].createdAt,
					};
				} else {
					log = {
						heading: getLogs[i].heading,
						person: getLogs[i].person.name,
						message: getLogs[i].message,
						createdAt: getLogs[i].createdAt,
					};
				}
				logs.push(log);
			}
		} else if (person.role === 'COMPANY') {
			count = await Notification.countDocuments({
				company: person._id,
				member: { $exists: false },
			});

			const getLogs = await Notification.find({
				company: person._id,
				member: { $exists: false },
			})
				.skip((req.query.page - 1) * req.query.limits)
				.limit(req.query.limits)
				.sort({ createdAt: 'desc' });
			for (let i = 0; i < getLogs.length; i++) {
				const log = {
					heading: getLogs[i].heading,
					person: 'You',
					message: getLogs[i].message,
					createdAt: getLogs[i].createdAt,
				};
				logs.push(log);
			}
		} else if (person.role === 'MEMBER') {
			count = await Notification.countDocuments({ member: person._id });

			const getLogs = await Notification.find({ member: person._id })
				.skip((req.query.page - 1) * req.query.limits)
				.limit(req.query.limits)
				.sort({ createdAt: 'desc' })
				.populate(['member', 'company']);
			for (let i = 0; i < getLogs.length; i++) {
				let log;
				if (getLogs[i].company != null) {
					log = {
						heading: getLogs[i].heading,
						company: getLogs[i].company.company_name,
						message: getLogs[i].message,
						createdAt: getLogs[i].createdAt,
					};
				} else {
					log = {
						heading: getLogs[i].heading,
						member: 'You',
						message: getLogs[i].message,
						createdAt: getLogs[i].createdAt,
					};
				}
				logs.push(log);
			}
		} else {
			return res.status(404).json('Role not found!');
		}

		return res.json({
			count: count,
			logs: logs,
		});
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
		);
		res.status(400).json('There was some error!' + error);
	}
});

router.get(
	'/unpaidNotifications',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person =
				(await Admins.findById(req.user.id)) ||
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id'));
			if (!person) return res.status(400).json('Account not found!');

			let count = 0;

			let message = '';

			if (person.role === 'ADMIN') {
				count = await Invoices.find({ status: false }).count();
				message = `You have unpaid invoices.`;
			} else if (person.role === 'COMPANY') {
				count = await Invoices.countDocuments({
					company: person._id,
					status: false,
				});
				message = `You have unpaid invoices.`;
			} else if (person.role === 'MEMBER') {
				message = '';
			} else {
				return res.status(404).json('Role not found!');
			}

			return res.json({
				count: count,
				message: message,
			});
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json('There was some error!' + error);
		}
	}
);

module.exports = router;
