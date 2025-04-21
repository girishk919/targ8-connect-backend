/** @format */

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const authorize = require('../../helpers/authorize');
const { dashLogger } = require('../../logger');
const Companies = require('../../models/company/company_model');
const Members = require('../../models/member/member_model');
const Admin = require('../../models/admin/admin_model');
const SubAdmin = require('../../models/sub-admin/sub_admin_model');
const Downloads = require('../../models/common/downloads_model');
const DownloadQueues = require('../../models/common/download_queue_model');
const axios = require('axios');
const subscription_validater = require('../../helpers/subscription_validator');

router.get(
	'/',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const query = {
				$or: [
					{ company: req.user.id },
					{ member: req.user.id },
					{ admin: req.user.id },
					{ subadmin: req.user.id },
				],
			};

			if (req.query.type === '0' || req.query.type === '1') {
				query['dataType'] = req.query.type;
			}

			let downloads = await Downloads.find(query).sort({ createdAt: -1 });
			return res.json(downloads);
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/oneDownloadList',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id')) ||
				(await Admin.findById(req.user.id)) ||
				(await SubAdmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			let company_id;

			if (person.role === 'COMPANY') {
				company_id = person._id;
			} else if (person.role === 'MEMBER') {
				company_id = person.company_id._id;
			} else if (person.role === 'ADMIN') {
				company_id = person._id;
			} else if (person.role === 'SUB_ADMIN') {
				company_id = person._id;
			} else {
				return res.status(400).json('Role not found!');
			}

			let download = await Downloads.findOne({
				_id: mongoose.Types.ObjectId(req.query.downloadlist_id),
			}).populate('leads');
			if (!download) return res.status(404).json('Download not found!');

			return res.json(download);
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get('/downloadQueue', [authorize.verifyToken], async (req, res) => {
	try {
		const person =
			(await Companies.findById(req.user.id)) ||
			(await Members.findById(req.user.id).populate('company_id')) ||
			(await Admin.findById(req.user.id)) ||
			(await SubAdmin.findById(req.user.id));
		if (!person) return res.status(400).json('Account not found!');

		let data = [];
		if (person.role === 'COMPANY') {
			data = await DownloadQueues.find({
				status: 'Under Verification',
				company: person._id,
			});
		} else if (person.role === 'MEMBER') {
			data = await DownloadQueues.find({
				status: 'Under Verification',
				member: person._id,
			});
		} else if (person.role === 'ADMIN') {
			data = await DownloadQueues.find({
				status: 'Under Verification',
				admin: person._id,
			});
		} else if (person.role === 'SUB_ADMIN') {
			data = await DownloadQueues.find({
				status: 'Under Verification',
				subadmin: person._id,
			});
		} else {
			return res.status(400).json('Role not found!');
		}

		if (data.length > 0) {
			var results = [];
			for (const rev of data) {
				const response = await axios.get(
					`https://bulkapi.millionverifier.com/bulkapi/v2/fileinfo?key=${process.env.MV_PRIVATE}&file_id=${rev.mvfileid}`
				);

				results.push(response?.data);
			}
			return res.json({ message: 'Fetched Successfully', data: results });
		} else {
			return res.json({ message: 'Queue is empty', data: null });
		}
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
		);
		res.status(400).json(error.message);
	}
});

router.post(
	'/edit',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const data = await Downloads.findByIdAndUpdate(
				req.body.download_id,
				req.body,
				{ new: true }
			);

			return res.json('Record Renamed Successfully!');
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

module.exports = router;
