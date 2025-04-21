/** @format */

const express = require('express');

const router = express.Router();

const authorize = require('../../helpers/authorize');

const Members = require('../../models/member/member_model');
const CreditRequests = require('../../models/member/request_credits_model');
const MemberActivityLogs = require('../../models/member/activity_log_model');
const Notification = require('../../models/common/notification_model');
const CreditUsage = require('../../models/common/credit_usage');

router.get(
	'/myHistory',
	[authorize.verifyToken, authorize.accessMember],
	async (req, res) => {
		try {
			var page = req.query.page || 1;
			var limit = req.query.limit || 10;
			const count = await CreditUsage.countDocuments({
				member: req.user.id,
				type: 'debit',
			});
			const data = await CreditUsage.find({
				member: req.user.id,
				type: 'debit',
			})
				.sort({ updatedAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit);

			return res.json({ total: count, data });
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/myRequests',
	[authorize.verifyToken, authorize.accessMember],
	async (req, res) => {
		try {
			const member = await Members.findById(req.user.id).populate(
				'credit_requests'
			);
			if (!member) return res.status(404).json('Member not found!');

			return res.json(member.credit_requests);
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/requestCredits',
	[authorize.verifyToken, authorize.accessMember],
	async (req, res) => {
		try {
			if (req.query.credits == null)
				return res.status(400).json('Credits is required!');
			if (req.query.credits === '')
				return res.status(400).json('Credits is required!');
			if (Number(req.query.credits <= 0))
				return res.status(400).json('Invalid Credits!');

			const member = await Members.findById(req.user.id).populate('company_id');
			if (!member) return res.status(404).json('Member not found!');

			const addRequest = new CreditRequests({
				member: req.user.id,
				company: member.company_id,
				credits: req.query.credits,
			});

			const genRequest = await addRequest.save();

			member.credit_requests.push(genRequest._id);

			member.company_id.credit_requests.push(genRequest._id);

			await member.company_id.save();
			await member.save();

			const addActivityLog = new MemberActivityLogs({
				member: req.user.id,
				heading: 'Credits Request',
				message: 'Requested for ' + req.query.credits + ' credits.',
			});

			await addActivityLog.save();

			await Notification.create({
				company: member.company_id._id,
				heading: 'Credits Request',
				message:
					'Requested for ' + req.query.credits + ' credits by ' + member.name,
			});

			return res.json('Credits requested!');
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

module.exports = router;
