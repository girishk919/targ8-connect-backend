/** @format */

const express = require('express');
const mongoose = require('mongoose');
//const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcryptjs');

const router = express.Router();

const authorize = require('../../helpers/authorize');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const paypal = require('paypal-rest-sdk');
// let payment_Intent;
// paypal.configure({
// 	mode: 'sandbox',
// 	client_id: process.env.PAYPAL_CLIENT_ID,
// 	client_secret: process.env.PAYPAL_CLIENT_SECRET,
// });

const Companies = require('../../models/company/company_model');
const Admins = require('../../models/admin/admin_model');
const Members = require('../../models/member/member_model');
const Invites = require('../../models/company/invite_model');
const Invoices = require('../../models/company/invoice_model');
const TempPlan = require('../../models/company/tempPlan_model');
const tempInvite = require('../../models/company/tempInvite_model');
const SaveSearch = require('../../models/common/savesearch_model');
const CreditRequests = require('../../models/member/request_credits_model');
const CompanyTransaction = require('../../models/company/trans_model');
const CompanyActivityLogs = require('../../models/company/activity_log_model');
const MemberActivityLogs = require('../../models/member/activity_log_model');
const { dashLogger } = require('../../logger');
const Subscriptions = require('../../models/admin/subscription_model');
const { Transaction } = require('../../models/admin/transaction_model');

const inviteValidation = require('../../validations/company/invite_validation');
const subscription_validater = require('../../helpers/subscription_validator');

//sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const nodemailer = require('nodemailer');
const sub_admin_model = require('../../models/sub-admin/sub_admin_model');
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

router.get(
	'/',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id);

			if (!company) return res.status(400).json('Company not found!');

			const members_array = [];

			const allmem = await Members.find({ company_id: company._id });

			for (let i = 0; i < allmem?.length; i++) {
				const object = {
					_id: allmem[i]?._id,
					name: allmem[i]?.name,
					email: allmem[i]?.email,
					login_ip: allmem[i]?.login_ip,
					credits: allmem[i]?.credits,
					last_login: allmem[i]?.last_login,
					createdAt: allmem[i]?.createdAt,
					status: true,
					blocked: allmem[i]?.blocked,
					suspended: allmem[i]?.suspended,
				};

				members_array.push(object);
			}

			// for (let i = 0; i < company?.invites?.length; i++) {
			// 	const object = {
			// 		_id: company.invites[i]._id,
			// 		name: company.invites[i].name,
			// 		email: company.invites[i].email,
			// 		login_ip: null,
			// 		credits: company.invites[i].credits,
			// 		createdAt: company.invites[i].createdAt,
			// 		status: false,
			// 		last_login: null,
			// 		blocked: company.invites[i].blocked,
			// 		suspended: company.invites[i].suspended,
			// 	};

			// 	members_array.push(object);
			// }

			return res.json(members_array);
		} catch (error) {
			console.log('ok', error);
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/getOneMember',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id);
			if (!company) return res.status(400).json('Company not found!');

			const member_id = mongoose.Types.ObjectId(req.query.member_id);

			// if (!company.members.includes(member_id))
			// 	return res.status(400).json('Member not found!');

			const member = await Members.findOne({
				_id: member_id,
				company_id: company._id,
			});
			if (!member) return res.status(400).json('Member not found!');

			return res.json(member);
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json('There was some error!');
		}
	}
);

router.post(
	'/invite',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			const email = req.body.email.toLowerCase();
			const company = await Companies.findById(req.user.id);
			if (!company) return res.status(400).json('Company not found!');

			// if (company.plan == null)
			// 	return res.status(400).json('You currently have no subscription plan');

			const member = await Members.findOne({ email: email });
			if (member) return res.status(400).json('Email already exists');

			const member2 = await Members.findOne({ username: req.body.username });
			if (member2) return res.status(400).json('Username already exists');

			// const invite = await Invites.findOne({ email: email });
			// if (invite) return res.status(400).json('Invite already sent');

			if (company.email === email)
				return res.status(400).json('You cannot add your self as member!');

			const company7 = await Admins.findOne({ email: email });
			if (company7) return res.status(400).json('Email already exists!');

			const company8 = await sub_admin_model.findOne({ email: email });
			if (company8) return res.status(400).json('Email already exists!');

			const company9 = await Companies.findOne({ email: email });
			if (company9) return res.status(400).json('Email already exists!');

			const company10 = await Companies.findOne({
				username: req.body.username,
			});
			if (company10) return res.status(400).json('Username already exists!');

			// const firstEmail = company.email.split('@');
			// const secondEmail = email.split('@');

			// if (firstEmail[1] !== secondEmail[1])
			// 	return res.status(400).json("Member doesn't belong to your company!");

			// if (company.credits < req.body.credits)
			// 	return res.status(400).json('Not enough credits');

			// if (
			// 	company.members.length + company.invites.length + 1 >=
			// 	company.plan.max_members
			// ) {
			// 	return res
			// 		.status(400)
			// 		.json('Subscription does not allow more members to add.');
			// }

			// if (company.plan.subscription_type === 'Free Trial') {
			// 	return res.status(400).json('Cannot buy credits in free trial');
			// }
			// const subscription = await Subscriptions.findOne({
			// 	title: company.plan.subscription_type,
			// });
			// if (!subscription)
			// 	return res.status(400).json('Plan does not exist anymore!');
			// const addtempPlan = new TempPlan({
			// 	company_id: company._id,
			// 	subscription_type: 'Add User',
			// 	subscription_amount: subscription.cost_per_user,
			// });

			// var genplan = await addtempPlan.save();
			// var price = subscription.stripe_cpu_price_id;

			//company.credits -= req.body.credits;
			//	await company.save();

			const salt = await bcrypt.genSalt(10);
			const hashPassword = await bcrypt.hash(req.body.password, salt);

			function generateUniqueCode(length = 6) {
				const chars =
					'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
				let result = '';
				for (let i = 0; i < length; i++) {
					result += chars.charAt(Math.floor(Math.random() * chars.length));
				}
				return result + Date.now().toString(36); // Add timestamp to make it unique
			}

			const code = generateUniqueCode();

			await Members.create({
				name: req.body.name,
				email: email,
				username: req.body.username,
				company_id: company._id,
				clientCode: code,
				password: hashPassword,
			});

			return res.json('New Member Added!');
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json('There was some error!' + error.message);
		}
	}
);

// router.get('/successPaymentNow', async (req, res) => {
// 	try {
// 		const tmpTrans = await TempPlan.findById(
// 			mongoose.Types.ObjectId(req.query.trans_id)
// 		);
// 		if (!tmpTrans) return res.status(400).json('transaction not found!');

// 		const company = await Companies.findById(tmpTrans.company_id).populate(
// 			'plan'
// 		);
// 		if (!company) return res.status(400).json('Company not found!');

// 		const invite = await tempInvite.findById(req.query.invite_id);
// 		if (!invite) return res.status(400).json('Invite not found!');

// 		let paymentId;
// 		let cardNumber;
// 		if (tmpTrans && tmpTrans.paymentIntent) {
// 			var paymentIntent;
// 			const session = await stripe.checkout.sessions.retrieve(
// 				tmpTrans.paymentIntent
// 			);
// 			paymentIntent = await stripe.paymentIntents.retrieve(
// 				session.payment_intent
// 			);
// 			paymentId = session.payment_intent;
// 			const paymentMethod = await stripe.paymentMethods.retrieve(
// 				paymentIntent?.payment_method
// 			);

// 			cardNumber = paymentMethod?.card?.last4;
// 		}

// 		// if (company.plan.subscription_type !== 'Free Trial') {
// 		// 	company.previous_plans.push(company.plan._id);
// 		// }

// 		// let date = new Date();
// 		// date.setDate(date.getDate() + tmpTrans.validity);

// 		// date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

// 		// const createNewPlan = new Plans({
// 		// 	subscription_type: tmpTrans.subscription_type,
// 		// 	subscription_amount: tmpTrans.subscription_amount,
// 		// 	subscription_amount_status: true,
// 		// 	payment_mode: 'Stripe',
// 		// 	cost_per_user: tmpTrans.cost_per_user,
// 		// });

// 		// const newPlan = createNewPlan.save();

// 		// const newPlan = await Plans.findById(company.plan._id);
// 		// newPlan.payment_mode = 'Stripe';
// 		// newPlan.subscription_amount_status = true;
// 		// await newPlan.save();

// 		// const transaction = await new Transaction({
// 		// 	payment_intent_id: tmpTrans.payment_intent_id,
// 		// 	company_id: tmpTrans.company_id,
// 		// 	type: 'Subscription',
// 		// 	credit_count: tmpTrans.credit_count,
// 		// 	amount: tmpTrans.amount,
// 		// 	payment_mode: tmpTrans.payment_mode,
// 		// 	card_info:
// 		// 		paymentIntent.charges.data[0].payment_method_details.card.last4,
// 		// });
// 		const comTrans = await CompanyTransaction.create({
// 			company_id: tmpTrans.company_id,
// 			subscription_type: tmpTrans.subscription_type,
// 			subscription_amount: tmpTrans.subscription_amount,
// 			subscription_amount_status: true,
// 			payment_mode: 'Stripe',
// 			card_info: cardNumber,
// 			txnId: paymentId,
// 		});

// 		// company.credits = tmpTrans.credit_count;
// 		// company.totalCredits = tmpTrans.credit_count;

// 		//const newTransaction = await transaction.save();

// 		// transaction.invoices.push(invoice._id);
// 		// console.log(company);

// 		//company.previous_plans.push(newPlan._id);
// 		const addInvite = new Invites({
// 			name: invite.name,
// 			email: invite.email,
// 			company_name: invite.company_name,
// 			credits: invite.credits,
// 		});

// 		const newInvite = await addInvite.save();

// 		company.invites.push(newInvite._id);
// 		company.credits -= invite.credits;

// 		//await company.save();

// 		const createInvoice = new Invoices({
// 			name: 'Add User',
// 			company: company._id,
// 			from: {
// 				name: 'EmailAddress.ai',
// 				address: '447 Broadway, 2nd floor, #713',
// 				address2: 'NewYork, NY 10013, USA',
// 				email: 'team@emailaddress.ai',
// 			},
// 			status: true,
// 			item: {
// 				subscription_type: 'Add User',
// 				subscription_description: 'temp desc',
// 				subscription_validity: 0,
// 				endDate: null,
// 				billingType: 'One Time',
// 				paymentMode: 'Stripe',
// 			},
// 			amount: company.plan.cost_per_user,
// 			card_info: cardNumber,
// 		});

// 		const invoice = await createInvoice.save();
// 		company.invoices.push(invoice._id);
// 		await company.save();

// 		//await transaction.save();

// 		const addCompanyActivityLog = new CompanyActivityLogs({
// 			company: company._id,
// 			heading: 'Invite New User',
// 			message: 'Add a new user using Stripe.',
// 		});

// 		await addCompanyActivityLog.save();

// 		const addCompanyActivityLog2 = new CompanyActivityLogs({
// 			company: company._id,
// 			heading: 'Add Member',
// 			message: 'Invited ' + invite.name + ' to join your company.',
// 		});

// 		await addCompanyActivityLog2.save();
// 		const msg = {
// 			to: company.email,
// 			from: 'team@emailaddress.ai',
// 			subject: `You’ve just invited a team member to EmailAddress.ai`,
// 			html: `<p>Your team member has been invited to access your EmailAddress.ai account.</p><br />
// 			<p>If you have not requested one, please contact support via Live chat or send an email to team@emailaddress.ai </p><br/>
// 			<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 		};
// 		const msg2 = {
// 			to: newInvite.email,
// 			from: 'team@emailaddress.ai',
// 			subject: `You’ve were invited to EmailAddress.ai`,
// 			html: `<p>You have been invited by your colleague to access EmailAddress.ai.</p><br />
// 			<p>Click here to Join ${newInvite.company_name} on EmailAddress.ai platform, <a href="${process.env.FrontendURL}/teamSignup?invite_id=${newInvite._id}">Click Here</a></p><br />
// 			<p>If you have received this email in error, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
// 			<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 		};

// 		// sgMail
// 		// 	.send(msg)
// 		// 	.then(() => console.log('Invitation Sent!'))
// 		// 	.catch((err) => console.log(err));
// 		// sgMail
// 		// 	.send(msg2)
// 		// 	.then(() => console.log('Invitation Sent!'))
// 		// 	.catch((err) => console.log(err));
// 		transport.sendMail(msg, (err, info) => {
// 			if (err) {
// 				console.log('Error: ' + err);
// 			} else {
// 				console.log('Mail Sent!');
// 			}
// 		});
// 		transport.sendMail(msg2, (err, info) => {
// 			if (err) {
// 				console.log('Error: ' + err);
// 			} else {
// 				console.log('Mail Sent!');
// 			}
// 		});

// 		return res
// 			.status(200)
// 			.redirect(`${process.env.FrontendURL}/thankyou?status=success`);
// 	} catch (error) {
// 		dashLogger.error(
// 			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
// 		);
// 		const tmpTrans = await TempPlan.findById(
// 			mongoose.Types.ObjectId(req.query.trans_id)
// 		);
// 		if (tmpTrans) {
// 			const comTrans = await CompanyTransaction.create({
// 				company_id: tmpTrans.company_id,
// 				subscription_type: tmpTrans.subscription_type,
// 				subscription_amount: tmpTrans.subscription_amount,
// 				subscription_amount_status: false,
// 				payment_mode: 'Stripe',
// 			});
// 			const activity = await CompanyActivityLogs.create({
// 				company: tmpTrans.company_id,
// 				heading: 'Transaction Failed',
// 				message: `${tmpTrans.type} Payment failed`,
// 			});
// 			await tmpTrans.remove();
// 			return res
// 				.status(400)
// 				.redirect(`${process.env.FrontendURL}/failed?status=fail`);
// 		}
// 		return res.status(400).redirect(`${process.env.FrontendURL}/myprofile`);
// 	}
// });

// router.get('/successPaypalNow', async (req, res) => {
// 	try {
// 		const payerId = req.query.PayerID;
// 		const paymentId = req.query.paymentId;

// 		const tmpTrans = await TempPlan.findById(
// 			mongoose.Types.ObjectId(req.query.trans_id)
// 		);
// 		if (!tmpTrans) return res.status(400).json('Plan not found!');

// 		// const invoice = await Invoices.findOne({
// 		// 	_id: mongoose.Types.ObjectId(req.query.invoice_id),
// 		// 	company: company._id,
// 		// });
// 		// if (!invoice) return res.status(400).json('Invoice not found!');

// 		let usdAmount = tmpTrans.amount * 0.013;
// 		usdAmount = usdAmount.toFixed(2);
// 		usdAmount = usdAmount.toString();

// 		const execute_payment_json = {
// 			payer_id: payerId,
// 			transactions: [
// 				{
// 					amount: {
// 						currency: 'USD',
// 						total: usdAmount,
// 					},
// 				},
// 			],
// 		};

// 		paypal.payment.execute(
// 			paymentId,
// 			execute_payment_json,
// 			async function (error, payment) {
// 				if (error) {
// 					console.log(error.response.details);
// 					return res.redirect(
// 						`${process.env.FrontendURL}/failed?message=${error.response}`
// 					);
// 				} else {
// 					const company = await Companies.findById(tmpTrans.company_id);

// 					if (!company) return res.status(400).json('Company not found!');
// 					const invite = await tempInvite.findById(req.query.invite_id);
// 					if (!invite) return res.status(400).json('Invite not found!');
// 					// if (company.plan.subscription_type !== 'Free Trial') {
// 					// 	company.previous_plans.push(company.plan._id);
// 					// }

// 					// const transaction = await new Transaction({
// 					// 	payment_intent_id: paymentId,
// 					// 	company_id: tmpTrans.company_id,
// 					// 	type: 'Subscription',
// 					// 	credit_count: tmpTrans.credit_count,
// 					// 	amount: tmpTrans.amount,
// 					// 	payment_mode: tmpTrans.payment_mode,
// 					// });

// 					// let date = new Date();
// 					// date.setDate(date.getDate() + tmpTrans.validity);

// 					// date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

// 					// const createNewPlan = new Plans({
// 					// 	subscription_type: tmpTrans.subscription_type,
// 					// 	subscription_amount: tmpTrans.subscription_amount,
// 					// 	subscription_amount_status: true,
// 					// 	payment_mode: 'Paypal',
// 					// 	cost_per_user: tmpTrans.cost_per_user,
// 					// });

// 					// const newPlan = createNewPlan.save();
// 					const comTrans = await CompanyTransaction.create({
// 						company_id: tmpTrans.company_id,
// 						subscription_type: tmpTrans.subscription_type,
// 						subscription_amount: tmpTrans.subscription_amount,
// 						subscription_amount_status: true,
// 						payment_mode: 'Paypal',
// 					});
// 					// const newPlan = await Plans.findById(company.plan._id);
// 					// newPlan.payment_mode = 'Paypal';
// 					// newPlan.subscription_amount_status = true;
// 					// await newPlan.save();
// 					// company.plan = newPlan;
// 					// company.credits = tmpTrans.credit_count;
// 					// company.totalCredits = tmpTrans.credit_count;

// 					// const newTransaction = await transaction.save();

// 					//company.invoices.push(invoice._id);
// 					// transaction.invoices.push(invoice._id);
// 					// console.log(company);
// 					// invoice.status = true;
// 					// await invoice.save();

// 					const addInvite = new Invites({
// 						name: invite.name,
// 						email: invite.email,
// 						company_name: invite.company_name,
// 						credits: invite.credits,
// 					});

// 					const newInvite = await addInvite.save();

// 					company.invites.push(newInvite._id);

// 					await company.save();

// 					company.previous_plans.push(newPlan._id);
// 					await company.save();

// 					await transaction.save();
// 					const createInvoice = new Invoices({
// 						name: 'Add User',
// 						company: req.query.company_id,
// 						from: {
// 							name: 'EmailAddress.ai',
// 							address: '447 Broadway, 2nd floor, #713',
// 							address2: 'NewYork, NY 10013, USA',
// 							email: 'support@healthdbi.com',
// 						},
// 						status: true,
// 						item: {
// 							subscription_type: 'Add User',
// 							subscription_description: 'temp desc',
// 							subscription_validity: 0,
// 						},
// 						amount: company.plan.cost_per_user,
// 					});

// 					const invoice = await createInvoice.save();
// 					company.invoices.push(invoice._id);
// 					await company.save();

// 					const addCompanyActivityLog = new CompanyActivityLogs({
// 						company: company._id,
// 						heading: 'Invite New User',
// 						message: 'Add a new user using Stripe.',
// 					});

// 					await addCompanyActivityLog.save();

// 					const addCompanyActivityLog2 = new CompanyActivityLogs({
// 						company: company._id,
// 						heading: 'Add Member',
// 						message: 'Invited ' + invite.name + ' to join your company.',
// 					});

// 					await addCompanyActivityLog2.save();

// 					const msg = {
// 						to: company.email,
// 						from: 'team@emailaddress.ai',
// 						subject: `You’ve just invited a team member to EmailAddress.ai`,
// 						html: `<p>Your team member has been invited to access your EmailAddress.ai account.</p><br />
// 			<p>If you have not requested one, please contact support via Live chat or send an email to team@emailaddress.ai </p><br/>
// 			<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 					};
// 					const msg2 = {
// 						to: newInvite.email,
// 						from: 'team@emailaddress.ai',
// 						subject: `You’ve were invited to EmailAddress.ai`,
// 						html: `<p>You have been invited by your colleague to access EmailAddress.ai. The platform to access Real-time verified healthcare contact information.</p><br />
// 			<p>Click here to Join ${newInvite.company_name} on HealthDBI platform, <a href="${process.env.FrontendURL}/teamSignup?invite_id=${newInvite._id}">Click Here</a></p><br />
// 			<p>If you have received this email in error, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
// 			<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 					};

// 					// sgMail
// 					// 	.send(msg)
// 					// 	.then(() => console.log('Invitation Sent!'))
// 					// 	.catch((err) => console.log(err));
// 					// sgMail
// 					// 	.send(msg2)
// 					// 	.then(() => console.log('Invitation Sent!'))
// 					// 	.catch((err) => console.log(err));
// 					transport.sendMail(msg, (err, info) => {
// 						if (err) {
// 							console.log('Error: ' + err);
// 						} else {
// 							console.log('Mail Sent!');
// 						}
// 					});
// 					transport.sendMail(msg2, (err, info) => {
// 						if (err) {
// 							console.log('Error: ' + err);
// 						} else {
// 							console.log('Mail Sent!');
// 						}
// 					});

// 					return res
// 						.status(200)
// 						.redirect(`${process.env.FrontendURL}/thankyou?status=success`);
// 				}
// 			}
// 		);
// 	} catch (error) {
// 		dashLogger.error(
// 			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
// 		);
// 		const tmpTrans = await TempPlan.findById(
// 			mongoose.Types.ObjectId(req.query.trans_id)
// 		);
// 		if (tmpTrans) {
// 			const comTrans = await CompanyTransaction.create({
// 				company_id: tmpTrans.company_id,
// 				subscription_type: tmpTrans.subscription_type,
// 				subscription_amount: tmpTrans.subscription_amount,
// 				subscription_amount_status: false,
// 				payment_mode: 'Paypal',
// 			});
// 			const activity = await CompanyActivityLogs.create({
// 				company: tmpTrans.company_id,
// 				heading: 'Transaction Failed',
// 				message: `${tmpTrans.type} Payment failed`,
// 			});
// 			await tmpTrans.remove();
// 		}
// 		console.log(error);
// 		res.status(400).redirect(`${process.env.FrontendURL}/failed?status=fail`);
// 	}
// });

// router.get('/failPaymentNow', async (req, res) => {
// 	try {
// 		const tmpTrans = await TempPlan.findById(
// 			mongoose.Types.ObjectId(req.query?.trans_id)
// 		);
// 		if (tmpTrans) {
// 			const activity = await CompanyActivityLogs.create({
// 				company: tmpTrans.company_id,
// 				heading: 'Transaction Failed',
// 				message: `${tmpTrans.type} Payment failed`,
// 			});
// 			await tmpTrans.remove();
// 			return res.status(200).redirect('${process.env.FrontendURL}/profile');
// 		}
// 		return res.status(200).redirect('${process.env.FrontendURL}/profile');
// 	} catch (err) {
// 		dashLogger.error(
// 			`Error : ${err}, Request : ${req.originalUrl}, UserType: null, User: null`
// 		);
// 		res.status(400).json(err.message);
// 	}
// });

router.get(
	'/myInvites',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).populate('invites');
			if (!company) return res.status(400).json('Company not found!');

			return res.json(company.invites);
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get('/getOneInvite', async (req, res) => {
	try {
		const invite = await Invites.findById(
			mongoose.Types.ObjectId(req.query.invite_id)
		);
		if (!invite) return res.status('Invite not found!');

		return res.json(invite);
	} catch (error) {
		res.status(400).json(error.message);
	}
});

router.delete(
	'/deleteInvite',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).populate('invites');
			if (!company) return res.status(400).json('Company not found!');

			const invite = await Invites.findOne({
				_id: mongoose.Types.ObjectId(req.query.invite_id),
				company_name: company.company_name,
			});
			if (!invite) return res.status(400).json('Invite not found!');

			company.credits += invite.credits;

			company.invites = company.invites.filter((element) => {
				if (element._id.equals(invite._id)) {
					return false;
				}
				return true;
			});

			await Invites.findByIdAndDelete(invite._id);

			await company.save();

			const addCompanyActivityLog = new CompanyActivityLogs({
				company: company._id,
				heading: 'Delete Invite',
				message: 'Deleted invite for ' + invite.name + ' .',
			});

			await addCompanyActivityLog.save();

			return res.json('Invite deleted!');
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/assignCredits',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).populate('plan');
			if (!company) return res.status(400).json('Company not found!');

			if (company.plan == null)
				return res.status(400).json('You currently have no subscription plan');

			const member_id = mongoose.Types.ObjectId(req.query.member_id);

			const member = await Members.findOne({
				_id: member_id,
				company_id: company._id,
			});
			if (!member) return res.status(400).json('Member not found!');

			if (company.credits < req.query.credits)
				return res.status(400).json('Not enough credits');

			member.credits += Number(req.query.credits);
			member.totalCredits += Number(req.query.credits);
			company.credits -= Number(req.query.credits);

			await member.save();
			await company.save();

			const addCompanyActivityLog = new CompanyActivityLogs({
				company: company._id,
				heading: 'Credits Transfer',
				message:
					'Assigned ' + req.query.credits + ' credits to ' + member.name + ' .',
			});

			await addCompanyActivityLog.save();

			const addMemberActivityLog = new MemberActivityLogs({
				member: member._id,
				company: company._id,
				heading: 'Credits Assigned',
				message: 'Assigned ' + req.query.credits + ' credits to you.',
			});

			await addMemberActivityLog.save();

			return res.json('Credits assigned!');
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/revokeCredits',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).populate('plan');
			if (!company) return res.status(400).json('Company not found!');

			if (company.plan == null)
				return res.status(400).json('You currently have no subscription plan');

			const member_id = mongoose.Types.ObjectId(req.query.member_id);

			const member = await Members.findOne({
				_id: member_id,
				company_id: company._id,
			});
			if (!member) return res.status(400).json('Member not found!');

			if (member.credits < req.query.credits)
				return res.status(400).json('Not enough credits');

			member.credits -= Number(req.query.credits);
			member.totalCredits -= Number(req.query.credits);
			company.credits += Number(req.query.credits);

			await member.save();
			await company.save();

			const addCompanyActivityLog = new CompanyActivityLogs({
				company: company._id,
				heading: 'Credits Transfer',
				message:
					'Revoked ' +
					req.query.credits +
					' credits from ' +
					member.name +
					' .',
			});

			await addCompanyActivityLog.save();

			const addMemberActivityLog = new MemberActivityLogs({
				member: member._id,
				company: company._id,
				heading: 'Credits Revoked',
				message: 'Revoked ' + req.query.credits + ' credits from you.',
			});

			await addMemberActivityLog.save();

			return res.json('Credits revoked!');
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/blockunblock',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id);
			if (!company) return res.status(400).json('Company not found!');

			const member = await Members.findOne({
				_id: mongoose.Types.ObjectId(req.query.member_id),
				company_id: company._id,
			});
			if (!member) return res.status(400).json('Member not found!');

			if (member.blocked === false) {
				member.blocked = true;
			} else {
				member.blocked = false;
			}

			await member.save();

			if (member.blocked) {
				const msg = {
					to: member.email,
					from: 'team@emailaddress.ai',
					subject: 'Your EmailAddress.ai account is blocked',
					html: `<p>Your EmailAddress.ai account has been blocked by the admin.</p><br />
			<p>If you any problem, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
			<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
				};
				transport.sendMail(msg, (err, info) => {
					if (err) {
						console.log(err);
					} else {
						console.log('Invitation Sent!');
					}
				});
				return res.json('Member blocked!');
			} else {
				const msg = {
					to: member.email,
					from: 'team@emailaddress.ai',
					subject: 'Your EmailAddress.ai account is unblocked',
					html: `<p>Your EmailAddress.ai account has been unblocked by the admin.</p><br />
			<p>If you any problem, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
			<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
				};
				transport.sendMail(msg, (err, info) => {
					if (err) {
						console.log(err);
					} else {
						console.log('Invitation Sent!');
					}
				});
				return res.json('Member unblocked!');
			}
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/suspendUnsuspend',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id);
			if (!company) return res.status(400).json('Company not found!');

			const member = await Members.findOne({
				_id: mongoose.Types.ObjectId(req.query.member_id),
				company_id: company._id,
			});
			if (!member) return res.status(400).json('Member not found!');

			member.suspended = !member.suspended;

			await member.save();

			if (member.suspended) {
				const msg = {
					to: member.email,
					from: 'team@emailaddress.ai',
					subject: 'Your EmailAddress.ai account is suspended',
					html: `<p>Your EmailAddress.ai account has been suspended by the admin.</p><br />
			<p>If you any problem, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
			<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
				};
				transport.sendMail(msg, (err, info) => {
					if (err) {
						console.log(err);
					} else {
						console.log('Invitation Sent!');
					}
				});
				return res.json('Member suspended!');
			} else {
				const msg = {
					to: member.email,
					from: 'team@emailaddress.ai',
					subject: 'Your EmailAddress.ai account is unsuspended',
					html: `<p>Your EmailAddress.ai account has been unsuspended by the admin.</p><br />
			<p>If you any problem, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
			<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
				};
				transport.sendMail(msg, (err, info) => {
					if (err) {
						console.log(err);
					} else {
						console.log('Invitation Sent!');
					}
				});
				return res.json('Member unsuspended!');
			}
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.delete(
	'/deleteMember',
	[authorize.verifyToken, authorize.accessCompany, subscription_validater],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id)
				.populate('members')
				.populate('credit_requests');
			if (!company) return res.status(400).json('Company not found!');

			const member = await Members.findOne({
				_id: mongoose.Types.ObjectId(req.query.member_id),
				company_id: company._id,
			});
			if (!member) return res.status(400).json('Member not found!');

			const credits = member.credits;

			company.members = company.members.filter((element) => {
				if (element._id.equals(member._id)) {
					return false;
				}
				return true;
			});

			company.credits += credits;

			for (let i = 0; i < member.search.length; i++) {
				await SaveSearch.findByIdAndDelete(member.search[i]);
			}

			company.credit_requests = company.credit_requests.filter((element) => {
				if (element.member.equals(member._id)) {
					return false;
				}
				return true;
			});

			for (let i = 0; i < member.credit_requests.length; i++) {
				await CreditRequests.findByIdAndDelete(member.credit_requests[i]);
			}

			const logs = await MemberActivityLogs.find({ member: member._id });

			for (let i = 0; i < logs.length; i++) {
				await logs[i].remove();
			}

			await company.save();

			await member.remove();

			return res.json('Member deleted!');
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

module.exports = router;
