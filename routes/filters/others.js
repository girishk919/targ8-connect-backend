/** @format */

const express = require('express');
const Title = require('../../models/filters/title');
const HospitalType = require('../../models/filters/hospitalType');
const FirmType = require('../../models/filters/firmType');
const Ownership = require('../../models/filters/ownership');
const Leads = require('../../models/admin/leads_model');
const LicenseStates = require('../../models/filters/licenseState');

const router = express.Router();

router.get('/getTitle', async (req, res) => {
	try {
		var query = [];
		// let data = [];
		// data = await Title.aggregate([
		// 	{
		// 		$group: {
		// 			_id: '$name',
		// 			uniqueIds: { $addToSet: '$_id' },
		// 			count: { $sum: 1 },
		// 		},
		// 	},
		// 	{ $match: { _id: { $ne: null }, count: { $gt: 1 } } },
		// 	{ $sort: { count: -1 } },
		// 	{ $project: { name: '$_id' } },
		// ]).limit(100);
		// if (req.query.name) {
		// 	query['name'] = { $regex: req.query.name, $options: 'i' };
		// 	const filteredData = data.filter((el) => {
		// 		return el.name.toLowerCase().includes(req.query.name.toLowerCase());
		// 	});
		// 	return res.status(200).json({ data: filteredData });
		// } else {
		// 	return res.status(200).json({ data });
		// }
		if (req.query.name) {
			// let myRegex = req.body.name.map(function (e) {
			// 	return new RegExp(e, 'i');
			// });
			query.push({
				$or: [
					{
						name: { $regex: req.query.name, $options: 'i' },
					},
					{
						abb: { $regex: req.query.name, $options: 'i' },
					},
				],
			});
			//query['name'] = { $regex: req.query.name, $options: 'i' };
		}
		if (query.length > 0) {
			var data = await Title.find({ $and: query }).limit(20);
			return res.status(200).json({ data });
		}
		var data = await Title.find().limit(100);
		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getHosType', async (req, res) => {
	try {
		var query = {};
		// let data = [];
		// data = await HospitalType.aggregate([
		//   {
		//     $group: {
		//       _id: "$name",
		//       uniqueIds: { $addToSet: "$_id" },
		//       count: { $sum: 1 },
		//     },
		//   },
		//   { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
		//   { $sort: { count: -1 } },
		//   { $project: { name: "$_id" } },
		// ]).limit(100);

		if (req.query.name) {
			query['name'] = { $regex: req.query.name, $options: 'i' };
		}
		// const filteredData = data.filter((el) => {
		//   return el.name.toLowerCase().includes(req.query.name.toLowerCase());
		// });
		//   return res.status(200).json({ data: filteredData });
		// } else {
		//   return res.status(200).json({ data });
		// }
		const data = await HospitalType.find(query);
		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getFirmType', async (req, res) => {
	try {
		var query = {};

		if (req.query.name) {
			query['name'] = { $regex: req.query.name, $options: 'i' };
		}
		const data = await FirmType.find(query);
		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getOwnership', async (req, res) => {
	try {
		var query = {};
		if (req.query.name) {
			query['name'] = { $regex: req.query.name, $options: 'i' };
		}
		const data = await Ownership.find(query);
		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getLicenseStates', async (req, res) => {
	try {
		var query = {};
		// let data = [];
		// data = await LicenseStates.aggregate([
		// 	{
		// 		$group: {
		// 			_id: '$name',
		// 			uniqueIds: { $addToSet: '$_id' },
		// 			count: { $sum: 1 },
		// 		},
		// 	},
		// 	{ $match: { _id: { $ne: '' || null }, count: { $gt: 1 } } },
		// 	{ $sort: { count: -1 } },
		// 	{ $project: { name: '$_id' } },
		// ]);
		if (req.query.name) {
			query['name'] = { $regex: req.query.name, $options: 'i' };
		}
		// const filteredData = data.filter((el) => {
		// 	return el.name.toLowerCase().includes(req.query.name.toLowerCase());
		// });
		// return res.status(200).json({ data: filteredData });
		// } else {
		// 	return res.status(200).json({ data });
		// }
		const data = await LicenseStates.find(query);
		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

module.exports = router;
