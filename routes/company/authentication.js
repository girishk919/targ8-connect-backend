/** @format */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const requestIp = require('request-ip');
//const sgMail = require('@sendgrid/mail');

const router = express.Router();

const TempCompanies = require('../../models/company/tempCompany_model');
const Activities = require('../../models/company/activity_log_model');
const Companies = require('../../models/company/company_model');
const Admins = require('../../models/admin/admin_model');
const Members = require('../../models/member/member_model');
const SubAdmins = require('../../models/sub-admin/sub_admin_model');
const BlackList = require('../../models/common/blacklist_model');
const Plans = require('../../models/company/plans_model');
const zohoController = require('../../controllers/zoho/zoho.controllers');
const registerValidation = require('../../validations/company/register_validation');
const captchaVerifier = require('../common/captchaVerification');
const ZohoAuth = require('../../models/Zoho/auth_model');
const blocked_model = require('../../models/company/blocked_model');
const axios = require('axios');
const { dashLogger } = require('../../logger');

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
	tls: {
		rejectUnauthorized: false,
	},
	maxConnections: 5,
	maxMessages: 100,
});

async function isDisposableEmail(email) {
	const apiKey = process.env.ZERO_BOUNCE_KEY;
	const url = `https://api.zerobounce.net/v2/validate`;

	try {
		const response = await axios.get(url, {
			params: {
				api_key: apiKey,
				email,
			},
		});

		const { status } = response.data;

		if (status === 'valid' || status === 'catch-all') {
			return { valid: true };
		} else {
			return { valid: false };
		}
	} catch (error) {
		console.error('Error during email validation:', error.message);
		return { valid: false, reason: 'Validation service error.' };
	}
}

router.post('/register', captchaVerifier, async (req, res) => {
	const { error } = registerValidation.validate(req.body);
	if (error) return res.status(400).json(error.details[0].message);

	try {
		const email = req.body.email.toLowerCase();
		if (req.body.password !== req.body.confirm_password)
			return res.status(400).json('Passwords do not match!');

		// const company1 = await Companies.findOne({
		// 	company_name: req.body.company_name,
		// });
		// if (company1)
		// 	return res.status(400).json('Company with this name already exists!');

		// const company3 = await TempCompanies.findOne({
		// 	company_name: req.body.company_name,
		// });
		// if (company3)
		// 	return res.status(400).json('Company with this name already exists!');

		const company2 = await Companies.findOne({ email: email });
		if (company2)
			return res.status(400).json('Company with this email already exists!');

		const company4 = await TempCompanies.findOneAndDelete({
			email: email,
		});
		// if (company4)
		// 	return res.status(400).json('Company with this email already exists!');

		// const company5 = await Companies.findOne({ mobile: req.body.mobile });
		// if(company5) return res.status(400).json("Company with this mobile already exists!");

		// const company6 = await TempCompanies.findOne({ mobile: req.body.mobile });
		// if(company6) return res.status(400).json("Company with this mobile already exists!");

		const company7 = await Admins.findOne({ email: email });
		if (company7) return res.status(400).json('Email already exists!');

		const company8 = await Members.findOne({ email: email });
		if (company8) return res.status(400).json('Email already exists!');

		const company9 = await SubAdmins.findOne({ email: email });
		if (company9) return res.status(400).json('Email already exists!');

		const firstEmail = email.split('@');
		const blocked_list = await blocked_model.findOne({
			address: firstEmail[1],
		});
		if (blocked_list) {
			return res.status(400).json(`${firstEmail[1]} access has been blocked`);
		}
		if (firstEmail[1] === 'gmail.com' || firstEmail[1] === 'yahoo.com') {
			return res
				.status(400)
				.json(
					`This email address cannot be used. Please use a business email address.`
				);
		}

		const salt = await bcrypt.genSalt(10);
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		if (req.body.mobile !== '') {
			if (Number(req.body.mobile) === 0) {
			} else if (!Number(req.body.mobile)) {
				return res
					.status(400)
					.json(`Only numbers are allowed in mobile field.`);
			}
		}

		const checkDis = await isDisposableEmail(email);

		if (!checkDis.valid) {
			return res
				.status(400)
				.json(
					`This email address cannot be used. Please use a business email address.`
				);
		}

		let addTempCompany;
		if (req.body.fpr && req.body.fpr !== '') {
			addTempCompany = new TempCompanies({
				name: req.body.name,
				email: email,
				mobile: req.body.mobile === '' ? 0 : req.body.mobile,
				company_name: req.body.company_name,
				password: hashPassword,
				fpr: req.body.fpr,
				isEmailVerified: false,
				planId: req.body.planId ? req.body.planId : null,
				isAnnual: req.body.isAnnual === true ? true : false,
				planType: req.body.planType,
			});
		} else {
			addTempCompany = new TempCompanies({
				name: req.body.name,
				email: email,
				mobile: req.body.mobile === '' ? 0 : req.body.mobile,
				company_name: req.body.company_name,
				password: hashPassword,
				isEmailVerified: false,
				planId: req.body.planId ? req.body.planId : null,
				isAnnual: req.body.isAnnual === true ? true : false,
				planType: req.body.planType,
			});
		}

		const temp_company = await addTempCompany.save();

		const now = new Date();
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const currentTime = `${hours}:${minutes}`;

		const msg = {
			to: temp_company.email,
			from: process.env.EMAIL_USERNAME,
			//bcc: 'girishk919@gmail.com',
			subject: `Verify your EmailAddress.ai account - [${currentTime}]`,
			html: `<p>Thank you for signing up with EmailAddress.ai.</p><br />
			<p>To complete the setup, please verify your email by clicking on this
			<a href="${process.env.BackendURL}/company/auth/activate?email=${temp_company.email}">Link.</a></p><br />
			<p>In case, you are having trouble, you can also copy and paste this link in your browser:</p><br/>
			<p>Look forward to having you onboard.</p><br />
			<p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><p>EmailAddress.ai</p>`,
		};

		transport.sendMail(msg, (err, info) => {
			if (err) {
				console.log(err);
				res.status(400).json('Error: ' + err);
			} else {
				res.json('Account Activation Mail Sent!');
			}
		});
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.get('/activate', async (req, res) => {
	try {
		if (!req.query.email) {
			return res.redirect(`${process.env.FrontendURL}/link?issue=invalid`);
		}

		const temp_company = await TempCompanies.findOne({
			email: req.query.email,
		});
		if (!temp_company) {
			const company = await Companies.findOne({ email: req.query.email });
			if (company) {
				return res.redirect(`${process.env.FrontendURL}/link?issue=exists`);
			} else {
				return res.redirect(`${process.env.FrontendURL}/link?issue=invalid`);
			}
		}

		// let date = new Date();
		// date.setDate(date.getDate() + 7);

		// date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		// const newPlan = new Plans({
		// 	subscription_end_date: date,
		// });

		// const genPlan = await newPlan.save();

		const addCompany = new Companies({
			name: temp_company.name,
			email: temp_company.email,
			mobile: temp_company.mobile,
			company_name: temp_company.company_name,
			// plan: genPlan,
			planType: 'PYG',
			password: temp_company.password,
			isEmailVerified: true,
			// is_internal_user: false,
			// upload_limit: 5000,
		});

		if (temp_company.fpr && temp_company.fpr !== '') {
			//First Promotor
			await axios.post(
				'https://firstpromoter.com/api/v1/track/signup',
				{
					email: addCompany.email,
					ref_id: temp_company.fpr,
				},
				{
					headers: {
						'x-api-key': `${process.env.FPROM_KEY}`,
						'Content-Type': 'application/json',
					},
				}
			);
		}

		//Zoho
		const sessionDetails = {
			id: addCompany._id,
			name: addCompany.name,
			role: 'COMPANY',
		};

		let access_token = jwt.sign(sessionDetails, process.env.JWT_SECRET_KEY, {
			expiresIn: '24h',
		});

		//const refresh_token = await ZohoAuth.find();
		let url = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${process.env.ZOHO_REFRESH_TOKEN}&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&grant_type=refresh_token`;
		try {
			const resp = await axios.post(url);
			await axios.post(
				'https://www.zohoapis.in/crm/v3/Leads',
				{
					data: [
						{
							Company: temp_company.company_name,
							Last_Name: temp_company.name,
							Email: temp_company.email,
						},
					],
				},
				{
					headers: {
						Authorization: `Zoho-oauthtoken ${resp.data.access_token}`,
						scope: 'ZohoCRM.modules.ALL',
					},
				}
			);
		} catch (err) {
			await addCompany.save();

			var today = new Date().toLocaleDateString('en-us', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			});
			await Activities.create({
				company: addCompany._id,
				heading: 'Account Created',
				message: `Account has been successfully created at ${today}!`,
			});

			const msg = {
				to: addCompany.email,
				from: process.env.EMAIL_USERNAME,
				//bcc: 'girishk919@gmail.com',
				subject: `${addCompany.name}.! Welcome to EmailAddress.ai`,
				html: `<p>Welcome to the EmailAddress.ai account.</p><br />
			<p>We are excited and wanted to personally welcome you and see if you need any assistance.</p><br />
			<p>We’ll be checking back again to see if you need any help, meanwhile, feel free to reach out to us at any time, should you need any at all.</p><br/>
			<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
			};

			transport.sendMail(msg, (err, info) => {
				if (err) {
					console.log('Error: ' + err);
				} else {
					console.log('Mail Sent!');
				}
			});

			if (temp_company.planId !== '' && temp_company.planId !== null) {
				await temp_company.remove();
				return res.redirect(
					`${process.env.FrontendURL}/thankyou?activation=successful&planId=${temp_company.planId}&type=${temp_company.planType}&token=${access_token}`
				);
			}
			await temp_company.remove();
			return res.redirect(
				`${process.env.FrontendURL}/thankyou?activation=successful`
			);
		}

		await addCompany.save();

		var today = new Date().toLocaleDateString('en-us', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		await Activities.create({
			company: addCompany._id,
			heading: 'Account Created',
			message: `Account has been successfully created at ${today}!`,
		});

		const msg = {
			to: addCompany.email,
			from: process.env.EMAIL_USERNAME,
			//bcc: 'girishk919@gmail.com',
			subject: `${addCompany.name}.! Welcome to EmailAddress.ai`,
			html: `<p>Welcome to the EmailAddress.ai account.</p><br />
			<p>We are excited and wanted to personally welcome you and see if you need any assistance.</p><br />
			<p>We’ll be checking back again to see if you need any help, meanwhile, feel free to reach out to us at any time, should you need any at all.</p><br/>
			<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
		};

		transport.sendMail(msg, (err, info) => {
			if (err) {
				console.log('Error: ' + err);
			} else {
				console.log('Mail Sent!');
			}
		});
		if (temp_company.planId !== '' && temp_company.planId !== null) {
			await temp_company.remove();
			return res.redirect(
				`${process.env.FrontendURL}/thankyou?activation=successful&planId=${temp_company.planId}&type=${temp_company.planType}&token=${access_token}`
			);
		}
		await temp_company.remove();
		return res.redirect(
			`${process.env.FrontendURL}/thankyou?activation=successful`
		);
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.post('/resendActivation', async (req, res) => {
	try {
		const email = req.body.email.toLowerCase();
		if (req.body.email == null)
			return res.status(400).json('Email is required!');

		const temp_company = await TempCompanies.findOne({ email: email });
		if (!temp_company) {
			return res
				.status(400)
				.json('Registration request not found! Please register again');
		}

		const now = new Date();
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const currentTime = `${hours}:${minutes}`;

		const msg = {
			to: temp_company.email,
			from: process.env.EMAIL_USERNAME,
			subject: `Verify your EmailAddress.ai account - [${currentTime}]`,
			html: `<p>Thank you for signing up with EmailAddress.ai.</p><br />
			<p>To complete the setup, please verify your email by clicking on this
			<a href="${process.env.BackendURL}/company/auth/activate?company_id=${temp_company._id}">Link.</a></p><br />
			<p>In case, you are having trouble, you can also copy and paste this link in your browser:</p><br/>
			<p>Look forward to having you onboard.</p><br />
			<p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><p>EmailAddress.ai</p>`,
		};

		// sgMail
		// 	.send(msg)
		// 	.then(() => res.json('Account Activation Mail Sent Again!'))
		// 	.catch((err) => res.status(400).json('Error: ' + err));
		transport.sendMail(msg, (err, info) => {
			if (err) {
				res.status(400).json('Error: ' + err);
			} else {
				res.json('Account Activation Mail Sent Again!');
			}
		});
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.post('/socialLogin', async (req, res) => {
	try {
		if (!req.body.email || !req.body.name) {
			return res.status(400).json('Please try again later.');
		}
		const email = req.body.email.toLowerCase();

		const company7 = await Admins.findOne({ email: email });
		if (company7) return res.status(400).json('Cannot use this email!');

		const company8 = await Members.findOne({ email: email });
		if (company8) return res.status(400).json('Email already exists!');

		const company9 = await SubAdmins.findOne({ email: email });
		if (company9) return res.status(400).json('Email already exists!');

		const firstEmail = email.split('@');
		const blocked_list = await blocked_model.findOne({
			address: firstEmail[1],
		});
		if (blocked_list) {
			return res.status(400).json(`${firstEmail[1]} access has been blocked`);
		}
		// if (firstEmail[1] === 'gmail.com' || firstEmail[1] === 'yahoo.com') {
		// 	return res
		// 		.status(400)
		// 		.json(
		// 			`This email address cannot be used. Please use a business email address.`
		// 		);
		// }

		const company2 = await Companies.findOne({ email: email });
		if (company2) {
			if (company2.provider === 'email') {
				return res.status(400).json('Account exists with email & password.');
			}

			if (company2.suspended) {
				return res.status(400).json('Account is suspended!');
			}
			if (company2.blocked) {
				return res.status(400).json('Account is blocked!');
			}
			if (company2.isCancelled) {
				return res.status(400).json('Contact Support!');
			}

			if (company2.lastSession?.trim().length > 0) {
				await BlackList.create({
					token: company2.lastSession,
				});
			}

			const sessionDetails = {
				id: company2._id,
				name: company2.name,
				role: company2.role,
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

			company2.login_ip = requestIp.getClientIp(req);
			company2.browserType = req.body.browserType;
			company2.location = req.body.location;
			company2.last_login = new Date();
			// company2.isLoggedIn = true;
			company2.lastSession = access_token;

			var checkDate = new Date().toISOString().split('T')[0];
			if (company2.profileCheckDate !== checkDate) {
				company2.profileCheckDate = checkDate;
				company2.profileVisit = 20;
			}

			await company2.save();

			const data = {
				message: 'Login Successful!',
				remember_me: req.body.remember_me,
				access_token: access_token,
				refresh_token: refresh_token,
			};

			var today = new Date().toLocaleDateString('en-us', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			});

			await Activities.create({
				company: company2._id,
				heading: 'Login Successfully',
				message: `Account have login at ${today}!`,
			});

			return res.json(data);
		}

		let addTempCompany;

		addTempCompany = new Companies({
			name: req.body.name,
			email: email,
			mobile: 0,
			company_name: 'No Company',
			provider: req.body.provider,
			isEmailVerified: true,
			planType: 'PYG',
		});

		const temp_company = await addTempCompany.save();

		const sessionDetails = {
			id: temp_company._id,
			name: temp_company.name,
			role: temp_company.role,
		};

		if (req.body.fpr && req.body.fpr !== '') {
			//First Promotor
			await axios.post(
				'https://firstpromoter.com/api/v1/track/signup',
				{
					email: email,
					ref_id: req.body.fpr,
				},
				{
					headers: {
						'x-api-key': `${process.env.FPROM_KEY}`,
						'Content-Type': 'application/json',
					},
				}
			);
		}

		let access_token = jwt.sign(sessionDetails, process.env.JWT_SECRET_KEY, {
			expiresIn: '24h',
		});

		var today = new Date().toLocaleDateString('en-us', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		await Activities.create({
			company: temp_company._id,
			heading: 'Account Created',
			message: `Account has been successfully created at ${today}!`,
		});

		const msg = {
			to: email,
			from: process.env.EMAIL_USERNAME,
			bcc: 'girishk919@gmail.com',
			subject: `${req.body.name}.! Welcome to EmailAddress.ai`,
			html: `<p>Welcome to the EmailAddress.ai account.</p><br />
			<p>We are excited and wanted to personally welcome you and see if you need any assistance.</p><br />
			<p>We’ll be checking back again to see if you need any help, meanwhile, feel free to reach out to us at any time, should you need any at all.</p><br/>
			<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
		};

		transport.sendMail(msg, (err, info) => {
			if (err) {
				console.log('Error: ' + err);
			} else {
				console.log('Mail Sent!');
			}
		});

		return res.json({
			message: 'Login Successful!',
			planId: req.body.planId,
			planType: req.body.planType,
			access_token: access_token,
		});
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

module.exports = router;
