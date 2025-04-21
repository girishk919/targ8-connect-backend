/** @format */

const express = require('express');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('paypal-rest-sdk');
const Activities = require('../../models/company/activity_log_model');
const Notification = require('../../models/common/notification_model');
const router = express.Router();
const tempTransactions = require('../../models/admin/temp_transaction_model');
const authorize = require('../../helpers/authorize');
//const sgMail = require('@sendgrid/mail');
const { dashLogger } = require('../../logger');
const Companies = require('../../models/company/company_model');
const Plans = require('../../models/company/plans_model');
const TempPlan = require('../../models/company/tempPlan_model');
const CompanyTransaction = require('../../models/company/trans_model');
const Subscriptions = require('../../models/admin/subscription_model');
const Invoices = require('../../models/company/invoice_model');
const CompanyActivityLogs = require('../../models/company/activity_log_model');
const { Transaction } = require('../../models/admin/transaction_model');
const axios = require('axios');
//sgMail.setApiKey(process.env.SENDGRID_API_KEY);
let payment_Intent;
paypal.configure({
	mode: 'sandbox',
	client_id: process.env.PAYPAL_CLIENT_ID,
	client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

const nodemailer = require('nodemailer');
const { default: Stripe } = require('stripe');
const Product = require('../../models/admin/product_model');
const credit_usage = require('../../models/common/credit_usage');
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
	'/currentPlan',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).lean();
			if (!company) return res.status(400).json('Company not found!');

			return res.json({});
			if (company.planType === 'PYG') {
				return res.json({ subscription_type: 'PYG', credits: 100 });
			} else {
				if (!company.plan) {
					return res.status('No Plan Exist!');
				}

				if (company.plan) {
					console.log(
						new Date().getTime() -
							new Date(company.lastSubscriptionCheckedAt).getTime()
					);
					if (
						!company.lastSubscriptionCheckedAt ||
						new Date().getTime() -
							new Date(company.lastSubscriptionCheckedAt).getTime() >=
							3600 * 60 * 24 * 1000
					) {
						await Companies.findByIdAndUpdate(req.user.id, {
							$set: { lastSubscriptionCheckedAt: new Date() },
						});
						let curr_date = new Date().getTime();
						let will_expire_on = new Date(
							company.plan.subscription_end_date
						).getTime();
						let diff_in_times = will_expire_on - curr_date;
						let diff_in_days = diff_in_times / (1000 * 3600 * 24);

						// get total seconds between the times
						var delta = Math.abs(diff_in_times) / 1000;

						// calculate (and subtract) whole days
						var days = Math.floor(delta / 86400);
						delta -= days * 86400;

						// calculate (and subtract) whole hours
						var hours = Math.floor(delta / 3600) % 24;

						if (diff_in_days >= 0 && diff_in_days <= 5) {
							const activity = await Notification.create({
								company: company._id,
								heading: 'Subscription will expire soon..',
								message: `Your plan for ${company.plan.subscription_type} will expire in ${days} days and ${hours} hours !`,
							});
							console.log(activity);
						}
					}
				}
				return res.json(company.plan);
			}
		} catch (error) {
			console.log(error);
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.post(
	'/cancelSubscription',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).populate('plan');
			if (!company) return res.status(400).json('Company not found!');

			if (company.plan.subscription_type === 'Free Trial') {
				return res.status(400).json('Did not buy any subscription.');
			}

			if (company.plan.stripe_subscription_id) {
				await stripe.subscriptions.cancel(company.plan.stripe_subscription_id);
			} else {
				return res.status(400).json('Does not have any active plan.');
			}

			company.reason = req.body.reason;
			let plan = await Plans.findById(company.plan._id);
			plan.isCancelled = true;
			await plan.save();
			//company.plan.isCancelled = true;
			company.cancelDate = new Date();
			company.isCancelled = true;
			await company.save();
			const msg = {
				to: company.email,
				from: 'team@emailaddress.ai',
				subject: `You’ve requested a cancellation?`,
				html: `<p>We’re sad to see you go.!</p><br />
				<p>Your cancellation request is under process and you will get a confirmation shortly. However, your account access would end instantly.</p><br />
				<p>If you would be willing to give us another chance, please write an email to ceo@healthdbi.com so we can recommend a better deal.</p><br />
			<p>If you have not requested one, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
			<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
			};

			// sgMail
			// 	.send(msg)
			// 	.then(() => console.log('Reset Password Link Mailed!'))
			// 	.catch((err) => console.log('Error: ' + err));
			transport.sendMail(msg, (err, info) => {
				if (err) {
					console.log('Error: ' + err);
				} else {
					console.log('Mail Sent!');
				}
			});

			return res.status(200).json('Subscription Cancelled');
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/previousPlans',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).populate(
				'previous_plans'
			);
			if (!company) return res.status(400).json('Company not found!');

			return res.json(company.previous_plans);
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/transactions',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			const transactions = await CompanyTransaction.find({
				company_id: req.user.id,
			}).sort({ createdAt: -1 });
			// const company = await Companies.findById(req.user.id)
			// 	.populate('plan')
			// 	.populate({
			// 		path: 'previous_plans',
			// 		options: { sort: { createdAt: -1 } },
			// 	});
			// if (!company) return res.status(400).json('Company not found!');

			// if (company.plan.subscription_type !== 'Free Trial') {
			// 	company.previous_plans.unshift(company.plan);
			// }

			return res.json(transactions);
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/invoices',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id)
				.populate({
					path: 'invoices',
					populate: { path: 'item' },
				})
				.populate({
					path: 'invoices',
					options: { sort: { createdAt: -1 } },
					populate: { path: 'company', select: 'name email mobile' },
				})
				.lean();
			if (!company) return res.status(400).json('Company not found!');

			var newInvoices = [];
			for (const rev of company.invoices) {
				if (rev.name === 'Assign Credits') {
					rev.name = `Bought ${rev.item.subscription_credits} Credits (Extra)`;
					newInvoices.push(rev);
				}
				if (rev.name === 'PAY-AS-YOU-GO') {
					rev.name = `Bought ${rev.item.subscription_credits} Credits (PYG)`;
					newInvoices.push(rev);
				}
				if (rev.name === 'EXTRA CREDIT') {
					rev.name = `Bought ${rev.item.subscription_credits} Credits (Extra)`;
					newInvoices.push(rev);
				}
				if (rev.name === 'Add User') {
					rev.name = `Invite New User`;
					newInvoices.push(rev);
				}
				if (rev.name === 'Subscription') {
					rev.name = `Bought ${rev.item.subscription_type} Subscription`;
					newInvoices.push(rev);
				}
			}
			// company.invoices.map((invoice) => {
			// 	if (invoice.item.subscription_type === 'Assign Credits') {
			// 		invoice.name = `Bought ${invoice.item.subscription_credits} Credits`;
			// 		newInvoices.push(invoice);
			// 	}
			// 	if (invoice.item.subscription_type === 'Subscription') {
			// 		invoice.name = `Bought ${invoice.item.subscription_type}`;
			// 		newInvoices.push(invoice);
			// 	}
			// });

			return res.json(newInvoices);
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.post(
	'/payInvoice',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			if (req.body.invoice_id === '' || req.body.invoice_id == null)
				return res.status(400).json('Invoice Id is required!');
			if (req.body.invoice_id.length < 6)
				return res
					.status(400)
					.json('Invoice Id should be at least 6 characters!');

			const company = await Companies.findById(req.user.id).populate('plan');
			if (!company) return res.status(400).json('Company not found!');

			const invoice = await Invoices.findOne({
				_id: mongoose.Types.ObjectId(req.body.invoice_id),
			});
			if (!invoice) return res.status(400).json('Invoice not found!');

			if (invoice.status == true)
				return res.status(400).json('Invoice already paid');

			var price = '';
			var mode = '';
			var quantity = 1;

			if (invoice.item.subscription_type === 'Assign Credits') {
				const addtempPlan = new TempPlan({
					company_id: company._id,
					subscription_type: invoice.item.subscription_type,
					credits: invoice.item.subscription_credits,
					subscription_amount: invoice.amount,
				});

				var genplan = await addtempPlan.save();
				if (company.plan.subscription_type === 'Free Trial') {
					return res.status(400).json('Cannot buy credits in free trial');
				}
				var subscription = await Subscriptions.findOne({
					title: company.plan.subscription_type,
				});
				if (!subscription)
					return res.status(400).json('Plan does not exist anymore!');
				price = subscription.stripe_cpc_price_id;
				mode = 'payment';
				quantity = Number(invoice.item.subscription_credits);
			} else if (invoice.item.subscription_type === 'PAY-AS-YOU-GO') {
				const addtempPlan = new TempPlan({
					company_id: company._id,
					subscription_type: invoice.item.subscription_type,
					credits: invoice.item.subscription_credits,
					subscription_amount: invoice.amount,
				});

				var genplan = await addtempPlan.save();
				// if (company.plan.subscription_type === 'Free Trial') {
				// 	return res.status(400).json('Cannot buy credits in free trial');
				// }
				var subscription = await Product.findOne({
					title: invoice.item.subscription_title,
				});
				if (!subscription)
					return res.status(400).json('Plan does not exist anymore!');
				price = subscription.stripe_month_price_id;
				mode = 'payment';
			} else if (invoice.item.subscription_type === 'Add User') {
				const addtempPlan = new TempPlan({
					company_id: company._id,
					subscription_type: invoice.item.subscription_type,
					subscription_amount: invoice.amount,
				});

				var genplan = await addtempPlan.save();
				if (company.plan.subscription_type === 'Free Trial') {
					return res.status(400).json('Cannot add user in free trial');
				}
				var subscription = await Subscriptions.findOne({
					title: company.plan.subscription_type,
				});
				if (!subscription)
					return res.status(400).json('Plan does not exist anymore!');
				price = subscription.stripe_cpu_price_id;
				mode = 'payment';
			} else {
				var latInv = await stripe.invoices.retrieve(invoice.stripe_invoice_id);
				const data = {
					message: 'Success!',
					link: latInv.hosted_invoice_url,
				};
				return res.json(data);

				// if (company.stripeCustomerId === null) {
				// 	var customerId = await Stripe.customers.create({
				// 		email: company.email,
				// 		name: company.name,
				// 		// payment_method: payment_Intent,
				// 		// invoice_settings: { default_payment_method: pay },
				// 	});

				// 	company.stripeCustomerId = customerId.id;
				// 	await company.save();
				// }

				// var subscription = await Subscriptions.findOne({
				// 	title: invoice.item.subscription_type,
				// });
				// if (!subscription)
				// 	return res.status(400).json('Plan does not exist anymore!');

				// const addtempPlan = new TempPlan({
				// 	company_id: company._id,
				// 	subscription_type: invoice.item.subscription_type,
				// 	credits: invoice.item.subscription_credits,
				// 	validity: invoice.item.subscription_validity,
				// 	subscription_amount: invoice.amount,
				// 	stripe_cpc_price_id: subscription.stripe_cpc_price_id,
				// 	stripe_cpu_price_id: subscription.stripe_cpu_price_id,
				// 	cost_per_credit: invoice.item.cost_per_credit,
				// 	cost_per_user: invoice.item.cost_per_user,
				// 	max_members: invoice.item.subscription_max_members,
				// });

				// var genplan = await addtempPlan.save();
				// price = subscription.stripe_month_price_id;
				// if (genplan.validity === 365) {
				// 	price = subscription.stripe_annual_price_id;
				// }
				// mode = 'subscription';
			}

			if (req.body.payment_gateway === 'STRIPE') {
				const session = await stripe.checkout.sessions.create({
					customer_email: company.email,
					customer: company.stripeCustomerId,
					line_items: [
						{
							price: price,
							quantity: quantity,
						},
					],
					mode: mode,
					success_url: `${process.env.BackendURL}/company/plans/successPaymentNow?trans_id=${genplan._id}&invoice_id=${invoice._id}`,
					cancel_url: `${process.env.BackendURL}/company/plans/failPaymentNow?trans_id=${genplan._id}&invoice_id=${invoice._id}`,
				});

				genplan.paymentIntent = session.id;
				genplan.mode = mode;
				await genplan.save();

				const data = {
					message: 'Success!',
					link: session.url,
				};
				return res.json(data);
			}

			if (req.body.payment_gateway === 'PAYPAL') {
				let usdAmount = amount * 0.013;
				usdAmount = usdAmount.toFixed(2);
				usdAmount = usdAmount.toString();

				const create_payment = {
					intent: 'sale',
					payer: {
						payment_method: 'paypal',
					},
					redirect_urls: {
						return_url: `${process.env.BackendURL}/company/plans/successPaypalNow?trans_id=${genplan._id}&invoice_id=${invoice._id}`,
						cancel_url: `${process.env.BackendURL}/company/plans/failPaymentNow?trans_id=${genplan._id}&invoice_id=${invoice._id}`,
					},
					transactions: [
						{
							item_list: {
								items: [
									{
										name: subscription.title,
										price: usdAmount,
										currency: 'USD',
										quantity: 1,
									},
								],
							},
							amount: {
								currency: 'USD',
								total: usdAmount,
							},
							description: subscription.desc,
						},
					],
				};

				paypal.payment.create(create_payment, function (error, payment) {
					if (error) {
						console.log(error.response.details);
						return res.status(400).json('There was some paypal error!');
					} else {
						for (let i = 0; i < payment.links.length; i++) {
							if (payment.links[i].rel === 'approval_url') {
								const data = {
									message: 'Success!',
									link: payment.links[i].href,
								};

								return res.json(data);
							}
						}
					}
				});
			}
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get('/successPaymentNow', async (req, res) => {
	try {
		const tmpTrans = await TempPlan.findById(
			mongoose.Types.ObjectId(req.query.trans_id)
		);
		if (!tmpTrans) return res.status(400).json('transaction not found!');

		const company = await Companies.findById(tmpTrans.company_id);
		if (!company) return res.status(400).json('Company not found!');

		const invoice = await Invoices.findOne({
			_id: mongoose.Types.ObjectId(req.query.invoice_id),
		});
		if (!invoice) return res.status(400).json('Invoice not found!');

		let date = new Date();
		date.setMonth(date.getMonth() + 1);
		date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		if (tmpTrans?.validity === 365) {
			date.setFullYear(date.getFullYear() + 1);
			date.setMonth(date.getMonth() - 1);
		}

		let paymentId;
		let subId;
		let InvoiceId;
		let cardNumber;

		if (tmpTrans && tmpTrans.paymentIntent) {
			var paymentIntent;
			const session = await stripe.checkout.sessions.retrieve(
				tmpTrans.paymentIntent
			);
			if (tmpTrans.mode === 'payment') {
				paymentIntent = await stripe.paymentIntents.retrieve(
					session.payment_intent
				);
				paymentId = session.payment_intent;
			} else {
				var subs = await stripe.subscriptions.retrieve(session.subscription);

				var latInv = await stripe.invoices.retrieve(subs.latest_invoice);
				paymentIntent = await stripe.paymentIntents.retrieve(
					latInv.payment_intent
				);
				date = new Date(subs.current_period_end * 1000)?.toISOString();
				InvoiceId = subs.latest_invoice;
				subId = session.subscription;
				paymentId = latInv.payment_intent;
			}
			const paymentMethod = await stripe.paymentMethods.retrieve(
				paymentIntent?.payment_method
			);

			cardNumber = paymentMethod?.card?.last4;
		}

		if (tmpTrans.mode === 'subscription') {
			const plan = await Plans.findById(company.plan);
			plan.isExpired = false;
			plan.subId = subId;
			plan.stripe_invoice_id = InvoiceId;
			plan.payment_mode = 'Stripe';
			plan.subscription_end_date = date;
			plan.subscription_amount_status = true;
			await plan.save();

			//First Promotor
			await axios.post(
				'https://firstpromoter.com/api/v1/track/sale',
				{
					email: company.email,
					event_id: paymentId,
					amount: tmpTrans.subscription_amount * 100,
					currency: 'USD',
				},
				{
					headers: {
						'x-api-key': `${process.env.FPROM_KEY}`,
						'Content-Type': 'application/json',
					},
				}
			);
		}

		await CompanyTransaction.create({
			company_id: tmpTrans.company_id,
			subscription_type: tmpTrans.subscription_type,
			subscription_amount: tmpTrans.subscription_amount,
			subscription_amount_status: true,
			payment_mode: 'Stripe',
			card_info: cardNumber,
			txnId: paymentId,
		});

		// const newPlan = await Plans.findById(company.plan._id);
		// newPlan.payment_mode = 'Stripe';
		// newPlan.subscription_amount_status = true;
		// await newPlan.save();

		// const transaction = await new Transaction({
		// 	payment_intent_id: tmpTrans.payment_intent_id,
		// 	company_id: tmpTrans.company_id,
		// 	type: 'Subscription',
		// 	credit_count: tmpTrans.credit_count,
		// 	amount: tmpTrans.amount,
		// 	payment_mode: tmpTrans.payment_mode,
		// 	card_info:
		// 		paymentIntent.charges.data[0].payment_method_details.card.last4,
		// });

		// company.credits = tmpTrans.credit_count;
		// company.totalCredits = tmpTrans.credit_count;

		//const newTransaction = await transaction.save();

		// transaction.invoices.push(invoice._id);
		// console.log(company);

		await company.save();

		//await transaction.save();
		invoice.status = true;
		invoice.stripe_invoice_id = InvoiceId;
		invoice.item.paymentMode = 'Stripe';
		invoice.card_info = cardNumber;
		await invoice.save();

		// if (tmpTrans.subscription_type === 'Assign Credits') {
		// 	const msg = {
		// 		to: company.email,
		// 		from: 'team@emailaddress.ai',
		// 		subject: `Additional credits purchase is complete`,
		// 		html: `<p>Thank you for purchasing additional credits.</p><br />
		// 	<p>Your Invoice would be available in your billing section and your credits would be added to your account shortly.</p><br />
		// 	<p>If you have any questions on billing or onboarding, contact us via Live Chat or email us at team@emailaddress.ai</p><br/>
		// 	<p>We truly appreciate your business.!</p><br />
		// 	<p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
		// 	};

		// 	sgMail
		// 		.send(msg)
		// 		.then(() => console.log('Welcome Mail Sent!'))
		// 		.catch((err) => console.log('Error: ' + err));
		// } else {
		// 	const msg = {
		// 		to: company.email,
		// 		from: 'team@emailaddress.ai',
		// 		subject: `Your Purchase is complete`,
		// 		html: `<p>Thank you for purchasing a paid plan on EmailAddress.ai.</p><br />
		// 	<p>Your Invoice would be available in your billing section and your plan will be activated shortly.</p><br />
		// 	<p>If you have any questions on billing or onboarding, contact us via Live Chat or email us at team@emailaddress.ai</p><br/>
		// 	<p>We truly appreciate your business.!</p><br />
		// 	<p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
		// 	};

		// 	sgMail
		// 		.send(msg)
		// 		.then(() => console.log('Welcome Mail Sent!'))
		// 		.catch((err) => console.log('Error: ' + err));
		// }

		const addCompanyActivityLog = new CompanyActivityLogs({
			company: company._id,
			heading: 'Subscription / Extra features',
			message: 'Bought ' + tmpTrans.subscription_type + ' using Stripe.',
		});

		await addCompanyActivityLog.save();

		return res
			.status(200)
			.redirect(`${process.env.FrontendURL}/thankyou?status=success`);
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl},UserType: null, User: null`
		);
		const tmpTrans = await TempPlan.findById(
			mongoose.Types.ObjectId(req.query.trans_id)
		);
		if (tmpTrans) {
			await CompanyTransaction.create({
				company_id: tmpTrans.company_id,
				subscription_type: tmpTrans.subscription_type,
				subscription_amount: tmpTrans.subscription_amount,
				subscription_amount_status: false,
				payment_mode: 'Stripe',
				txnId: tmpTrans.payment_intent_id,
			});
			await Activities.create({
				company: tmpTrans.company_id,
				heading: 'Transaction Failed',
				message: `${tmpTrans.type} Payment failed`,
			});
			await tmpTrans.remove();
			return res
				.status(200)
				.redirect(`${process.env.FrontendURL}/failed?status=fail`);
		}
		return res.status(200).redirect(`${process.env.FrontendURL}/billing`);
	}
});

router.get('/successPaypalNow', async (req, res) => {
	try {
		const payerId = req.query.PayerID;
		const paymentId = req.query.paymentId;

		const tmpTrans = await TempPlan.findById(
			mongoose.Types.ObjectId(req.query.trans_id)
		);
		if (!tmpTrans) return res.status(400).json('Plan not found!');

		const invoice = await Invoices.findOne({
			_id: mongoose.Types.ObjectId(req.query.invoice_id),
			company: company._id,
		});
		if (!invoice) return res.status(400).json('Invoice not found!');

		let usdAmount = tmpTrans.amount * 0.013;
		usdAmount = usdAmount.toFixed(2);
		usdAmount = usdAmount.toString();

		const execute_payment_json = {
			payer_id: payerId,
			transactions: [
				{
					amount: {
						currency: 'USD',
						total: usdAmount,
					},
				},
			],
		};

		paypal.payment.execute(
			paymentId,
			execute_payment_json,
			async function (error, payment) {
				if (error) {
					console.log(error.response.details);
					return res.redirect(
						`${process.env.FrontendURL}/failed?message=${error.response}`
					);
				} else {
					const company = await Companies.findById(tmpTrans.company_id);

					if (!company) return res.status(400).json('Company not found!');
					// if (company.plan.subscription_type !== 'Free Trial') {
					// 	company.previous_plans.push(company.plan._id);
					// }

					const transaction = await new Transaction({
						payment_intent_id: paymentId,
						company_id: tmpTrans.company_id,
						type: 'Subscription',
						credit_count: tmpTrans.credit_count,
						amount: tmpTrans.amount,
						payment_mode: tmpTrans.payment_mode,
					});
					const comTrans = await CompanyTransaction.create({
						company_id: tmpTrans.company_id,
						subscription_type: tmpTrans.subscription_type,
						subscription_amount: tmpTrans.subscription_amount,
						subscription_amount_status: true,
						payment_mode: 'Paypal',
					});

					let date = new Date();
					date.setDate(date.getDate() + tmpTrans.validity);

					date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

					// const createNewPlan = new Plans({
					// 	subscription_type: tmpTrans.subscription_type,
					// 	credits: tmpTrans.credits,
					// 	subscription_amount: tmpTrans.subscription_amount,
					// 	subscription_end_date: date,
					// 	subscription_amount_status: true,
					// 	payment_mode: 'Paypal',
					// 	stripe_cpc_price_id: tmpTrans.stripe_cpc_price_id,
					// 	stripe_cpu_price_id: tmpTrans.stripe_cpu_price_id,
					// 	cost_per_credit: tmpTrans.cost_per_credit,
					// 	cost_per_user: tmpTrans.cost_per_user,
					// 	max_members: tmpTrans.max_members,
					// });

					// const newPlan = createNewPlan.save();
					const newPlan = await Plans.findById(company.plan._id);
					newPlan.payment_mode = 'Paypal';
					newPlan.subscription_amount_status = true;
					await newPlan.save();
					// company.plan = newPlan;
					// company.credits = tmpTrans.credit_count;
					// company.totalCredits = tmpTrans.credit_count;

					// const newTransaction = await transaction.save();

					//company.invoices.push(invoice._id);
					// transaction.invoices.push(invoice._id);
					// console.log(company);
					invoice.status = true;
					await invoice.save();

					await company.save();

					await transaction.save();

					// 		if (tmpTrans.subscription_type === 'Assign Credits') {
					// 			const msg = {
					// 				to: company.email,
					// 				from: 'team@emailaddress.ai',
					// 				subject: `Additional credits purchase is complete`,
					// 				html: `<p>Thank you for purchasing additional credits.</p><br />
					// <p>Your Invoice would be available in your billing section and your credits would be added to your account shortly.</p><br />
					// <p>If you have any questions on billing or onboarding, contact us via Live Chat or email us at team@emailaddress.ai</p><br/>
					// <p>We truly appreciate your business.!</p><br />
					// <p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
					// 			};

					// 			sgMail
					// 				.send(msg)
					// 				.then(() => console.log('Welcome Mail Sent!'))
					// 				.catch((err) => console.log('Error: ' + err));
					// 		} else {
					// 			const msg = {
					// 				to: company.email,
					// 				from: 'team@emailaddress.ai',
					// 				subject: `Your Purchase is complete`,
					// 				html: `<p>Thank you for purchasing a paid plan on EmailAddress.ai.</p><br />
					// <p>Your Invoice would be available in your billing section and your plan will be activated shortly.</p><br />
					// <p>If you have any questions on billing or onboarding, contact us via Live Chat or email us at team@emailaddress.ai</p><br/>
					// <p>We truly appreciate your business.!</p><br />
					// <p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
					// 			};

					// 			sgMail
					// 				.send(msg)
					// 				.then(() => console.log('Welcome Mail Sent!'))
					// 				.catch((err) => console.log('Error: ' + err));
					// 		}

					const addCompanyActivityLog = new CompanyActivityLogs({
						company: company._id,
						heading: 'Subscription',
						message:
							'Bought ' +
							tmpTrans.subscription_type +
							' subscription using Paypal.',
					});

					await addCompanyActivityLog.save();

					return res
						.status(200)
						.redirect(`${process.env.FrontendURL}/thankyou?status=success`);
				}
			}
		);
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl},UserType: null, User: null`
		);
		const tmpTrans = await TempPlan.findById(
			mongoose.Types.ObjectId(req.query.trans_id)
		);
		if (tmpTrans) {
			const comTrans = await CompanyTransaction.create({
				company_id: tmpTrans.company_id,
				subscription_type: tmpTrans.subscription_type,
				subscription_amount: tmpTrans.subscription_amount,
				subscription_amount_status: false,
				payment_mode: 'Paypal',
			});
			const activity = await Activities.create({
				company: tmpTrans.company_id,
				heading: 'Transaction Failed',
				message: `${tmpTrans.type} Payment failed`,
			});
			await tmpTrans.remove();
		}
		console.log(error);
		res.status(400).redirect(`${process.env.FrontendURL}/failed?status=fail`);
	}
});

router.get('/failPaymentNow', async (req, res) => {
	try {
		const tmpTrans = await TempPlan.findById(
			mongoose.Types.ObjectId(req.query.trans_id)
		);
		if (tmpTrans) {
			const activity = await Activities.create({
				company: tmpTrans.company_id,
				heading: 'Transaction Failed',
				message: `${tmpTrans.type} Payment failed`,
			});
			await tmpTrans.remove();
			return res.status(200).redirect(`${process.env.FrontendURL}/billing`);
		}
		return res.status(200).redirect(`${process.env.FrontendURL}/billing`);
	} catch (err) {
		dashLogger.error(
			`Error : ${err}, Request : ${req.originalUrl},UserType: null, User: null`
		);
		res.status(400).json(err.message);
	}
});

router.post(
	'/buyPlan',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			if (req.body.subscription_id === '' || req.body.subscription_id == null)
				return res.status(400).json('Subscription Id is required!');
			if (req.body.subscription_id.length < 6)
				return res
					.status(400)
					.json('Subscription Id should be at least 6 characters!');

			const company = await Companies.findById(req.user.id).populate('plan');
			if (!company) return res.status(400).json('Company not found!');

			const subscription_id = mongoose.Types.ObjectId(req.body.subscription_id);

			const subscription = await Subscriptions.findById(subscription_id);
			if (!subscription) return res.status(400).json('Subscription not found!');

			if (
				company.members.length + company.invites.length >
				subscription.no_of_user
			)
				return res.status(400).json('Please select a higher plan');

			if (company.stripeCustomerId === null) {
				var customerId = await Stripe.customers.create({
					email: company.email,
					name: company.name,
					// payment_method: payment_Intent,
					// invoice_settings: { default_payment_method: pay },
				});

				company.stripeCustomerId = customerId.id;
				await company.save();
			}

			var validity_days = 30;
			var credits = subscription.monthly_credits;
			var amount = subscription.monthly_amount;
			var price = subscription.stripe_month_price_id;
			if (req.body.isAnnual) {
				validity_days = 365;
				price = subscription.stripe_annual_price_id;
				amount = subscription.annually_amount;
				credits = subscription.annually_credits;
			}
			const addtempPlan = new TempPlan({
				company_id: company._id,
				subscription_type: subscription.title,
				isAnnual: req.body.isAnnual,
				credits: credits,
				validity: validity_days,
				subscription_amount: amount,
				stripe_cpc_price_id: subscription.stripe_cpc_price_id,
				stripe_cpu_price_id: subscription.stripe_cpu_price_id,
				cost_per_credit: subscription.cost_per_credit,
				cost_per_user: subscription.cost_per_user,
				max_members: subscription.no_of_user,
			});

			const genplan = await addtempPlan.save();

			if (req.body.payment_gateway === 'STRIPE') {
				const session = await stripe.checkout.sessions.create({
					customer_email: company.email,
					customer: company.stripeCustomerId,
					line_items: [
						{
							price: price,
							quantity: 1,
						},
					],
					mode: 'subscription',
					success_url: `${process.env.BackendURL}/company/plans/successPayment?plan_id=${genplan._id}`,
					cancel_url: `${process.env.FrontendURL}/billing`,
				});

				// var stripeSubscriptionId = await stripe.subscription.retrieve(
				// 	session.subscription
				// );
				// var paymentIntent = await stripe.paymentIntents.retrieve(
				// 	session.payment_intent
				// );
				// genplan.card_info =
				// 	paymentIntent.charges.data[0].payment_method_details.card.last4;

				genplan.paymentIntent = session.id;
				await genplan.save();

				// await Transaction.create({
				// 	subscription: session.id,
				// 	company_id: company._id,
				// });

				const data = {
					message: 'Success!',
					link: session.url,
					data: session,
				};
				return res.json(data);
			}

			if (req.body.payment_gateway === 'PAYPAL') {
				let usdAmount = amount * 0.013;
				usdAmount = usdAmount.toFixed(2);
				usdAmount = usdAmount.toString();

				const create_payment = {
					intent: 'sale',
					payer: {
						payment_method: 'paypal',
					},
					redirect_urls: {
						return_url: `${process.env.BackendURL}/company/plans/successPaypal?plan_id=${genplan._id}`,
						cancel_url: `${process.env.BackendURL}/company/plans/failPayment?plan_id=${genplan._id}`,
					},
					transactions: [
						{
							item_list: {
								items: [
									{
										name: subscription.title,
										price: usdAmount,
										currency: 'USD',
										quantity: 1,
									},
								],
							},
							amount: {
								currency: 'USD',
								total: usdAmount,
							},
							description: subscription.desc,
						},
					],
				};

				paypal.payment.create(create_payment, function (error, payment) {
					if (error) {
						console.log(error.response.details);
						return res.status(400).json('There was some paypal error!');
					} else {
						for (let i = 0; i < payment.links.length; i++) {
							if (payment.links[i].rel === 'approval_url') {
								const data = {
									message: 'Success!',
									link: payment.links[i].href,
								};

								return res.json(data);
							}
						}
					}
				});
			}
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get('/successPayment', async (req, res) => {
	try {
		const temp_plan = await TempPlan.findById(
			mongoose.Types.ObjectId(req.query.plan_id)
		);
		if (!temp_plan) return res.status(400).json('Plan not found!');

		const company = await Companies.findById(temp_plan.company_id).populate(
			'plan'
		);
		if (!company) return res.status(400).json('Company not found!');

		if (company?.planType !== 'PYG') {
			company.previous_plans.push(company.plan._id);
		}

		let date = new Date();
		date.setMonth(date.getMonth() + 1);
		date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		var billingType = 'Monthly';
		if (temp_plan.isAnnual === true) {
			date.setFullYear(date.getFullYear() + 1);
			date.setMonth(date.getMonth() - 1);
			billingType = 'Annually';
		}

		let cardNumber;
		let InvoiceId;
		let paymentId;
		let subId;

		if (temp_plan.paymentIntent) {
			const session = await stripe.checkout.sessions.retrieve(
				temp_plan.paymentIntent
			);
			var subs = await stripe.subscriptions.retrieve(session.subscription);
			subId = session.subscription;

			InvoiceId = subs.latest_invoice;
			var latInv = await stripe.invoices.retrieve(subs.latest_invoice);

			var paymentIntent = await stripe.paymentIntents.retrieve(
				latInv.payment_intent
			);
			paymentId = latInv?.payment_intent;
			date = new Date(subs.current_period_end * 1000)?.toISOString();

			const paymentMethod = await stripe.paymentMethods.retrieve(
				paymentIntent?.payment_method
			);

			cardNumber = paymentMethod?.card?.last4;
		}

		if (company?.plan?.stripe_subscription_id) {
			await stripe.subscriptions.cancel(company.plan.stripe_subscription_id);
		}

		const createNewPlan = new Plans({
			subscription_type: temp_plan.subscription_type,
			isAnnual: temp_plan.isAnnual,
			credits: temp_plan.credits,
			validity: temp_plan.validity,
			subscription_amount: temp_plan.subscription_amount,
			subscription_end_date: date,
			subscription_amount_status: true,
			payment_mode: 'Stripe',
			stripe_invoice_id: InvoiceId,
			stripe_subscription_id: subId,
			stripe_cpc_price_id: temp_plan.stripe_cpc_price_id,
			cost_per_credit: temp_plan.cost_per_credit,
			stripe_cpu_price_id: temp_plan.stripe_cpu_price_id,
			cost_per_user: temp_plan.cost_per_user,
			max_members: temp_plan.max_members,
			card_info: cardNumber,
		});

		company.credits += temp_plan.credits;
		company.totalCredits += temp_plan.credits;
		company.planType = 'Monthly';

		const new_plan = await createNewPlan.save();
		const comTrans = await CompanyTransaction.create({
			company_id: company._id,
			subscription_type: temp_plan.subscription_type,
			subscription_amount: temp_plan.subscription_amount,
			subscription_amount_status: true,
			payment_mode: 'Stripe',
			txnId: paymentId,
			card_info: cardNumber,
		});
		// console.log(new_plan);
		company.plan = new_plan;

		const createInvoice = new Invoices({
			name: 'Subscription',
			company: company._id,
			from: {
				name: 'EmailAddress.ai',
				address: '447 Broadway, 2nd floor, #713',
				address2: 'NewYork, NY 10013, USA',
				email: 'team@emailaddress.ai',
			},
			status: true,
			stripe_invoice_id: InvoiceId,
			item: {
				subscription_type: temp_plan.subscription_type,
				subscription_credits: temp_plan.credits,
				subscription_description: 'temp desc',
				subscription_validity: temp_plan.validity,
				subscription_max_members: temp_plan.max_members,
				endDate: date,
				billingType: billingType,
				paymentMode: 'Stripe',
			},
			amount: temp_plan.subscription_amount,
			card_info: cardNumber,
		});

		const invoice = await createInvoice.save();

		company.invoices.push(invoice._id);
		// transaction.invoices.push(invoice._id);
		// console.log(company);
		await company.plan.save();

		await company.save();

		await axios.post(
			'https://firstpromoter.com/api/v1/track/sale',
			{
				email: company.email,
				event_id: paymentId,
				amount: temp_plan.subscription_amount * 100,
				currency: 'USD',
			},
			{
				headers: {
					'x-api-key': `${process.env.FPROM_KEY}`,
					'Content-Type': 'application/json',
				},
			}
		);

		//await transaction.save();

		const addCompanyActivityLog = new CompanyActivityLogs({
			company: company._id,
			heading: 'Subscription',
			message:
				'Bought ' + temp_plan.subscription_type + ' subscription using Stripe.',
		});

		await addCompanyActivityLog.save();

		const msg = {
			to: company.email,
			from: 'team@emailaddress.ai',
			subject: `Your Purchase is complete`,
			html: `<p>Thank you for purchasing a paid plan on EmailAddress.ai.</p><br />
			<p>Your Invoice would be available in your billing section and your plan will be activated shortly.</p><br />
			<p>If you have any questions on billing or onboarding, contact us via Live Chat or email us at team@emailaddress.ai</p><br/>
			<p>We truly appreciate your business.!</p><br />
			<p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
		};

		// sgMail
		// 	.send(msg)
		// 	.then(() => console.log('Welcome Mail Sent!'))
		// 	.catch((err) => console.log('Error: ' + err));
		transport.sendMail(msg, (err, info) => {
			if (err) {
				console.log('Error: ' + err);
			} else {
				console.log('Mail Sent!');
			}
		});

		return res
			.status(200)
			.redirect(`${process.env.FrontendURL}/thankyou?status=success`);
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl},UserType: null, User: null`
		);
		console.log(error.message);
		const tmpPlan = await TempPlan.findById(
			mongoose.Types.ObjectId(req.query.plan_id)
		);
		if (tmpPlan) {
			await CompanyTransaction.create({
				company_id: tmpPlan.company_id,
				subscription_type: tmpPlan.subscription_type,
				subscription_amount: tmpPlan.subscription_amount,
				subscription_amount_status: false,
				payment_mode: 'Stripe',
				txnId: tmpPlan.payment_intent_id,
			});
			await Activities.create({
				company: tmpPlan.company_id,
				heading: 'Transaction Failed',
				message: `${tmpPlan.subscription_type} Payment failed`,
			});
			await tmpPlan.remove();
			return res
				.status(400)
				.redirect(`${process.env.FrontendURL}/failed?status=fail`);
		}
		return res.status(400).redirect(`${process.env.FrontendURL}/billing`);
	}
});

router.get('/failPayment', async (req, res) => {
	try {
		const temp_plan = await TempPlan.findById(
			mongoose.Types.ObjectId(req.query.plan_id)
		);
		const invoice = await Invoices.findById(
			mongoose.Types.req.query.invoice_id
		);
		// if (!temp_plan) return res.status(400).json("Plan not found!");

		if (temp_plan && invoice) {
			const activity = await Activities.create({
				company: temp_plan.company_id,
				heading: 'Invoice Transaction Failed',
				message: `Invoice Payment for ${temp_plan.subscription_type} failed`,
			});
			await temp_plan.remove();
			invoice.status = false;
			await invoice.save();
			return res.redirect(`${process.env.FrontendURL}/billing`);
		} else if (temp_plan) {
			const activity = await Activities.create({
				company: temp_plan.company_id,
				heading: 'Transaction Failed',
				message: `${temp_plan.subscription_type} Payment failed`,
			});
			await temp_plan.remove();
			return res.redirect(`${process.env.FrontendURL}/billing`);
		}

		return res.redirect(`${process.env.FrontendURL}/billing`);
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl},UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

router.post(
	'/buyProductPlan',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			if (req.body.subscription_id === '' || req.body.subscription_id == null)
				return res.status(400).json('Subscription Id is required!');
			if (req.body.subscription_id.length < 6)
				return res
					.status(400)
					.json('Subscription Id should be at least 6 characters!');

			const company = await Companies.findById(req.user.id).populate('plan');
			if (!company) return res.status(400).json('Company not found!');

			const subscription_id = mongoose.Types.ObjectId(req.body.subscription_id);

			const subscription = await Product.findById(subscription_id);
			if (!subscription) return res.status(400).json('Product not found!');

			var credits = subscription.monthly_credits;
			var amount = subscription.monthly_amount;
			var price = subscription.stripe_month_price_id;

			const tmpTrans = new tempTransactions({
				company_id: company._id,
				type: 'PAY AS YOU GO',
				credit_count: credits,
				amount: amount,
			});

			const genplan = await tmpTrans.save();

			if (req.body.payment_gateway === 'STRIPE') {
				const session = await stripe.checkout.sessions.create({
					customer_email: company.email,
					line_items: [
						{
							price: price,
							quantity: 1,
						},
					],
					mode: 'payment',
					success_url: `${process.env.BackendURL}/company/plans/successProdPayment?plan_id=${genplan._id}`,
					cancel_url: `${process.env.FrontendURL}/billing`,
				});

				// var stripeSubscriptionId = await stripe.subscription.retrieve(
				// 	session.subscription
				// );
				// var paymentIntent = await stripe.paymentIntents.retrieve(
				// 	session.payment_intent
				// );
				// genplan.card_info =
				// 	paymentIntent.charges.data[0].payment_method_details.card.last4;

				genplan.payment_intent_id = session.id;
				await genplan.save();

				// await Transaction.create({
				// 	subscription: session.id,
				// 	company_id: company._id,
				// });

				const data = {
					message: 'Success!',
					link: session.url,
					data: session,
				};
				return res.json(data);
			}
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl},UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get('/successProdPayment', async (req, res) => {
	try {
		const tmpTrans = await tempTransactions.findById(req.query.plan_id);
		if (!tmpTrans) return res.status(400).json('transaction not found!');

		const company = await Companies.findById(tmpTrans.company_id);
		if (!company) return res.status(400).json('Company not found!');

		// console.log(tmpTrans)
		let cardNumber;
		if (tmpTrans && tmpTrans.payment_intent_id) {
			const session = await stripe.checkout.sessions.retrieve(
				tmpTrans.payment_intent_id
			);
			var paymentIntent = await stripe.paymentIntents.retrieve(
				session.payment_intent
			);

			const paymentMethod = await stripe.paymentMethods.retrieve(
				paymentIntent?.payment_method
			);

			cardNumber = paymentMethod?.card?.last4;
		}

		// const transaction = await new Transaction({
		// 	payment_intent_id: tmpTrans.payment_intent_id,
		// 	company_id: tmpTrans.company_id,
		// 	type: 'EXTRA CREDIT',
		// 	credit_count: tmpTrans.credit_count,
		// 	amount: tmpTrans.amount,
		// 	payment_mode: tmpTrans.payment_mode,
		// 	card_info:
		// 		paymentIntent.charges.data[0].payment_method_details.card.last4,
		// });

		company.credits += tmpTrans.credit_count;
		company.totalCredits += tmpTrans.credit_count;

		// const newTransaction = await transaction.save();
		await CompanyTransaction.create({
			company_id: tmpTrans.company_id,
			subscription_type: 'PAY-AS-YOU-GO',
			subscription_amount: tmpTrans.amount,
			subscription_amount_status: true,
			payment_mode: 'Stripe',
			txnId: tmpTrans.payment_intent_id,
			card_info: cardNumber,
		});

		const createInvoice = new Invoices({
			name: 'PAY-AS-YOU-GO',
			company: company._id,
			from: {
				name: 'EmailAddress.ai',
				address: '447 Broadway, 2nd floor, #713',
				address2: 'NewYork, NY 10013, USA',
				email: 'team@emailaddress.ai',
			},
			status: true,
			item: {
				subscription_type: 'PAY-AS-YOU-GO',
				subscription_credits: tmpTrans.credit_count,
				subscription_validity: 0,
				endDate: null,
				billingType: 'One Time',
				paymentMode: 'Stripe',
			},
			amount: tmpTrans.amount,
			card_info: cardNumber,
		});

		const invoice = await createInvoice.save();

		company.invoices.push(invoice._id);

		await credit_usage.create({
			company: company._id,
			type: 'Credit',
			credits: tmpTrans.credit_count,
		});

		await company.save();
		const msg = {
			to: company.email,
			from: 'team@emailaddress.ai',
			subject: `Additional credits purchase is complete`,
			html: `<p>Thank you for purchasing credits.</p><br />
			<p>Your Invoice would be available in your billing section and your credits would be added to your account shortly.</p><br />
			<p>If you have any questions on billing or onboarding, contact us via Live Chat or email us at team@emailaddress.ai</p><br/>
			<p>We truly appreciate your business.!</p><br />
			<p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
		};

		// sgMail
		// 	.send(msg)
		// 	.then(() => console.log('Welcome Mail Sent!'))
		// 	.catch((err) => console.log('Error: ' + err));
		transport.sendMail(msg, (err, info) => {
			if (err) {
				console.log('Error: ' + err);
			} else {
				console.log('Mail Sent!');
			}
		});

		//await transaction.save();

		const addCompanyActivityLog = new CompanyActivityLogs({
			company: company._id,
			heading: 'PAY-AS-YOU-GO',
			message:
				'Bought ' +
				tmpTrans.credit_count +
				' pay as you go credits using Stripe.',
		});

		await addCompanyActivityLog.save();

		return res
			.status(200)
			.redirect(`${process.env.FrontendURL}/thankyou?status=success`);
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl},UserType: null, User: null`
		);
		console.log(error.message);
		const tmpTrans = await tempTransactions.findById(
			mongoose.Types.ObjectId(req.query.plan_id)
		);
		if (tmpTrans) {
			await CompanyTransaction.create({
				company_id: tmpTrans.company_id,
				subscription_type: 'PAY-AS-YOU-GO',
				subscription_amount: tmpTrans.amount,
				subscription_amount_status: false,
				payment_mode: 'Stripe',
				txnId: tmpTrans.payment_intent_id,
			});
			await Activities.create({
				company: tmpTrans.company_id,
				heading: 'Transaction Failed',
				message: `${tmpTrans.type} Payment failed`,
			});
			await tmpTrans.remove();
			return res.redirect(`${process.env.FrontendURL}/failed?status=fail`);
		}
		return res.status(400).redirect(`${process.env.FrontendURL}/billing`);
	}
});

router.get('/failProdPayment', async (req, res) => {
	try {
		const tmpTrans = await tempTransactions.findById(
			mongoose.Types.ObjectId(req.query.plan_id)
		);
		if (tmpTrans) {
			const activity = await Activities.create({
				company: tmpTrans.company_id,
				heading: 'Transaction Failed',
				message: `${tmpTrans.type} Payment failed`,
			});
			await tmpTrans.remove();
		}

		return res.redirect(`${process.env.FrontendURL}/billing`);
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl},UserType: null, User: null`
		);
		res.status(400).json(error.message);
	}
});

module.exports = router;
