/** @format */

const axios = require('axios');
const { dashLogger } = require('../../logger');

const captchaVerifier = async (req, res, next) => {
	try {
		if (!req.body.captcha_token) {
			return res.status(400).json('captcha_token required!');
		}
		const options = {
			secret: process.env.CAPTCHA_SECRET,
			response: req.body.captcha_token,
		};

		const result = await axios.post(
			`https://www.google.com/recaptcha/api/siteverify?secret=${options.secret}&response=${options.response}`
		);

		if (result.data.success) {
			delete req.body.captcha_token;
			next();
		} else
			return res
				.status(401)
				.json({ access: false, message: 'Human verification failed' });
	} catch (err) {
		dashLogger.error(
			`Error : ${err}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(401).json({ message: 'Human verification failed !', err });
	}
};

module.exports = captchaVerifier;
