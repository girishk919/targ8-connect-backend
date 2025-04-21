/** @format */

const jwt = require('jsonwebtoken');

const Companies = require('../models/company/company_model');
const Members = require('../models/member/member_model');
const Admin = require('../models/admin/admin_model');
const Subadmin = require('../models/sub-admin/sub_admin_model');
const Invoices = require('../models/company/invoice_model');
const blocked_model = require('../models/company/blocked_model');
const BlackList = require('../models/common/blacklist_model');
const api_history_model = require('../models/company/api_history_model');

async function verifyToken(req, res, next) {
	console.log('time start from token', new Date().getSeconds());
	if (
		!req.headers['x-access-key'] &&
		!req.headers['X-Access-Key'] &&
		!req.headers.token
	) {
		return res.status(400).json({ success: false, msg: 'Access Denied' });
	}
	const key = req.headers['x-access-key'] || req.headers['X-Access-Key'];
	if (key) {
		const person = await Companies.findOne({ api_key: key });
		if (!person) {
			return res
				.status(400)
				.json({ success: false, msg: 'Invalid access key.' });
		}
		req.user = person;
		req.person = person;
		const firstEmail = person.email.split('@');
		const blocked_list = await blocked_model.findOne({
			address: firstEmail[1],
		});
		if (blocked_list) {
			return res
				.status(400)
				.json({ success: false, msg: 'Access has been blocked' });
		}
		if (person.suspended === true) {
			return res
				.status(400)
				.json({ success: false, msg: 'Access has been suspended' });
		}
		if (person.role === 'COMPANY') {
			if (person.isCancelled === true) {
				return res.status(400).json({
					success: false,
					msg: 'You cancelled your subscription, contact support',
				});
			}
		}
		if (person.role === 'MEMBER') {
			if (person.company_id.isCancelled === true) {
				return res.status(400).json({
					success: false,
					msg: 'Your company cancelled the subscription, contact support',
				});
			}
		}

		const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'Unknown IP';

		res.on('finish', async () => {
			await api_history_model.create({
				company: person._id,
				key: key,
				route: req.originalUrl,
				method: req.method,
				status: res.statusCode,
				date: new Date().toISOString(),
				ipAddress,
			});
		});

		next();
	} else {
		const token = req.headers.token;
		if (!token) return res.status(400).json('Access Denied');

		const blacklisted = await BlackList.findOne({ token: token });
		if (blacklisted) return res.status(400).json('Please login again!');

		try {
			const verified = jwt.verify(token, process.env.JWT_SECRET_KEY);
			req.user = verified;

			const person =
				(await Admin.findById(req.user.id)) ||
				(await Subadmin.findById(req.user.id)) ||
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id'));
			if (!person) return res.status(400).json('Account not found');

			req.person = person;
			const firstEmail = person.email.split('@');
			const blocked_list = await blocked_model.findOne({
				address: firstEmail[1],
			});
			if (blocked_list) {
				return res.status(400).json('Access has been blocked');
			}
			if (person.suspended === true) {
				return res.status(400).json('Access has been suspended');
			}
			if (person.role === 'COMPANY') {
				if (person.isCancelled === true) {
					return res
						.status(400)
						.json('You cancelled your subscription, contact support');
				}
			}
			if (person.role === 'MEMBER') {
				if (person.company_id.isCancelled === true) {
					return res
						.status(400)
						.json('Your company cancelled the subscription, contact support');
				}
			}
			next();
		} catch (error) {
			res.status(400).json('Invalid Token');
		}
	}
}

async function accessAdmin(req, res, next) {
	if (!req.user.role.split('_').includes('ADMIN'))
		return res.status(400).json('Only Admin Access');
	next();
}

async function accessCompany(req, res, next) {
	if (req.user.role !== 'COMPANY')
		return res.status(400).json('Only Company Access');
	if (req.user.role === 'COMPANY' && req.user.blocked === true)
		return res.status(400).json('Company Access has been blocked');
	if (req.user.role === 'COMPANY' && req.user.suspended === true)
		return res.status(400).json('Company Access has been suspended');
	next();
}

async function accessMember(req, res, next) {
	if (req.user.role !== 'MEMBER')
		return res.status(400).json('Only Member Access');
	if (req.user.role === 'MEMBER' && req.user.blocked === true)
		return res.status(400).json('Member Access has been blocked');
	if (req.user.role === 'MEMBER' && req.user.suspended === true)
		return res.status(400).json('Member Access has been suspended');
	next();
}

async function accessCompanyAndMember(req, res, next) {
	if (req.user.role !== 'MEMBER' && req.user.role !== 'COMPANY')
		return res.status(400).json('Only Member And Company Access');
	if (req.user.blocked === true)
		return res.status(400).json('Access has been blocked');
	if (req.user.suspended === true)
		return res.status(400).json('Access has been suspended');
	next();
}

async function checkUnpaidInvoice(req, res, next) {
	const person =
		(await Admin.findById(req.user.id)) ||
		(await Subadmin.findById(req.user.id)) ||
		(await Companies.findById(req.user.id)) ||
		(await Members.findById(req.user.id).populate('company_id'));

	if (!person) {
		return res.status(400).json('Account not found.');
	}

	if (person.role === 'COMPANY' || person.role === 'MEMBER') {
		let count = 0;

		if (person.role === 'COMPANY') {
			count = await Invoices.countDocuments({
				company: person._id,
				status: false,
			});
		} else if (person.role === 'MEMBER') {
			count = await Invoices.countDocuments({
				company: person.company_id._id,
				status: false,
			});
		}

		if (count !== 0) {
			return res
				.status(400)
				.json('Pending Invoice, please clear to continue access');
		}
	}
	next();
}

const authorize = {
	verifyToken: verifyToken,
	accessAdmin: accessAdmin,
	accessCompany: accessCompany,
	accessMember: accessMember,
	accessCompanyAndMember: accessCompanyAndMember,
	checkUnpaidInvoice: checkUnpaidInvoice,
};

module.exports = authorize;
