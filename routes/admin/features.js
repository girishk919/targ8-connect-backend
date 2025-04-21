/** @format */

const express = require('express');

const router = express.Router();

const authorize = require('../../helpers/authorize');

const Admins = require('../../models/admin/admin_model');
const Features = require('../../models/admin/features_model');

router.post(
	'/add',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			if (req.body.description == null)
				return res.status(400).json('Description is required!');
			if (req.body.description === '')
				return res.status(400).json('Description is required!');
			if (req.body.description.length < 4)
				return res
					.status(400)
					.json('Description should be at least 4 characters!');

			const admin = await Admins.findById(req.user.id);
			if (!admin) return res.status(404).json('Admin not found!');

			const feature1 = await Features.findOne({
				description: req.body.description,
			});
			if (feature1) return res.status(400).json('This feature already exists');

			const addFeature = new Features({
				description: req.body.description,
			});

			await addFeature.save();

			return res.json('Feature Added!');
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			// const admin = await Admins.findById(req.user.id);
			// if(!admin) return res.status(404).json("Admin not found!");

			const features = await Features.find();

			return res.json(features);
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/getOne',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			if (req.query.feature_id == null)
				return res.status(400).json('Feature Id is required!');
			if (req.query.feature_id === '')
				return res.status(400).json('Feature Id is required!');

			// const admin = await Admins.findById(req.user.id);
			// if(!admin) return res.status(404).json("Admin not found!");

			const feature = await Features.findById(req.query.feature_id);
			if (!feature) return res.status(404).json('Feature not found!');

			return res.json(feature);
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.delete(
	'/',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			if (req.query.feature_id == null)
				return res.status(400).json('Feature Id is required!');
			if (req.query.feature_id === '')
				return res.status(400).json('Feature Id is required!');

			const admin = await Admins.findById(req.user.id);
			if (!admin) return res.status(404).json('Admin not found!');

			const feature = await Features.findById(req.query.feature_id);
			if (!feature) return res.status(404).json('Feature not found!');

			await feature.remove();

			return res.json('Feature deleted!');
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

module.exports = router;
