/** @format */

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const authorize = require('../../helpers/authorize');

const Companies = require('../../models/company/company_model');
const Member = require('../../models/member/member_model');
const CreditUsage = require('../../models/common/credit_usage');
const CreditRequests = require('../../models/member/request_credits_model');
const CompanyActivityLogs = require('../../models/company/activity_log_model');
const MemberActivityLogs = require('../../models/member/activity_log_model');
const { dashLogger } = require('../../logger');
const subscription_validater = require('../../helpers/subscription_validator');

router.get(
	'/myHistory',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			var page = req.query.page || 1;
			var limit = req.query.limit || 10;
			const count = await CreditUsage.countDocuments({
				company: req.user.id,
				type: 'debit',
			});
			const data = await CreditUsage.find({
				company: req.user.id,
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
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).populate({
				path: 'credit_requests',
				populate: { path: 'member', model: Member },
			});
			if (!company) return res.status(400).json('Company not found!');

			return res.json(company.credit_requests);
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/accept',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id);
			if (!company) return res.status(404).json('Company not found!');

			const creditRequest = await CreditRequests.findById(
				mongoose.Types.ObjectId(req.query.request_id)
			).populate('member');
			if (!creditRequest)
				return res.status(404).json('Credit Request not found!');

			if (creditRequest.member.blocked === true) {
				return res.status(400).json('Member is blocked!');
			}
			if (creditRequest.member.suspended === true) {
				return res.status(400).json('Member is suspended!');
			}

			if (creditRequest.status !== 'PENDING')
				return res.status(400).json('Request already ' + creditRequest.status);

			if (creditRequest.credits > company.credits)
				return res.status(400).json('Not enough credits!');

			company.credits -= creditRequest.credits;
			creditRequest.member.credits += creditRequest.credits;
			creditRequest.member.totalCredits += creditRequest.credits;
			creditRequest.status = 'APPROVED';

			await creditRequest.member.save();
			await creditRequest.save();
			await company.save();

			const addActivityLog = new MemberActivityLogs({
				member: creditRequest.member._id,
				company: company._id,
				heading: 'Credits Request',
				message: 'Approved ' + creditRequest.credits + ' credits.',
			});

			await addActivityLog.save();

			const addCompanyActivityLog = new CompanyActivityLogs({
				company: company._id,
				heading: 'Credits Request',
				message: 'Approved ' + creditRequest.credits + ' credits.',
			});

			await addCompanyActivityLog.save();

			return res.json('Request Approved!');
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.delete(
	'/decline',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id);
			if (!company) return res.status(404).json('Company not found!');

			const creditRequest = await CreditRequests.findById(
				mongoose.Types.ObjectId(req.query.request_id)
			).populate('member');
			if (!creditRequest)
				return res.status(404).json('Credit Request not found!');

			if (creditRequest.status !== 'PENDING')
				return res.status(400).json('Request already ' + creditRequest.status);

			creditRequest.status = 'DECLINED';

			await creditRequest.save();

			const addActivityLog = new MemberActivityLogs({
				member: creditRequest.member._id,
				company: company._id,
				heading: 'Credits Request',
				message: 'Declined ' + creditRequest.credits + ' credits.',
			});

			await addActivityLog.save();

			const addCompanyActivityLog = new CompanyActivityLogs({
				company: company._id,
				heading: 'Credits Request',
				message: 'Declined ' + creditRequest.credits + ' credits.',
			});

			await addCompanyActivityLog.save();

			return res.json('Request Declined!');
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

module.exports = router;
