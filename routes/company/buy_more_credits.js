/** @format */

const Activities = require('../../models/company/activity_log_model');
const tempTransactions = require('../../models/admin/temp_transaction_model');
const Transaction = require('../../models/admin/transaction_model');
const Companies = require('../../models/company/company_model');
const router = require('express').Router();
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const CompanyTransaction = require('../../models/company/trans_model');
const CompanyActivityLogs = require('../../models/company/activity_log_model');
const Invoices = require('../../models/company/invoice_model');
const paypal = require('paypal-rest-sdk');
const authorize = require('../../helpers/authorize');
const { dashLogger } = require('../../logger');
const subscription_validater = require('../../helpers/subscription_validator');
const Subscriptions = require('../../models/admin/subscription_model');
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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

router.post(
	'/buyCredits_request',
	[authorize.verifyToken, subscription_validater, authorize.accessCompany],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).populate('plan');
			if (!company) return res.status(400).json('Company not found!');

			// const subscription_id = mongoose.Types.ObjectId(company.plan.subscription_id);

			// const subscription = await Subscriptions.findById(subscription_id);
			// if (!subscription) return res.status(400).json("Subscription not found!");

			const credit_request = {
				credit_count: req.body.credit_count,
				to: company._id,
				type: 'EXTRA CREDITS',
				amount: req.body.credit_count * company.plan.cost_per_credit,
			};

			const tmpTrans = new tempTransactions({
				company_id: company._id,
				type: 'EXTRA CREDIT',
				credit_count: credit_request.credit_count,
				amount: credit_request.amount,
			});

			if (req.body.payment_gateway === 'STRIPE') {
				tmpTrans.payment_mode = 'Stripe';
				const session = await stripe.checkout.sessions.create({
					customer_email: company.email,
					line_items: [
						{
							price: company.plan.stripe_cpc_price_id,
							quantity: credit_request.credit_count,
						},
					],
					mode: 'payment',
					success_url: `${process.env.BackendURL}/company/credit/successPayment?trans_id=${tmpTrans._id}`,
					cancel_url: `${process.env.FrontendURL}/billing`,
				});

				tmpTrans.payment_intent_id = session.id;

				tmpTrans.save();

				const data = {
					message: 'Success!',
					link: session.url,
					data: session,
				};
				return res.json(data);
			}
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, Username: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get('/successPayment', async (req, res) => {
	try {
		const tmpTrans = await tempTransactions.findById(req.query.trans_id);
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
		const comTrans = await CompanyTransaction.create({
			company_id: tmpTrans.company_id,
			subscription_type: 'Extra Credits',
			subscription_amount: tmpTrans.amount,
			subscription_amount_status: true,
			payment_mode: 'Stripe',
			txnId: tmpTrans.payment_intent_id,
			card_info: cardNumber,
		});

		const createInvoice = new Invoices({
			name: 'EXTRA CREDIT',
			company: company._id,
			from: {
				name: 'EmailAddress.ai',
				address: '447 Broadway, 2nd floor, #713',
				address2: 'NewYork, NY 10013, USA',
				email: 'team@emailaddress.ai',
			},
			status: true,
			item: {
				subscription_type: 'EXTRA CREDIT',
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
		// transaction.invoices.push(invoice._id);
		// console.log(company);

		await company.save();
		const msg = {
			to: company.email,
			from: process.env.EMAIL_USERNAME,
			subject: `Additional credits purchase is complete`,
			html: `<p>Thank you for purchasing additional credits.</p><br />
			<p>Your Invoice would be available in your profile section and your credits would be added to your account shortly.</p><br />
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
			heading: 'EXTRA CREDIT',
			message:
				'Bought ' + tmpTrans.credit_count + ' extra credits using Stripe.',
		});

		await addCompanyActivityLog.save();

		return res
			.status(200)
			.redirect(`${process.env.FrontendURL}/thankyou?status=success`);
	} catch (error) {
		dashLogger.error(
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		const tmpTrans = await tempTransactions.findById(
			mongoose.Types.ObjectId(req.query.trans_id)
		);
		if (tmpTrans) {
			const comTrans = await CompanyTransaction.create({
				company_id: tmpTrans.company_id,
				subscription_type: 'Extra Credits',
				subscription_amount: tmpTrans.amount,
				subscription_amount_status: false,
				payment_mode: 'Stripe',
			});
			const activity = await Activities.create({
				company: tmpTrans.company_id,
				heading: 'Transaction Failed',
				message: `${tmpTrans.type} Payment failed`,
			});
			await tmpTrans.remove();
		}
		res.status(400).redirect(`${process.env.FrontendURL}/failed?status=fail`);
	}
});

router.get('/successPaypal', async (req, res) => {
	try {
		const payerId = req.query.PayerID;
		const paymentId = req.query.paymentId;

		const tmpTrans = await tempTransactions.findById(
			mongoose.Types.ObjectId(req.query.trans_id)
		);
		if (!tmpTrans) return res.status(400).json('Plan not found!');

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

					const transaction = await new Transaction({
						payment_intent_id: paymentId,
						company_id: tmpTrans.company_id,
						type: 'EXTRA CREDIT',
						credit_count: tmpTrans.credit_count,
						amount: tmpTrans.amount,
						payment_mode: tmpTrans.payment_mode,
					});

					company.credits += tmpTrans.credit_count;
					company.totalCredits += tmpTrans.credit_count;

					// const newTransaction = await transaction.save();
					const comTrans = await CompanyTransaction.create({
						company_id: tmpTrans.company_id,
						subscription_type: tmpTrans.subscription_type,
						subscription_amount: tmpTrans.subscription_amount,
						subscription_amount_status: true,
						payment_mode: 'Paypal',
					});

					const createInvoice = new Invoices({
						name: 'EXTRA CREDIT',
						company: company._id,
						from: {
							name: 'HealthDBI',
							address: 'Mumbai',
							email: 'team@emailaddress.ai',
							mobile: '+91 9801234756',
						},
						status: true,
						item: {
							subscription_type: 'EXTRA CREDIT',
							subscription_credits: transaction.credit_count,
						},
						amount: transaction.amount,
					});

					const invoice = await createInvoice.save();

					company.invoices.push(invoice._id);
					// transaction.invoices.push(invoice._id);
					// console.log(company);

					await company.save();

					await transaction.save();

					const addCompanyActivityLog = new CompanyActivityLogs({
						company: company._id,
						heading: 'EXTRA CREDIT',
						message:
							'Bought ' +
							transaction.credit_count +
							' extra credits using Paypal.',
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
			`Error : ${error}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		const tmpTrans = await tempTransactions.findById(
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

router.get('/failPayment', async (req, res) => {
	try {
		const tmpTrans = await tempTransactions.findById(
			mongoose.Types.ObjectId(req.query.trans_id)
		);
		if (tmpTrans) {
			const activity = await Activities.create({
				company: tmpTrans.company_id,
				heading: 'Transaction Failed',
				message: `${tmpTrans.type} Payment failed`,
			});
			await tmpTrans.remove();
		}
		res.status(200).redirect(`${process.env.FrontendURL}/failed?status=fail`);
	} catch (err) {
		dashLogger.error(
			`Error : ${err}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(err.message);
	}
});

module.exports = router;
