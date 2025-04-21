/** @format */

const Activities = require('../../models/company/activity_log_model');
const tempTransactions = require('../../models/admin/temp_transaction_model');
const Transaction = require('../../models/admin/transaction_model');
const Companies = require('../../models/company/company_model');
const router = require('express').Router();
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const CompanyActivityLogs = require('../../models/company/activity_log_model');
const Invoices = require('../../models/company/invoice_model');
const { dashLogger } = require('../../logger');
const paypal = require('paypal-rest-sdk');
const authorize = require('../../helpers/authorize');
const Subscriptions = require('../../models/admin/subscription_model');

router.post(
	'/buyUsers_request',
	[authorize.verifyToken, authorize.accessCompany],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.user.id).populate('plan');
			if (!company) return res.status(400).json('Company not found!');

			// const subscription_id = mongoose.Types.ObjectId(company.plan.subscription_id);

			// const subscription = await Subscriptions.findById(subscription_id);
			// if (!subscription) return res.status(400).json("Subscription not found!");

			const user_request = {
				user_count: req.body.user_count,
				to: company._id,
				type: 'EXTRA USERS',
				amount: req.body.user_count * company.plan.cost_per_user,
			};

			const tmpTrans = new tempTransactions({
				company_id: company._id,
				type: 'EXTRA USER',
				user_count: user_request.user_count,
				amount: user_request.amount,
			});

			if (req.body.payment_gateway === 'STRIPE') {
				tmpTrans.payment_mode = 'Stripe';
				const session = await stripe.checkout.sessions.create({
					customer_email: company.email,
					line_items: [
						{
							price: company.plan.stripe_cpu_price_id,
							quantity: user_request.user_count,
						},
					],
					mode: 'payment',
					success_url: `${process.env.BackendURL}/company/credit/successPayment?trans_id=${tmpTrans._id}`,
					cancel_url: `${process.env.FrontendURL}/billing`,
				});

				//tmpTrans.payment_intent_id = session.payment_intent;

				tmpTrans.save();

				const data = {
					message: 'Success!',
					link: session.url,
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

router.get('/successPayment', async (req, res) => {
	try {
		const tmpTrans = await tempTransactions.findById(
			mongoose.Types.ObjectId(req.query.trans_id)
		);
		if (!tmpTrans) return res.status(400).json('transaction not found!');

		const company = await Companies.findById(tmpTrans.company_id);
		if (!company) return res.status(400).json('Company not found!');

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

		const transaction = await new Transaction({
			payment_intent_id: tmpTrans.payment_intent_id,
			company_id: tmpTrans.company_id,
			type: 'EXTRA USER',
			user_count: tmpTrans.user_count,
			amount: tmpTrans.amount,
			payment_mode: tmpTrans.payment_mode,
			card_info: cardNumber,
		});

		// company.credits += tmpTrans.credit_count;

		const newTransaction = await transaction.save();

		const createInvoice = new Invoices({
			name: 'EXTRA USERS',
			company: company._id,
			from: {
				name: 'EmailAddress.ai',
				address: '447 Broadway, 2nd floor, #713',
				address2: 'NewYork, NY 10013, USA',
				email: 'team@emailaddress.ai',
			},
			status: true,
			item: {
				subscription_type: 'EXTRA USERS',
				subscription_users: newTransaction.user_count,
			},
			amount: newTransaction.amount,
			card_info: cardNumber,
		});

		const invoice = await createInvoice.save();

		company.invoices.push(invoice._id);
		// transaction.invoices.push(invoice._id);
		// console.log(company);

		await company.save();

		await transaction.save();

		const addCompanyActivityLog = new CompanyActivityLogs({
			company: company._id,
			heading: 'EXTRA USER',
			message:
				'Bought ' +
				newTransaction.user_count +
				' extra users space using Stripe.',
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
						type: 'EXTRA USER',
						user_count: tmpTrans.user_count,
						amount: tmpTrans.amount,
						payment_mode: tmpTrans.payment_mode,
					});

					// company.credits += tmpTrans.credit_count;

					//await transaction.save();

					const createInvoice = new Invoices({
						name: 'EXTRA USERS',
						company: company._id,
						from: {
							name: 'HealthDBI',
							address: 'Mumbai',
							email: 'team@emailaddress.ai',
							mobile: '+91 9801234756',
						},
						status: true,
						item: {
							subscription_type: 'EXTRA USERS',
							subscription_users: transaction.user_count,
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
						heading: 'EXTRA USERS',
						message:
							'Bought ' +
							transaction.user_count +
							' extra users space using Paypal.',
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
			mongoose.Types.ObjectId(req.query?.trans_id)
		);
		if (tmpTrans) {
			const activity = await Activities.create({
				company: tmpTrans.company_id,
				heading: 'Transaction Failed',
				message: `${tmpTrans.type} Payment failed`,
			});
			await tmpTrans.remove();
		}
		res.status(200).redirect('${process.env.FrontendURL}/failed?status=failed');
	} catch (err) {
		dashLogger.error(
			`Error : ${err}, Request : ${req.originalUrl}, UserType: null, User: null`
		);
		res.status(400).json(err.message);
	}
});

module.exports = router;
