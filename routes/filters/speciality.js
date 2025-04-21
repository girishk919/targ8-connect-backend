/** @format */

const express = require('express');
const Speciality = require('../../models/filters/speciality');
const SpecialityType = require('../../models/filters/specialityType');
const SpecialityGroup = require('../../models/filters/specialityGroup');
const Spty = require('../../models/filters/spty');
const router = express.Router();

router.post('/getSpty', async (req, res) => {
	try {
		var query = [];
		if (req.body.SpecialtyGroup1) {
			let myRegex = req.body.SpecialtyGroup1.map(function (e) {
				return new RegExp(e, 'i');
			});
			query.push({
				SpecialtyGroup1: {
					$in: myRegex,
				},
			});
		}
		if (req.body.common) {
			const data = await Spty.find({
				$or: [
					{
						Specialty: {
							$regex: req.body.common,
							$options: 'i',
						},
					},
					{
						SpecialtyGroup1: {
							$regex: req.body.common,
							$options: 'i',
						},
					},
				],
			}).limit(100);
			return res.status(200).json(data);
		}
		if (req.body.Specialty) {
			let myRegex2 = req.body.Specialty.map(function (e) {
				return new RegExp(e, 'i');
			});
			query.push({
				Specialty: {
					$in: myRegex2,
				},
			});
			//query['Specialty'] = { $regex: req.query.Specialty, $options: 'i' };
		}
		if (query.length === 0) {
			const data = await Spty.find().limit(100);
			return res.status(200).json(data);
		} else {
			const data = await Spty.find({ $and: query }).limit(100);
			return res.status(200).json(data);
		}
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.post('/getSptyGroup', async (req, res) => {
	try {
		var query = [];
		// if (req.query.Country) {
		// 	query['Country'] = { $regex: req.query.Country, $options: 'i' };
		// }
		if (req.body.SpecialtyGroup1) {
			let myRegex = req.body.SpecialtyGroup1.map(function (e) {
				return new RegExp(e, 'i');
			});
			query.push({
				SpecialtyGroup1: {
					$in: myRegex,
				},
			});
		}
		const data = await Spty.find({ $and: query }).distinct('SpecialtyGroup1');

		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getSpeciality', async (req, res) => {
	try {
		var query = {};
		let data = [];
		data = await Speciality.aggregate([
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
		]).limit(50);
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

router.get('/getSpType', async (req, res) => {
	try {
		var query = {};
		if (req.query.name) {
			query['name'] = { $regex: req.query.name, $options: 'i' };
		}
		const data = await SpecialityType.find(query).limit(50);
		return res.status(200).json({ data });
	} catch (error) {
		return res.status(400).json('There was some error!' + error);
	}
});

router.get('/getSpGroup', async (req, res) => {
	try {
		var query = {};
		let data = [];
		data = await SpecialityGroup.aggregate([
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
		]).limit(50);
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

module.exports = router;
