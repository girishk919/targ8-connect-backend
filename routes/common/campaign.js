/** @format */

const express = require('express');
const router = express.Router();
const authorize = require('../../helpers/authorize');
const multer = require('multer');
const path = require('path');
const campaign_model = require('../../models/common/campaign_model');
const company_model = require('../../models/company/company_model');
const member_model = require('../../models/member/member_model');
const uploadDir = path.join(__dirname, '../campaignFiles');

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + '-' + file.originalname);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

router.post(
	'/create',
	[authorize.verifyToken],
	upload.array('files'),
	async (req, res) => {
		try {
			function generateUniqueCode(length = 6) {
				const chars =
					'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
				let result = '';
				for (let i = 0; i < length; i++) {
					result += chars.charAt(Math.floor(Math.random() * chars.length));
				}
				return result + Date.now().toString(36); // Add timestamp to make it unique
			}

			req.body.code = generateUniqueCode();

			req.body.files = req.files.map((file, index) => ({
				path: file.path,
				originalName: file.originalname,
				specification: req.body[`specification_${index}`] || '',
			}));

			const comp = await company_model.findOne({ clientCode: req.body.client });
			req.body.company = comp?._id;

			if (req.body.member) {
				const memb = await member_model.findOne({
					clientCode: req.body.member,
				});
				req.body.memberId = memb?._id;
			}

			await campaign_model.create(req.body);
			res.status(200).json('Created Successfully');
		} catch (err) {
			console.error(err);
			res.status(500).json({ success: false, message: 'Upload failed' });
		}
	}
);

router.post(
	'/addDelivery',
	[authorize.verifyToken],
	upload.single('file'),
	async (req, res) => {
		try {
			req.body.files = [
				{
					path: req.file.path,
					originalName: req.file.originalname,
					specification: req.body[`specification_0`] || 'Delivery',
					date: new Date().toISOString(),
				},
			];

			var delivery = { ...req.body, date: new Date().toISOString() };

			const data = await campaign_model.findById(req.body.id);
			data.delivery.push(delivery);

			await data.save();

			res.status(200).json('Added Successfully');
		} catch (err) {
			console.error(err);
			res.status(500).json({ success: false, message: 'Upload failed' });
		}
	}
);

router.post(
	'/editDelivery',
	[authorize.verifyToken],
	upload.single('file'),
	async (req, res) => {
		try {
			const campaign = await campaign_model.findById(req.body.id);
			if (!campaign) {
				return res
					.status(404)
					.json({ success: false, message: 'Campaign not found' });
			}

			const delivery = campaign.delivery.find(
				(d) => d._id.toString() === req.body.delId
			);
			if (!delivery) {
				return res
					.status(404)
					.json({ success: false, message: 'Delivery not found' });
			}

			Object.entries(req.body).forEach(([key, value]) => {
				if (
					key !== 'id' &&
					key !== 'delId' &&
					!key.startsWith('specification_')
				) {
					delivery[key] = value;
				}
			});

			if (req.file) {
				const fileData = {
					path: req.file.path,
					originalName: req.file.originalname,
					specification: req.body[`specification_0`] || 'Delivery',
					date: new Date().toISOString(),
				};
				delivery.files = delivery.files || [];
				delivery.files.push(fileData);
			}

			delivery.lastUpdate = new Date().toISOString();

			await campaign.save();

			res.status(200).json('Updated Successfully');
		} catch (err) {
			console.error(err);
			res.status(500).json({ success: false, message: 'Upload failed' });
		}
	}
);

router.post(
	'/common',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			var page = req.body.pg ? Number(req.body.pg) : 1;
			var limit = req.body.lm ? Number(req.body.lm) : 10;
			var skip = (page - 1) * limit;

			var query = {};
			if (req.body.search) {
				query['name'] = { $regex: req.body.search, $options: 'i' };
			}
			if (req.body.status !== 'all') {
				query['status'] = req.body.status;
			}
			if (req.body.startDate && req.body.endDate) {
				query['$and'] = [
					{ startDate: { $gte: new Date(req.body.startDate) } },
					{ endDate: { $lte: new Date(req.body.endDate) } },
				];
			} else if (req.body.startDate) {
				query['startDate'] = { $gte: new Date(req.body.startDate) };
			} else if (req.body.endDate) {
				query['endDate'] = { $lte: new Date(req.body.endDate) };
			}
			if (req.body.clients?.length) {
				query['client'] = { $in: req.body.clients };
			}
			if (req.body.members?.length) {
				query['member'] = { $in: req.body.members };
			}

			const data = await campaign_model
				.find(query)
				.sort({ updatedAt: -1 })
				.skip(skip)
				.limit(limit)
				.populate('company')
				.populate('memberId');

			const totalCount = await campaign_model.countDocuments(query);

			var pages = Math.ceil(totalCount / limit);

			return res.json({
				pages,
				totalPages: pages,
				totalCount,
				data: [data, data.length],
			});
		} catch (err) {
			console.error(err);
			res.status(500).json({ success: false, message: 'Something went wrong' });
		}
	}
);

router.post('/getAll', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		var page = req.body.pg ? Number(req.body.pg) : 1;
		var limit = req.body.lm ? Number(req.body.lm) : 10;
		var skip = (page - 1) * limit;

		var query = { client: person?.clientCode };
		if (req.body.search) {
			query['name'] = { $regex: req.body.search, $options: 'i' };
		}
		if (req.body.status !== 'all') {
			query['status'] = req.body.status;
		}
		if (req.body.startDate) {
			query['startDate'] = { $gte: new Date(req.body.startDate) };
		}
		if (req.body.endDate) {
			query['endDate'] = { $lte: new Date(req.body.endDate) };
		}
		if (req.body.members?.length) {
			query['member'] = { $in: req.body.members };
		}

		const data = await campaign_model
			.find(query)
			.sort({ updatedAt: -1 })
			.skip(skip)
			.limit(limit)
			.populate('company')
			.populate('memberId');

		const totalCount = await campaign_model.countDocuments(query);

		var pages = Math.ceil(totalCount / limit);

		return res.json({
			pages,
			totalPages: pages,
			totalCount,
			data: [data, data.length],
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Something went wrong' });
	}
});

router.get('/single/:id', [authorize.verifyToken], async (req, res) => {
	try {
		const campaign = await campaign_model.findById(req.params.id);

		return res.json({ message: 'Fetched Successfully', data: campaign });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Something went wrong' });
	}
});

router.patch(
	'/changeStatus',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			await campaign_model.findByIdAndUpdate(req.body.id, {
				$set: { status: req.body.status },
			});

			return res.json('Updated Successfully');
		} catch (err) {
			console.error(err);
			res.status(500).json({ success: false, message: 'Something went wrong' });
		}
	}
);

module.exports = router;
