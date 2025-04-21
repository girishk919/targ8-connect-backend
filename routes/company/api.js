/** @format */

const express = require('express');
const { verifyToken } = require('../../helpers/authorize');
const company_model = require('../../models/company/company_model');
const CryptoJS = require('crypto-js');
const api_history_model = require('../../models/company/api_history_model');
const integrate_key_model = require('../../models/company/integrate_key_model');
const { default: axios } = require('axios');

const router = express.Router();

router.get('/myAPIKey', verifyToken, async (req, res) => {
	try {
		if (req.person.api_key) {
			return res.status(200).json({ key: req.person.api_key });
		} else {
			const apiKey = CryptoJS.lib.WordArray.random(16).toString(
				CryptoJS.enc.Hex
			);

			await company_model.findByIdAndUpdate(req.person._id, {
				$set: { api_key: apiKey },
			});
			return res.status(200).json({ key: apiKey });
		}
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.get('/rotateAPIKey', verifyToken, async (req, res) => {
	try {
		const apiKey = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);

		await company_model.findByIdAndUpdate(req.person._id, {
			$set: { api_key: apiKey },
		});
		return res.status(200).json({ key: apiKey });
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.get('/apiHistory', verifyToken, async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		var page = req.query.page ? Number(req.query.page) : 1;
		var limit = req.query.limit ? Number(req.query.limit) : 10;
		var skip = (page - 1) * limit;

		const totalCount = await api_history_model.countDocuments({
			company: req.person._id.toString(),
		});
		const data = await api_history_model
			.find({ company: req.person._id.toString() })
			.sort({ date: -1 })
			.skip(skip)
			.limit(limit);

		const totalPages = Math.ceil(totalCount / limit);

		return res.json({
			totalPages,
			totalCount,
			data,
		});
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.post('/addAPIKey', verifyToken, async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		const { apiKey, title, comments } = req.body;

		// Check if API key already exists
		const findKey = await integrate_key_model.findOne({
			apiKey,
			title,
			company: person._id.toString(),
		});
		if (findKey) {
			return res
				.status(400)
				.json({ success: false, msg: `${title} already connected.` });
		}

		if (req.body.title === 'Million Verifier') {
			try {
				const response = await axios.get(
					`https://api.millionverifier.com/api/v3/credits?api=${apiKey}`
				);

				// If the API response is invalid, return an error
				if (!response.data || response.data.credits === undefined) {
					return res
						.status(400)
						.json({ success: false, msg: 'Invalid API key!' });
				}
			} catch (error) {
				return res
					.status(400)
					.json({ success: false, msg: 'Invalid API key or API error!' });
			}
		} else if (req.body.title === 'Zero Bounce') {
			try {
				const response = await axios.get(
					`https://api.zerobounce.net/v2/getcredits?api_key=${apiKey}`
				);

				// If the API response is invalid, return an error
				if (response?.data?.Credits < 0) {
					return res
						.status(400)
						.json({ success: false, msg: 'Invalid API key!' });
				}
			} catch (error) {
				return res
					.status(400)
					.json({ success: false, msg: 'Invalid API key or API error!' });
			}
		} else if (req.body.title === 'Never Bounce') {
			try {
				const response = await axios.get(
					`https://api.neverbounce.com/v4.2/account/info?key=${apiKey}`
				);

				// If the API response is invalid, return an error
				if (response?.data?.status !== 'success') {
					return res
						.status(400)
						.json({ success: false, msg: 'Invalid API key!' });
				}
			} catch (error) {
				return res
					.status(400)
					.json({ success: false, msg: 'Invalid API key or API error!' });
			}
		} else if (req.body.title === 'DeBounce') {
			try {
				const response = await axios.get(
					`https://api.debounce.io/v1/usage/?api=${apiKey}`
				);

				// If the API response is invalid, return an error
				if (response?.data?.success !== '1') {
					return res
						.status(400)
						.json({ success: false, msg: 'Invalid API key!' });
				}
			} catch (error) {
				return res
					.status(400)
					.json({ success: false, msg: 'Invalid API key or API error!' });
			}
		} else if (req.body.title === 'Email List Verify') {
			try {
				await axios.get('https://api.emaillistverify.com/api/credits', {
					headers: { 'x-api-key': apiKey },
				});
			} catch (error) {
				return res
					.status(400)
					.json({ success: false, msg: 'Invalid API key or API error!' });
			}
		}

		await integrate_key_model.create({
			apiKey,
			title,
			comments,
			date: new Date().toISOString(),
			company: person._id.toString(),
		});

		return res.json('Connected Successfully');
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.get('/getConnectedKeys', verifyToken, async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		const data = await integrate_key_model.find({
			company: person._id.toString(),
		});

		return res.json({ data });
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.get('/getConnectedKey', verifyToken, async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		const data = await integrate_key_model.findOne({
			title: decodeURIComponent(req.query.title),
			company: person._id.toString(),
		});

		return res.json({ data });
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.get('/disconnectKey', verifyToken, async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		await integrate_key_model.deleteOne({
			title: decodeURIComponent(req.query.title),
			company: person._id.toString(),
		});

		return res.json('Disconnected Successfully');
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

module.exports = router;
