/** @format */

const express = require('express');
const States = require('../../models/filters/state');
const City = require('../../models/filters/cities');
const Zipcode = require('../../models/filters/zipcode');
const Country = require('../../models/filters/country');
const Leads = require('../../models/admin/leads_model');
const Location = require('../../models/filters/location');

const router = express.Router();

router.post('/getLocation', async (req, res) => {
	try {
		var query = [];
		if (req.body.State) {
			let myRegex = req.body.State.map(function (e) {
				return new RegExp(e, 'i');
			});
			query.push({
				State: {
					$in: myRegex,
				},
			});
		}
		if (req.body.City) {
			let myRegex2 = req.body.City.map(function (e) {
				return new RegExp(e, 'i');
			});
			query.push({
				City: {
					$in: myRegex2,
				},
			});
		}
		const data = await Location.find({ $and: query }).limit(100);

		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.post('/getLocationState', async (req, res) => {
	try {
		var query = [];
		// if (req.query.Country) {
		// 	query['Country'] = { $regex: req.query.Country, $options: 'i' };
		// }
		if (req.body.State) {
			let myRegex = req.body.State.map(function (e) {
				return new RegExp(e, 'i');
			});
			query.push({
				$or: [
					{
						State: {
							$in: myRegex,
						},
					},
					{
						StateAbb: {
							$in: myRegex,
						},
					},
				],
			});
		}
		const data = await Location.find({ $and: query }).distinct('State');

		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getStates', async (req, res) => {
	try {
		var query = {};
		let data = [];
		data = await States.aggregate([
			{
				$group: {
					_id: '$name',
					uniqueIds: { $addToSet: '$_id' },
					count: { $sum: 1 },
				},
			},
			{ $match: { _id: { $ne: null }, count: { $gt: 1 } } },
			{ $sort: { count: -1 } },
			{ $project: { name: '$_id' } },
		]);
		if (req.query.name) {
			query['name'] = { $regex: req.query.name, $options: 'i' };
			const filteredData = data.filter((el) => {
				return el.name.toLowerCase().includes(req.query.name.toLowerCase());
			});
			return res.status(200).json({ data: filteredData });
		} else {
			return res.status(200).json({ data });
		}
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getCities', async (req, res) => {
	try {
		var query = {};
		var data = [];
		data = await City.aggregate([
			{
				$group: {
					_id: '$name',
					uniqueIds: { $addToSet: '$_id' },
					count: { $sum: 1 },
				},
			},
			{ $match: { _id: { $ne: null }, count: { $gt: 1 } } },
			{ $sort: { count: -1 } },
			{ $project: { name: '$_id' } },
		]);
		if (req.query.name) {
			query['name'] = { $regex: req.query.name, $options: 'i' };
			const filteredData = data.filter((el) => {
				return el.name.toLowerCase().includes(req.query.name.toLowerCase());
			});
			return res.status(200).json({ data: filteredData });
		} else {
			return res.status(200).json({ data });
		}
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getZipCode', async (req, res) => {
	try {
		// await Zipcode.deleteMany();
		// const leads = await Leads.find().distinct('ZIPCode');
		// for (const rev of leads) {
		// 	const find = await Zipcode.findOne({ name: rev });
		// 	if (!find) {
		// 		await Zipcode.create({ name: rev });
		// 	}
		// }

		var query = {};
		if (req.query.name) {
			var name = '^' + req.query.name.toString();
			query['name'] = { $regex: name, $options: 'im' };
		}
		const data = await Zipcode.find(query).limit(50);
		return res.status(200).json({ data });
		// if (req.query.name) {
		// 	query['name'] = { $regex: req.query.name, $options: 'i' };
		// 	const filteredData = data.filter((el) => {
		// 		return el.name.toLowerCase().includes(req.query.name.toLowerCase());
		// 	});

		// } else {
		// 	return res.status(200).json({ data });
		// }
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getCountry', async (req, res) => {
	try {
		var query = {};
		if (req.query.name) {
			query['name'] = { $regex: req.query.name, $options: 'i' };
		}
		const data = await Country.find(query);
		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/all', async (req, res) => {
	try {
		const data = await Location.find();

		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

module.exports = router;
