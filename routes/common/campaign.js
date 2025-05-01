/** @format */

const express = require('express');
const router = express.Router();
const authorize = require('../../helpers/authorize');
const multer = require('multer');
const path = require('path');
const campaign_model = require('../../models/common/campaign_model');
const company_model = require('../../models/company/company_model');
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
			req.body.clientName = comp?.username;
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
			req.body.path = req.file.path;
			req.body.originalName = req.file.originalname;

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

router.get(
	'/common',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			var page = req.query.page ? Number(req.query.page) : 1;
			var limit = req.query.limit ? Number(req.query.limit) : 10;
			var skip = (page - 1) * limit;

			const data = await campaign_model.find().skip(skip).limit(limit);

			const totalCount = await campaign_model.countDocuments({});

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

router.get('/getAll', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		var page = req.query.page ? Number(req.query.page) : 1;
		var limit = req.query.limit ? Number(req.query.limit) : 10;
		var skip = (page - 1) * limit;

		const data = await campaign_model
			.find({ client: person?.clientCode })
			.skip(skip)
			.limit(limit);

		const totalCount = await campaign_model.countDocuments({
			client: person?.clientCode,
		});

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
