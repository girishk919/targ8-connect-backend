/** @format */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//const sgMail = require('@sendgrid/mail');
const requestIp = require('request-ip');
const CompanyActivities = require('../../models/company/activity_log_model');
const MemberActivities = require('../../models/member/activity_log_model');
const AdminActivities = require('../../models/admin/activity_log_model');
const BlackList = require('../../models/common/blacklist_model');
const SubAdmins = require('../../models/sub-admin/sub_admin_model');

const router = express.Router();

const authorize = require('../../helpers/authorize');
const { dashLogger } = require('../../logger');

const Admins = require('../../models/admin/admin_model');
const Companies = require('../../models/company/company_model');
const Members = require('../../models/member/member_model');
const ResetPassword = require('../../models/common/reset_password_model');

const loginValidation = require('../../validations/common/login_validation');
const resetPasswordValidation = require('../../validations/common/reset_password_validation');
const captchaVerifier = require('./captchaVerification');

//sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const nodemailer = require('nodemailer');
let transport = nodemailer.createTransport({
	pool: true,
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: process.env.EMAIL_USERNAME,
		pass: process.env.EMAIL_PASSWORD,
	},
});

router.post('/login', captchaVerifier, async (req, res) => {
	//const { error } = loginValidation.validate(req.body);
	//if (error) return res.status(400).json(error.details[0].message);

	try {
		const email = req.body.email.toLowerCase();
		const person =
			(await Admins.findOne({ email: email })) ||
			(await Companies.findOne({ username: email })) ||
			(await Members.findOne({ username: email }).populate('company_id')) ||
			(await SubAdmins.findOne({ email: email }));
		if (!person) return res.status(400).json('User does not exists!');

		const auth = await bcrypt.compare(req.body.password, person.password);
		if (!auth) return res.status(400).json('Incorrect password!');

		if (person.role === 'COMPANY' && person.suspended) {
			return res.status(400).json('Account is suspended!');
		}
		if (person.role === 'COMPANY' && person.blocked) {
			return res.status(400).json('Account is blocked!');
		}
		if (person.role === 'COMPANY' && person.isCancelled) {
			return res.status(400).json('Contact Support!');
		}

		if (person.role === 'MEMBER') {
			if (person.blocked) {
				return res.status(400).json('Account is blocked!');
			}

			if (person.company_id.blocked) {
				return res.status(400).json('Company Account is blocked!');
			}
			if (person.suspended) {
				return res.status(400).json('Account is suspended!');
			}

			if (person.company_id.suspended) {
				return res.status(400).json('Company Account is suspended!');
			}
			if (person.company_id.isCancelled) {
				return res.status(400).json('Contact Support!');
			}
		}
		// if (person.isLoggedIn) {
		//   return res.status(401).json("The account is already Logged in. !");
		// }

		if (person.lastSession?.trim().length > 0) {
			const blacklisted = await BlackList.create({ token: person.lastSession });
		}

		const sessionDetails = {
			id: person._id,
			username: person.username,
			name: person.name,
			role: person.role,
		};

		let access_token;

		if (req.body.remember_me == true) {
			access_token = jwt.sign(sessionDetails, process.env.JWT_SECRET_KEY);
		} else {
			access_token = jwt.sign(sessionDetails, process.env.JWT_SECRET_KEY, {
				expiresIn: '24h',
			});
			refresh_token = jwt.sign(sessionDetails, process.env.JWT_SECRET_KEY, {
				expiresIn: '24h',
			});
		}

		let expiryDate = new Date();
		expiryDate.setSeconds(expiryDate.getSeconds() + 86400);

		person.login_ip = requestIp.getClientIp(req);
		person.browserType = req.body.browserType;
		person.location = req.body.location;
		person.last_login = new Date();
		// person.isLoggedIn = true;
		person.lastSession = access_token;

		// var checkDate = new Date().toISOString().split('T')[0];
		// if (person.profileCheckDate !== checkDate) {
		// 	person.profileCheckDate = checkDate;
		// 	person.profileVisit = 20;
		// }

		await person.save();

		const data = {
			message: 'Login Successful!',
			remember_me: req.body.remember_me,
			access_token: access_token,
			refresh_token: refresh_token,
		};

		// var today = new Date().toLocaleDateString('en-us', {
		// 	year: 'numeric',
		// 	month: 'long',
		// 	day: 'numeric',
		// });

		// if (person.role === 'ADMIN') {
		// 	await AdminActivities.create({
		// 		person: person._id,
		// 		role: 'ADMIN',
		// 		heading: 'Login Successfully',
		// 		message: `Account have login at ${today}!`,
		// 	});
		// }
		// if (person.role === 'SUB_ADMIN') {
		// 	await AdminActivities.create({
		// 		person: person._id,
		// 		role: 'SUB_ADMIN',
		// 		heading: 'Login Successfully',
		// 		message: `Account have login at ${today}!`,
		// 	});
		// }
		// if (person.role === 'COMPANY') {
		// 	await CompanyActivities.create({
		// 		company: person._id,
		// 		heading: 'Login Successfully',
		// 		message: `Account have login at ${today}!`,
		// 	});
		// }
		// if (person.role === 'MEMBER') {
		// 	await MemberActivities.create({
		// 		member: person._id,
		// 		company: person.company_id._id,
		// 		heading: 'Login Successfully',
		// 		message: `Account have login at ${today}!`,
		// 	});
		// }

		return res.json(data);
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		return res.status(400).json({ error: error.message });
	}
});

router.patch('/clear_sessions', async (req, res) => {
	try {
		const person =
			(await Admins.findOne({ email: req.body.email })) ||
			(await Companies.findOne({ email: req.body.email })) ||
			(await Members.findOne({ email: req.body.email }).populate(
				'company_id'
			)) ||
			(await SubAdmins.findOne({ email: req.body.email }));

		if (!person) return res.status(400).json('Account not found!');
		if (!person.isLoggedIn) {
			return res.status(200).json('All sessions cleared !');
		}

		const auth = await bcrypt.compare(req.body.password, person.password);
		if (!auth) return res.status(400).json('Wrong password!');

		person.isLoggedIn = false;
		await person.save();

		res.status(200).json('Successfully cleared other sessions !');
	} catch (err) {
		dashLogger.error(
			`Error : ${err}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(err.message);
	}
});

router.post('/forgotPassword', async (req, res) => {
	try {
		if (req.body.email == null)
			return res.status(400).json('Email is required!');
		if (req.body.email === '')
			return res.status(400).json('Email cannot be empty!');
		if (req.body.email.length < 6)
			return res.status(400).json('Email has to be at least 6 characters!');
		if (!req.body.email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/))
			return res.status(400).json('Email should be a valid email!');

		const person =
			(await Admins.findOne({ email: req.body.email })) ||
			(await Companies.findOne({ email: req.body.email })) ||
			(await Members.findOne({ email: req.body.email }));
		if (!person) return res.status(400).json('Account not found!');

		if (person.role === 'COMPANY' && person.provider !== 'email') {
			return res.status(400).json(`Account exists with ${person.provider}.`);
		}

		await ResetPassword.findOneAndDelete({
			person_id: person._id,
		});
		// if (dupliReset) return res.status(400).json('Reset already requested!');

		const addResetRequest = new ResetPassword({
			person_id: person._id,
		});

		const new_reset_request = await addResetRequest.save();

		// const msg = {
		// 	to: person.email,
		// 	from: 'no-reply@healthdbi.com',
		// 	subject: 'HealthDbi Reset Password',
		// 	html: `<strong><center>Click here to Reset Password<br /><a href="${process.env.FrontendURL}/resetpassword/${new_reset_request._id}">Click Here</a></center></strong>`,
		// };
		const msg = {
			to: person.email,
			from: process.env.EMAIL_USERNAME,
			subject: `You just requested a password reset`,
			html: `<p>Please reset your password by clicking this <a href="${process.env.FrontendURL}/resetpassword/${new_reset_request._id}">Link.</a></p><br />
			<p>If you have not requested one, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
			<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
		};

		// sgMail
		// 	.send(msg)
		// 	.then(() => res.json('Reset Password Link Mailed!'))
		// 	.catch((err) => res.status(400).json('Error: ' + err));
		transport.sendMail(msg, (err, info) => {
			if (err) {
				res.status(400).json('Error: ' + err);
			} else {
				res.json('Reset Password Link Mailed!');
			}
		});
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.post('/resetPassword', async (req, res) => {
	const { error } = resetPasswordValidation.validate(req.body);
	if (error) return res.status(400).json(error.details[0].message);

	try {
		if (req.body.password !== req.body.confirm_password)
			return res.status(400).json('Passwords do not match!');

		const reset_id = mongoose.Types.ObjectId(req.body.reset_id);

		const resetRecord = await ResetPassword.findById(reset_id);
		if (!resetRecord)
			return res.status(400).json('Reset password request not found!');

		const person =
			(await Admins.findById(resetRecord.person_id)) ||
			(await Companies.findById(resetRecord.person_id)) ||
			(await Members.findById(resetRecord.person_id));
		if (!person) return res.status(400).json('Account not found!');

		const salt = await bcrypt.genSalt(10);
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		person.password = hashPassword;

		await person.save();

		await resetRecord.remove();

		return res.json('Password changed!');
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.delete('/logout', async (req, res) => {
	try {
		const addBlackList = new BlackList({
			token: req.headers.token,
		});

		addBlackList
			.save()
			.then(() => res.json('You have been logged out!'))
			.catch((err) => res.status(400).json('Error: ' + err));
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.post('/refresh_token', async (req, res) => {
	try {
		if (!req.body.refresh_token) {
			return res.status(400).json('Refresh Token is required !');
		}

		try {
			var refresh_token = jwt.verify(
				req.body.refresh_token,
				process.env.JWT_SECRET_KEY
			);
		} catch (err) {
			return res.status(401).json('Invalid Token');
		}
		if (!refresh_token) {
			return res
				.status(401)
				.json('Refresh Token Expired , please sign in again !');
		}

		const access_token = jwt.sign(refresh_token, process.env.JWT_SECRET_KEY, {
			expiresIn: '24h',
		});
		res.status(200).json({ access_token: access_token });
	} catch (err) {
		dashLogger.error(
			`Error : ${err}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(err.message);
	}
});

module.exports = router;
