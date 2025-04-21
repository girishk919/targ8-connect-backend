/** @format */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const axios = require('axios');
const csvtojson = require('csvtojson');
var papaparse = require('papaparse');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fastcsv = require('fast-csv');
const fs = require('fs');
const FormData = require('form-data');

const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3333;

app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ limit: '2gb', extended: true }));
app.use(cors());
app.use(compression());

const apiLimiter = rateLimit({
	windowMs: 1 * 1000, // 1 second window
	max: 40, // Limit each IP to 40 requests per second
	message: 'Too many requests, please try again after a minute.',
	keyGenerator: (req) => req.ip, // Use IP address to limit requests per user (you can also use API key or user ID)
});

app.use(function (req, res, next) {
	req.setTimeout(25 * 1000 * 60, function () {
		// call back function is called when request timed out.
	});
	5;
	next();
});

const uri = process.env.ATLAS_URI;

const connectDb = () => {
	mongoose
		.connect(uri, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
		.then(() => {
			console.log('Database is connected...');
		})
		.catch((error) => {
			console.log('Error:', error.message);
		});
};

connectDb();

const adminAuthRouter = require('./routes/admin/authentication');
app.use('/admin/auth', adminAuthRouter);

const tabsRouter = require('./routes/admin/tabs');
app.use('/admin/tabs', tabsRouter);

const subadminRouter = require('./routes/admin/sub_admin');
app.use('/admin/subadmin/', subadminRouter);

const adminDashboardRouter = require('./routes/admin/dashboard');
app.use('/admin/dashboard', adminDashboardRouter);

const companyAuthRouter = require('./routes/company/authentication');
app.use('/company/auth', companyAuthRouter);

const authRouter = require('./routes/common/auth');
app.use('/auth', authRouter);

const captchaRouter = require('./routes/common/captchaVerification');
app.use('/captcha_verify', captchaRouter);

const zohoAuthRouter = require('./routes/Zoho/Auth/auth');
app.use('/zoho/auth', zohoAuthRouter);

const plansRouter = require('./routes/company/plans');
app.use('/company/plans', plansRouter);

const creditRouter = require('./routes/company/buy_more_credits');
app.use('/company/credit', creditRouter);

const userRouter = require('./routes/company/buy_more_users');
app.use('/company/user', userRouter);

const adminFeaturesRouter = require('./routes/admin/features');
app.use('/admin/features/', adminFeaturesRouter);

const adminPotentialCustomers = require('./routes/admin/potentialCustomers');
app.use('/admin/potential_customers', adminPotentialCustomers);

const adminSubscriptionRouter = require('./routes/admin/subscription');
app.use('/admin/subscription', adminSubscriptionRouter);

const adminProductRouter = require('./routes/admin/product');
app.use('/admin/product', adminProductRouter);

const adminCategoryRouter = require('./routes/admin/category');
app.use('/admin/category', adminCategoryRouter);

const companyMemberRouter = require('./routes/company/members');
app.use('/company/members', companyMemberRouter);

const companyRequestCreditsRouter = require('./routes/company/requestcredits');
app.use('/company/creditrequests', companyRequestCreditsRouter);

const memberAuthRouter = require('./routes/member/authentication');
app.use('/member/auth', memberAuthRouter);

const memberRequestCreditsRouter = require('./routes/member/requestcredits');
app.use('/member/requestcredits', memberRequestCreditsRouter);

const adminLeadsRouter = require('./routes/admin/leads');
app.use('/admin/leads', adminLeadsRouter);

const adminCompanyRouter = require('./routes/admin/company');
app.use('/admin/company', adminCompanyRouter);

const miscellaneousRouter = require('./routes/common/miscellaneous');
app.use('/miscellaneous', miscellaneousRouter);

const profileRouter = require('./routes/common/profile');
app.use('/profile', profileRouter);

const departmentRouter = require('./routes/company/departments');
app.use('/department', departmentRouter);

const keyRouter = require('./routes/company/api');
app.use('/key', keyRouter);

const companyLeadsRouter = require('./routes/common/leads');
app.use('/leads', companyLeadsRouter);

const InternalRouter = require('./routes/common/internal');
app.use('/internal', apiLimiter, InternalRouter);

const CampaignRouter = require('./routes/common/campaign');
app.use('/campaign', CampaignRouter);

const folderRouter = require('./routes/common/folders');
app.use('/folders', folderRouter);

const downloadRouter = require('./routes/common/downloads');
app.use('/downloads', downloadRouter);

const searchRouter = require('./routes/common/search');
app.use('/search', searchRouter);

const exclusionRouter = require('./routes/common/exclusions');
app.use('/exclusion', exclusionRouter);

const locationRouter = require('./routes/filters/location');
app.use('/location', locationRouter);

const specialityRouter = require('./routes/filters/speciality');
app.use('/speciality', specialityRouter);

const otherRouter = require('./routes/filters/others');
app.use('/others', otherRouter);

// const Leads = require('./models/admin/leads_model');
// const Companies = require('./models/company/company_model');
// const Members = require('./models/member/member_model');
// const Plans = require('./models/company/plans_model');
// const Invoices = require('./models/company/invoice_model');
// const Admin = require('./models/admin/admin_model');
// const SubAdmin = require('./models/sub-admin/sub_admin_model');
// const CompanyTransaction = require('./models/company/trans_model');
// const DownloadQueues = require('./models/common/download_queue_model');
// const Downloads = require('./models/common/downloads_model');
// const Activities = require('./models/company/activity_log_model');
// const AdminActivities = require('./models/admin/activity_log_model');
// const MemberActivities = require('./models/member/activity_log_model');
// const FileVerifications = require('./models/common/fileVerification_model');
// const EnhancerFiles = require('./models/common/enhancerfiles_model');
// const CreditUsage = require('./models/common/credit_usage');
// const CreditUsageData = require('./models/common/credit_usage_data');
// const integrate_key_model = require('./models/company/integrate_key_model');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//cron jobs
// async function checkexpire() {
// 	const findDues = await Companies.find({ planType: { $ne: 'PYG' } }).populate(
// 		'plan'
// 	);
// 	for (const rev of findDues) {
// 		//2 Days Free trail
// 		var trailDate = new Date(rev?.plan?.subscription_end_date);
// 		trailDate.setDate(trailDate.getDate() - 2);
// 		if (
// 			trailDate <= new Date() &&
// 			rev?.plan.subscription_type === 'Free Trial' &&
// 			rev.trailEmail === false
// 		) {
// 			const msg2 = {
// 				to: rev.email,
// 				from: 'team@emailaddress.ai',
// 				subject: `Your trial ends soon.`,
// 				html: `<p>Your 7-day free trial ends in 2 days!</p><br />
// 					<p>Don't lose access to the most accurate real-time email verifier and finder.</p><br />
// 					<p>To unlock the full potential and get additional credits on EmailAddress.ai, please upgrade to a paid plan. You can view all our plans here: emailaddress.ai/pricing</p><br />
// 					<p>You can book a demo here, or chat with a support representative from our website.</p><br />
// 					<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 			};
// 			let transport = nodemailer.createTransport({
// 				pool: true,
// 				host: 'smtp.gmail.com',
// 				port: 465,
// 				secure: true,
// 				auth: {
// 					user: process.env.EMAIL_USERNAME,
// 					pass: process.env.EMAIL_PASSWORD,
// 				},
// 			});

// 			transport.sendMail(msg2, (err, info) => {
// 				if (err) {
// 					console.log('Error: ' + err);
// 				} else {
// 					console.log('Mail Sent!');
// 				}
// 			});

// 			rev.trailEmail = true;
// 			await rev.save();
// 		}

// 		//2 Days Plan Expire
// 		// var subscribeDate = new Date(rev?.plan?.subscription_end_date);
// 		// subscribeDate.setDate(subscribeDate.getDate() - 2);
// 		// if (
// 		// 	subscribeDate <= new Date() &&
// 		// 	rev?.plan.subscription_type !== 'Free Trial' &&
// 		// 	rev.twoEmail === false
// 		// ) {
// 		// 	const msg2 = {
// 		// 		to: rev.email,
// 		// 		from: 'team@emailaddress.ai',
// 		// 		subject: `Your plan ends soon.`,
// 		// 		html: `<p>Your ${rev?.plan?.subscription_type} ends in 2 days!</p><br />
// 		// 		    <p>Please note that your subscription has auto-renewal enabled. If the plan doesn't auto-renew, an unpaid invoice will be generated, which can be found in your profile section, here: app.emailaddress.ai/billing</p><br/>
// 		// 			<p>You can book a demo here, or chat with a support representative from our website.</p><br />
// 		// 			<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 		// 	};
// 		// 	let transport = nodemailer.createTransport({
// 		// 		pool: true,
// 		// 		host: 'smtp.gmail.com',
// 		// 		port: 465,
// 		// 		secure: true,
// 		// 		auth: {
// 		// 			user: process.env.EMAIL_USERNAME,
// 		// 			pass: process.env.EMAIL_PASSWORD,
// 		// 		},
// 		// 	});

// 		// 	transport.sendMail(msg2, (err, info) => {
// 		// 		if (err) {
// 		// 			console.log('Error: ' + err);
// 		// 		} else {
// 		// 			console.log('Mail Sent!');
// 		// 		}
// 		// 	});

// 		// 	rev.twoEmail = true;
// 		// 	await rev.save();
// 		// }

// 		//Check Expiration & Expire
// 		if (rev?.plan?.subscription_end_date < new Date()) {
// 			//Free Plan
// 			if (
// 				rev?.plan?.subscription_type === 'Free Trial' &&
// 				rev?.plan?.isExpired === false
// 			) {
// 				const msg2 = {
// 					to: rev.email,
// 					from: 'team@emailaddress.ai',
// 					subject: `Your trial has ended`,
// 					html: `<p>Your EmailAddress.ai trial has ended.! </p><br />
// 					<p>To continue accessing the most accurate Real-time verified healthcare data, please upgrade to a paid plan.</p><br />
// 					<p>Find the plan that is right for you: www.healthdbi.com/pricing</p><br />
// 					<p>You can book a demo here, or chat with a support representative from our website.</p><br />
// 					<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 				};
// 				let transport = nodemailer.createTransport({
// 					pool: true,
// 					host: 'smtp.gmail.com',
// 					port: 465,
// 					secure: true,
// 					auth: {
// 						user: process.env.EMAIL_USERNAME,
// 						pass: process.env.EMAIL_PASSWORD,
// 					},
// 				});

// 				transport.sendMail(msg2, (err, info) => {
// 					if (err) {
// 						console.log('Error: ' + err);
// 					} else {
// 						console.log('Mail Sent!');
// 					}
// 				});

// 				const plan = await Plans.findById(rev?.plan._id);
// 				plan.isExpired = true;
// 				await plan.save();
// 			}

// 			console.log('Step1');
// 			//Paid Plan
// 			if (
// 				rev?.plan.subscription_type !== 'Free Trial' &&
// 				rev?.plan.isExpired === false
// 			) {
// 				console.log('Step2');
// 				//Function for updating invoice and plan
// 				const handleInvoiceAndPlan = async (subs) => {
// 					// Check new invoice & last invoice is same or not
// 					if (
// 						rev?.plan?.stripe_invoice_id.toString() !==
// 						subs.latest_invoice.toString()
// 					) {
// 						console.log('Step5 - Different Invoice');
// 						let situation = 'End date not reached';
// 						var subscription_amount_status = false;
// 						var payment_mode = 'Unpaid';

// 						var latInv = await stripe.invoices.retrieve(subs.latest_invoice);

// 						console.log('Step6 - New Invoice');
// 						var subscription_end_date = new Date(
// 							latInv.period_end * 1000
// 						).toISOString();

// 						if (latInv.paid) {
// 							var paymentId = latInv.payment_intent;
// 							subscription_amount_status = true;
// 							payment_mode = 'Stripe';
// 							situation = 'New paid invoice generated';

// 							await CompanyTransaction.create({
// 								company_id: rev._id,
// 								subscription_type: rev?.plan.subscription_type,
// 								subscription_amount: rev?.plan.subscription_amount,
// 								subscription_amount_status: true,
// 								payment_mode: 'Stripe',
// 								txnId: paymentId,
// 								card_info: rev?.plan?.card_info,
// 							});
// 						} else {
// 							situation = 'New unpaid invoice generated';
// 						}

// 						const createInvoice = new Invoices({
// 							name: 'Subscription',
// 							company: rev._id,
// 							from: {
// 								name: 'EmailAddress.ai',
// 								address: '447 Broadway, 2nd floor, #713',
// 								address2: 'NewYork, NY 10013, USA',
// 								email: 'team@emailaddress.ai',
// 							},
// 							status: subscription_amount_status,
// 							item: {
// 								subscription_type: rev?.plan.subscription_type,
// 								endDate: subscription_end_date,
// 								subscription_credits: rev?.plan.credits,
// 								subscription_description: 'temp desc',
// 								subscription_validity: rev?.plan.validity,
// 								subscription_max_members: rev?.plan.max_members,
// 								paymentMode: payment_mode,
// 							},
// 							stripe_invoice_id: subs.latest_invoice,
// 							amount: rev?.plan.subscription_amount,
// 							card_info: rev?.plan.card_info,
// 						});

// 						const invoice = await createInvoice.save();
// 						rev.invoices.push(invoice._id);
// 						await rev.save();

// 						const plan = await Plans.findById(rev?.plan._id);
// 						plan.subscription_end_date = subscription_end_date;
// 						plan.subscription_amount_status = subscription_amount_status;
// 						plan.payment_mode = payment_mode;
// 						plan.stripe_invoice_id = subs.latest_invoice;
// 						await plan.save();

// 						console.log('Step7 - Invoice Updated');
// 						if (subscription_amount_status) {
// 							const msg = {
// 								to: rev.email,
// 								from: 'team@emailaddress.ai',
// 								subject: `Your subscription has auto renewed`,
// 								html: `<p>Your EmailAddress.ai subscription has auto renewed.!</p><br />
// 									<p>Your Invoice would be available in your <a href="https://app.emailaddress.ai/billing" >billing section</a> and your plan will be activated shortly.</p><br />
// 									<p>If you have any questions on billing or onboarding, contact us via Live Chat or email us at team@emailaddress.ai</p><br/>
// 									<p>We truly appreciate your business.!</p><br />
// 									<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 							};

// 							let transport = nodemailer.createTransport({
// 								pool: true,
// 								host: 'smtp.gmail.com',
// 								port: 465,
// 								secure: true,
// 								auth: {
// 									user: process.env.EMAIL_USERNAME,
// 									pass: process.env.EMAIL_PASSWORD,
// 								},
// 								tls: {
// 									rejectUnauthorized: false,
// 								},
// 								maxConnections: 5,
// 								maxMessages: 100,
// 							});

// 							await transport.sendMail(msg);
// 						} else {
// 							const plan = await Plans.findById(rev?.plan._id);
// 							plan.isExpired = true;
// 							await plan.save();

// 							const msg2 = {
// 								to: rev.email,
// 								from: 'team@emailaddress.ai',
// 								subject: `Your subscription has ended`,
// 								html: `<p>Your EmailAddress.ai subscription has ended.!</p><br />
// 									<p>Don't lose access to the most accurate real-time email verifier and finder. All your search history, download files and activities will be deleted.</p><br />
// 									<p>To unlock the full potential and get additional credits on EmailAddress.ai, please upgrade to a paid plan. You can view all our plans here: emailaddress.ai/pricing</p><br />
// 									<p>If you have any questions, you can book a demo here, or chat with a support representative from our website.</p><br/>
// 									<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 							};

// 							let transport = nodemailer.createTransport({
// 								pool: true,
// 								host: 'smtp.gmail.com',
// 								port: 465,
// 								secure: true,
// 								auth: {
// 									user: process.env.EMAIL_USERNAME,
// 									pass: process.env.EMAIL_PASSWORD,
// 								},
// 								tls: {
// 									rejectUnauthorized: false,
// 								},
// 								maxConnections: 5,
// 								maxMessages: 100,
// 							});

// 							await transport.sendMail(msg2);
// 						}
// 					} else {
// 						console.log('Step5 - Same Invoice');
// 						const plan = await Plans.findById(rev?.plan._id);
// 						plan.subscription_end_date = new Date(
// 							subs.current_period_end * 1000
// 						).toISOString();
// 						await plan.save();
// 					}
// 				};

// 				//Stripe Sub Id is Mandatory
// 				if (rev?.plan?.stripe_subscription_id) {
// 					console.log('Step3 - Success');
// 					try {
// 						var subDetails = await stripe.subscriptions.retrieve(
// 							rev?.plan.stripe_subscription_id
// 						);
// 					} catch (err) {
// 						console.log('Step4 - Stripe ID Not Present');
// 						//Invalid Stripe Sub Id, plan cannot auto renew.
// 						const plan = await Plans.findById(rev?.plan._id);
// 						plan.stripe_subscription_id = null;
// 						await plan.save();
// 					}

// 					rev.credits += rev?.plan.credits;
// 					rev.totalCredits += rev?.plan.credits;

// 					var new_date = new Date(subDetails.current_period_end * 1000);
// 					console.log(new_date);
// 					// Plan end date left behind from stripe end date
// 					if (new Date(rev?.plan?.subscription_end_date) <= new_date) {
// 						console.log('Step4 - Stripe Ahead');
// 						await handleInvoiceAndPlan(subDetails);
// 					} else if (new_date < new Date()) {
// 						console.log('Step4 - Today Ahead');
// 						await handleInvoiceAndPlan(subDetails);
// 					}
// 				} else {
// 					console.log('Step3 - Not Success');
// 					const plan = await Plans.findById(rev?.plan._id);
// 					plan.isExpired = true;
// 					await plan.save();
// 				}
// 			}
// 		}
// 	}
// }

// async function checkunpaidinvoice() {
// 	try {
// 		const findDues = await Invoices.find({
// 			status: false,
// 			stripe_invoice_id: { $exists: true },
// 		}).populate('company');

// 		for (const rev of findDues) {
// 			var latInv = await stripe.invoices.retrieve(rev.stripe_invoice_id);
// 			console.log(latInv);
// 			if (latInv.paid) {
// 				var subDetails = await stripe.subscriptions.retrieve(
// 					latInv.subscription
// 				);

// 				var new_date = new Date(
// 					subDetails.current_period_end * 1000
// 				).toISOString();

// 				const plan = await Plans.findById(rev?.company?.plan);
// 				var paymentId = latInv.payment_intent;

// 				await CompanyTransaction.create({
// 					company_id: rev.company._id,
// 					subscription_type: plan.subscription_type,
// 					subscription_amount: plan.subscription_amount,
// 					subscription_amount_status: true,
// 					payment_mode: 'Stripe',
// 					txnId: paymentId,
// 					card_info: plan?.card_info,
// 				});

// 				await Invoices.findByIdAndUpdate(rev._id, {
// 					$set: {
// 						status: true,
// 						'item.paymentMode': 'Stripe',
// 						'item.endDate': new_date,
// 					},
// 				});

// 				await Plans.findByIdAndUpdate(rev?.company?.plan, {
// 					$set: {
// 						isExpired: false,
// 						subscription_end_date: new_date,
// 					},
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err?.message);
// 	}
// }

// async function checkFile() {
// 	try {
// 		let data = await DownloadQueues.find({ status: 'Under Verification' });
// 		if (data.length > 0) {
// 			for (const rev of data) {
// 				const response = await axios.get(
// 					`https://bulkapi.millionverifier.com/bulkapi/v2/fileinfo?key=${process.env.MV_PRIVATE}&file_id=${rev.mvfileid}`
// 				);

// 				if (response.data.status === 'finished') {
// 					await DownloadQueues.findByIdAndUpdate(rev._id, {
// 						$set: { status: 'Verified' },
// 					});
// 				}

// 				if (response.data.status === 'error') {
// 					let person;
// 					if (rev?.company) {
// 						if (rev?.company?.toString() === rev?.member?.toString()) {
// 							person = await Companies.findById(rev.company);
// 						} else {
// 							person = await Members.findById(rev.member);
// 						}
// 					} else if (rev?.admin) {
// 						person = await Admin.findById(rev.admin);
// 					} else if (rev?.subadmin) {
// 						person = await SubAdmin.findById(rev.subadmin);
// 					}

// 					if (person) {
// 						if (person.role === 'COMPANY' || person.role === 'MEMBER') {
// 							let addCredit = rev.leads.length;
// 							person.credits += addCredit;
// 							await person.save();
// 						}
// 					}

// 					await DownloadQueues.findByIdAndDelete(rev._id);
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function completeFile() {
// 	try {
// 		let data = await DownloadQueues.findOne({
// 			status: 'Verified',
// 			isMailSent: false,
// 		}).populate('leads');

// 		if (data) {
// 			const response = await axios.get(
// 				`https://bulkapi.millionverifier.com/bulkapi/v2/download?key=${process.env.MV_PRIVATE}&file_id=${data.mvfileid}&filter=all`
// 			);

// 			if (response.data.error === 'file_not_found') {
// 				await DownloadQueues.findByIdAndDelete(data._id);
// 			}

// 			let resultData = await csvtojson().fromString(response.data);
// 			let fileData = data.leads;

// 			const newArray = fileData.map((obj, index) => {
// 				const resultObj = resultData.find(
// 					(item) => item.email === obj.EmailAddress
// 				);

// 				if (resultObj) {
// 					const { result } = resultObj;
// 					let newType;

// 					switch (result) {
// 						case 'ok':
// 							newType = 1;
// 							break;
// 						case 'catch_all':
// 							newType = 2;
// 							break;
// 						case 'unknown':
// 							newType = 3;
// 							break;
// 						case 'invalid':
// 							newType = 6;
// 							break;
// 						case 'disposable':
// 							newType = 5;
// 							break;
// 						default:
// 							newType = 0;
// 					}

// 					return {
// 						...obj._doc,
// 						newType,
// 						result,
// 						previousDownload: data.previousDownload[index],
// 					};
// 				} else {
// 					return {
// 						...obj._doc,
// 						newType: 0,
// 						previousDownload: data.previousDownload[index],
// 					};
// 				}
// 			});

// 			for (const rev of newArray) {
// 				if (rev.newType !== 0 && rev.result) {
// 					const isLeadPresent = await Leads.findById(rev._id);
// 					if (isLeadPresent) {
// 						isLeadPresent.debounceStatus = rev.result;
// 						isLeadPresent.debounceCode = rev.newType;
// 						isLeadPresent.debounceTime = new Date().toISOString();
// 						isLeadPresent.save();
// 					}
// 				}
// 			}

// 			if (data?.company) {
// 				if (data?.company?.toString() === data?.member?.toString()) {
// 					person = await Companies.findById(data.company);
// 				} else {
// 					person = await Members.findById(data.member);
// 				}
// 			} else if (data?.admin) {
// 				person = await Admin.findById(data.admin);
// 			} else if (data?.subadmin) {
// 				person = await SubAdmin.findById(data.subadmin);
// 			}

// 			if (person) {
// 				let prevDownload = 0;
// 				let downloadLead = [];
// 				let validcount = 0;
// 				let catchcount = 0;
// 				let totalcount = newArray.length;

// 				if (data.verifyAll) {
// 					validcount = newArray.filter(
// 						(obj) => obj.debounceCode === '1' || obj.newType === 1
// 					).length;

// 					downloadLead = newArray
// 						.filter((obj) => obj.debounceCode === '1' || obj.newType === 1)
// 						.map((obj) => obj._id);

// 					if (person.role === 'COMPANY' || person.role === 'MEMBER') {
// 						prevDownload = newArray.filter(
// 							(obj) =>
// 								(obj.debounceCode === '1' || obj.newType === 1) &&
// 								obj.previousDownload === true
// 						).length;
// 					}
// 				} else {
// 					validcount = newArray.filter(
// 						(obj) => obj.debounceCode === '1' || obj.newType === 1
// 					).length;
// 					catchcount = newArray.filter(
// 						(obj) => obj.debounceCode === '2' || obj.newType === 2
// 					).length;

// 					downloadLead = newArray
// 						.filter(
// 							(obj) =>
// 								obj.debounceCode === '1' ||
// 								obj.newType === 1 ||
// 								obj.debounceCode === '2' ||
// 								obj.newType === 2
// 						)
// 						.map((obj) => obj._id);

// 					if (person.role === 'COMPANY' || person.role === 'MEMBER') {
// 						prevDownload = newArray.filter(
// 							(obj) =>
// 								(obj.debounceCode === '1' ||
// 									obj.newType === 1 ||
// 									obj.debounceCode === '2' ||
// 									obj.newType === 2) &&
// 								obj.previousDownload === true
// 						).length;
// 					}
// 				}

// 				if (person.role === 'COMPANY' || person.role === 'MEMBER') {
// 					let addCredit = totalcount - validcount - catchcount + prevDownload;
// 					person.credits += addCredit;
// 					await person.save();
// 				}

// 				if (person.role === 'ADMIN') {
// 					const addDownload = new Downloads({
// 						download_name: data.download_name,
// 						admin: person._id,
// 						leads: downloadLead,
// 						verifyAll: data.verifyAll,
// 						dataType: data.dataType,
// 					});

// 					const genDownload = await addDownload.save();

// 					person.downloads.push(genDownload._id);

// 					await person.save();

// 					await AdminActivities.create({
// 						person: person._id,
// 						role: 'ADMIN',
// 						heading: 'Leads Downloaded',
// 						message: `You have downloaded the leads!`,
// 					});
// 				} else if (person.role === 'SUB_ADMIN') {
// 					const addDownload = new Downloads({
// 						download_name: data.download_name,
// 						subadmin: person._id,
// 						leads: downloadLead,
// 						verifyAll: data.verifyAll,
// 						dataType: data.dataType,
// 					});

// 					const genDownload = await addDownload.save();

// 					person.downloads.push(genDownload._id);

// 					await person.save();

// 					await AdminActivities.create({
// 						person: person._id,
// 						role: 'SUB_ADMIN',
// 						heading: 'Leads Downloaded',
// 						message: `You have downloaded the leads!`,
// 					});
// 				} else if (person.role === 'COMPANY') {
// 					const addDownload = new Downloads({
// 						download_name: data.download_name,
// 						company: person._id,
// 						leads: downloadLead,
// 						verifyAll: data.verifyAll,
// 						dataType: data.dataType,
// 					});

// 					const genDownload = await addDownload.save();

// 					person.downloads.push(genDownload._id);

// 					await person.save();

// 					await Activities.create({
// 						company: person._id,
// 						heading: 'Leads Downloaded',
// 						message: `You have downloaded the leads!`,
// 					});
// 				} else if (person.role === 'MEMBER') {
// 					const addDownload = new Downloads({
// 						download_name: data.download_name,
// 						company: person.company_id,
// 						member: person._id,
// 						leads: downloadLead,
// 						verifyAll: data.verifyAll,
// 						dataType: data.dataType,
// 					});

// 					await addDownload.save();

// 					await MemberActivities.create({
// 						member: person._id,
// 						company: person.company_id,
// 						heading: 'Leads Downloaded',
// 						message: `You have downloaded the leads!`,
// 					});
// 				}

// 				const msg2 = {
// 					to: person.email,
// 					from: 'team@emailaddress.ai',
// 					subject: `Your Healthdbi download data is ready.`,
// 					html: `<p>File processing complete and ready to download. Please find it in your MY LIST section.</p><br />
// 					<p>You have requested to download ${totalcount} contacts, which have ${validcount} valid only emails and ${catchcount} accept all emails.</p>
// 				<p>If you have not requested one, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
// 				<p>Thanks,</p><p>Team EmailAddress.ai</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 				};
// 				let transport = nodemailer.createTransport({
// 					pool: true,
// 					host: 'smtp.gmail.com',
// 					port: 465,
// 					secure: true,
// 					auth: {
// 						user: process.env.EMAIL_USERNAME,
// 						pass: process.env.EMAIL_PASSWORD,
// 					},
// 				});

// 				await transport.sendMail(msg2);

// 				await DownloadQueues.findByIdAndUpdate(data._id, {
// 					$set: { isMailSent: true },
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function deleteQueue() {
// 	try {
// 		let data = await DownloadQueues.findOne({
// 			status: 'Verified',
// 			isMailSent: true,
// 		});

// 		if (data) {
// 			await DownloadQueues.findByIdAndDelete(data._id);
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function AppendIcypeasFile() {
// 	try {
// 		let data = await EnhancerFiles.findOne({
// 			icypeas: false,
// 			progress_status: { $ne: 'Completed' },
// 		});

// 		if (data) {
// 			console.log('Checking Icypeas');
// 			const getData = await EnhancerFiles.find(
// 				{
// 					sys_filename: data.sys_filename,
// 				},
// 				'company_url_or_name firstname lastname _id'
// 			);

// 			if (getData?.length > 0) {
// 				const reorderedData = getData.map((obj) => ({
// 					firstname: obj.firstname,
// 					lastname: obj.lastname,
// 					company_url_or_name: obj.company_url_or_name.split(',')[0],
// 				}));

// 				const externalIds = getData.map((record) => record._id.toString());
// 				const totalFileIds = Math.ceil(reorderedData.length / 4999);

// 				for (let i = 0; i < totalFileIds; i++) {
// 					const startIndex = i * 4999;
// 					const endIndex = startIndex + 4999;
// 					const batchData = reorderedData.slice(startIndex, endIndex);
// 					const batchExternalIds = externalIds.slice(startIndex, endIndex);

// 					const headerRow = Object.keys(batchData[0]);
// 					const twoDArray = batchData.map((obj) =>
// 						headerRow.map((key) =>
// 							typeof obj[key] === 'number' ? obj[key].toString() : obj[key]
// 						)
// 					);

// 					try {
// 						const response = await axios.post(
// 							'https://app.icypeas.com/api/bulk-search',
// 							{
// 								name: `${data?.filename}_batch_${i + 1}`,
// 								task: 'email-search',
// 								user: 'wfN7v48BbTK9WqxtWaPh',
// 								data: twoDArray,
// 								custom: { externalIds: batchExternalIds },
// 							},
// 							{
// 								headers: {
// 									Authorization: `${process.env.ICYPEAS_KEY}`,
// 									'Content-Type': 'application/json',
// 								},
// 							}
// 						);

// 						if (response?.data?.success === true) {
// 							await EnhancerFiles.updateMany(
// 								{ sys_filename: data.sys_filename },
// 								{
// 									[`party_file_id_${i + 1}`]: response?.data?.file,
// 									[`party_file_status_${i + 1}`]: response?.data?.status,
// 								}
// 							);
// 							console.log(`Batch ${i + 1} uploaded successfully.`);
// 						}
// 					} catch (err) {
// 						console.log(`Error uploading batch ${i + 1}:`, err.message);
// 					}
// 				}
// 				await EnhancerFiles.updateMany(
// 					{ sys_filename: data.sys_filename },
// 					{
// 						e_status: 'Icypeas',
// 						icypeas: true,
// 						totalFileIds: totalFileIds,
// 					}
// 				);
// 			} else {
// 				await EnhancerFiles.updateMany(
// 					{ sys_filename: data.sys_filename },
// 					{
// 						icypeas: true,
// 						progress: 100,
// 						e_status: 'Icypeas',
// 					}
// 				);
// 			}
// 		}
// 	} catch (err) {
// 		console.log('Error:', err.message);
// 	}
// }

// async function checkIcypeasStatus() {
// 	try {
// 		let data = await EnhancerFiles.findOne({
// 			e_status: 'Icypeas',
// 			progress_status: { $ne: 'Completed' },
// 			icypeas: true,
// 		});

// 		if (data) {
// 			console.log('Icypeas Status Check');
// 			const totalFileIds = data.totalFileIds || 0;
// 			var completedFiles = 0;
// 			var completedRecords = 0;

// 			if (totalFileIds > 0) {
// 				for (let i = 1; i <= totalFileIds; i++) {
// 					const partyFileId = data[`party_file_id_${i}`];
// 					if (!partyFileId) {
// 						console.log(`party_file_id_${i} not found. Skipping.`);
// 						continue;
// 					}
// 					if (data[`party_file_status_${i}`] === 'done') {
// 						console.log(`party_file_id_${i} completed. Skipping.`);
// 						completedFiles++;
// 						continue;
// 					}

// 					try {
// 						const response = await axios.post(
// 							`https://app.icypeas.com/api/search-files/read`,
// 							{ file: partyFileId },
// 							{ headers: { Authorization: `${process.env.ICYPEAS_KEY}` } }
// 						);

// 						if (response?.data?.success === true) {
// 							var party_counts = response.data.files[0];
// 							if (party_counts) {
// 								console.log('Icypeas Status Update');
// 								completedRecords += party_counts?.done;

// 								if (party_counts.finished === true) {
// 									console.log('Icypeas Batch Completed');

// 									async function fetchAllRecords(
// 										fileId,
// 										sorts = [],
// 										collectedResults = []
// 									) {
// 										const resp = await axios.post(
// 											`https://app.icypeas.com/api/bulk-single-searchs/read`,
// 											{
// 												mode: 'bulk',
// 												file: fileId,
// 												limit: 100,
// 												next: true,
// 												...(sorts.length > 0 && { sorts }),
// 											},
// 											{
// 												headers: {
// 													Authorization: `${process.env.ICYPEAS_KEY}`,
// 												},
// 											}
// 										);

// 										if (resp?.data?.success === true) {
// 											const currentResults = resp.data.items.map((item) => ({
// 												firstname: item.results.firstname,
// 												lastname: item.results.lastname,
// 												...(item.results.emails[0] || {}),
// 												_id: item.userData.externalId,
// 											}));

// 											collectedResults = [
// 												...collectedResults,
// 												...currentResults,
// 											];

// 											if (collectedResults.length !== resp.data.total) {
// 												return await fetchAllRecords(
// 													fileId,
// 													resp.data.sorts,
// 													collectedResults
// 												);
// 											}
// 										}

// 										return collectedResults;
// 									}

// 									const result = await fetchAllRecords(partyFileId);
// 									if (result.length > 0) {
// 										while (result.length > 0) {
// 											var shortUpdateArray = result.splice(0, 950);
// 											const bulkOps = shortUpdateArray.map((obj) => ({
// 												updateOne: {
// 													filter: { _id: obj._id },
// 													update: {
// 														$set: {
// 															i_status: obj?.certainty || 'not_found',
// 															mxRecords: Array.isArray(obj?.mxRecords)
// 																? obj.mxRecords
// 																: [],
// 															mxProvider: obj?.mxProvider || '',
// 															...(obj?.email && { email: obj.email }),
// 														},
// 													},
// 												},
// 											}));

// 											await EnhancerFiles.bulkWrite(bulkOps);
// 										}

// 										await EnhancerFiles.updateMany(
// 											{ sys_filename: data.sys_filename },
// 											{
// 												[`party_file_status_${i}`]: 'done',
// 											}
// 										);
// 										console.log(`Icypeas Batch Completed: ${i}`);
// 										completedFiles++;
// 									}
// 								}
// 							}
// 						} else {
// 							console.log('Icypeas Status Error', response?.data);
// 						}
// 					} catch (err) {
// 						console.log('Icypeas Status Error', err?.response?.data);
// 					}
// 				}

// 				await EnhancerFiles.updateMany(
// 					{ sys_filename: data.sys_filename },
// 					{
// 						$set: {
// 							progress: (completedRecords / data.total_count) * 100,
// 						},
// 					}
// 				);

// 				if (completedFiles === totalFileIds) {
// 					await EnhancerFiles.updateMany(
// 						{ sys_filename: data.sys_filename },
// 						{
// 							e_status: 'Icypeas Appended',
// 							progress: 100,
// 							progress_status: 'Provider 2',
// 						}
// 					);
// 					console.log('Icypeas Whole File Completed');
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function AppendAnymailFile() {
// 	try {
// 		let data = await EnhancerFiles.findOne({
// 			e_status: 'Icypeas Appended',
// 			icypeas: true,
// 			anymail: false,
// 			progress_status: 'Provider 2',
// 		});

// 		if (data) {
// 			const appended = await EnhancerFiles.countDocuments({
// 				sys_filename: data.sys_filename,
// 				email: { $exists: true, $nin: [''] },
// 			});

// 			await EnhancerFiles.updateMany(
// 				{ sys_filename: data.sys_filename },
// 				{ appended: appended }
// 			);
// 			console.log('Appended Count Updated');
// 			console.log('Anymail Finding');

// 			const getData = await EnhancerFiles.find(
// 				{
// 					sys_filename: data.sys_filename,
// 					i_status: 'not_found',
// 				},
// 				'company_url_or_name fullname firstname lastname _id'
// 			);
// 			if (getData.length > 0) {
// 				const reorderedData = getData.map((obj) => ({
// 					companyname: obj.company_url_or_name.split(',')[0],
// 					fullname: obj.fullname,
// 					firstname: obj.firstname,
// 					lastname: obj.lastname,
// 					_id: obj._id,
// 				}));

// 				const headerRow = Object.keys(reorderedData[0]);
// 				let twoDArray = [headerRow];
// 				reorderedData.forEach((obj) => {
// 					const row = headerRow.map((key) => {
// 						if (typeof obj[key] === 'number') {
// 							return obj[key].toString();
// 						} else {
// 							return obj[key];
// 						}
// 					});
// 					twoDArray.push(row);
// 				});

// 				console.log('Anymail Started');
// 				try {
// 					const response = await axios.post(
// 						'https://api.anymailfinder.com/v5.0/bulk/json',
// 						{
// 							company_name_field_index: 0,
// 							data: twoDArray,
// 							domain_field_index: null,
// 							file_name: data.filename,
// 							first_name_field_index: 2,
// 							full_name_field_index: 1,
// 							job_title_field_index: null,
// 							last_name_field_index: 3,
// 							webhook_url: null,
// 						},
// 						{
// 							headers: {
// 								Authorization: 'Bearer x4eIhx3IQ6rMB72MborG2oEf',
// 								'Content-Type': 'application/json',
// 							},
// 						}
// 					);
// 					if (response?.data?.success === true) {
// 						var party_counts = JSON.stringify(
// 							response?.data?.bulkSearch?.counts
// 						);
// 						await EnhancerFiles.updateMany(
// 							{ sys_filename: data.sys_filename },
// 							{
// 								a_party_id: response?.data?.bulkSearch?.id,
// 								a_party_status: response?.data?.bulkSearch?.status,
// 								a_party_counts: party_counts,
// 								e_status: 'Anymail',
// 								progress: 0,
// 							}
// 						);
// 						console.log('Anymail Uploaded');
// 					}
// 				} catch (err) {
// 					console.log('Anymail Error');
// 				}
// 			} else {
// 				await EnhancerFiles.updateMany(
// 					{ sys_filename: data.sys_filename },
// 					{
// 						anymail: true,
// 						icypeas: true,
// 						progress: 100,
// 						e_status: 'Icypeas',
// 						progress_status: 'Appended',
// 					}
// 				);
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function checkAnymailStatus() {
// 	try {
// 		let data = await EnhancerFiles.aggregate([
// 			{
// 				$match: {
// 					e_status: 'Anymail',
// 					a_party_id: { $ne: null, $ne: '', $exists: true },
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: '$sys_filename',
// 					a_party_id: { $first: '$a_party_id' },
// 				},
// 			},
// 			{
// 				$project: {
// 					_id: 0,
// 					sys_filename: '$_id',
// 					a_party_id: 1,
// 				},
// 			},
// 		]);

// 		if (data.length > 0) {
// 			for (const rev of data) {
// 				console.log('Anymail Status Check');
// 				try {
// 					const response = await axios.get(
// 						`https://api.anymailfinder.com/v5.0/bulk/${rev.a_party_id}`,
// 						{ headers: { Authorization: 'Bearer x4eIhx3IQ6rMB72MborG2oEf' } }
// 					);

// 					if (response?.data?.success === true) {
// 						var party_counts = response.data.bulkSearch.counts;
// 						var progress =
// 							((party_counts?.failed +
// 								party_counts?.found_unknown +
// 								party_counts?.found_valid +
// 								party_counts?.not_found) /
// 								party_counts?.total) *
// 							100;
// 						await EnhancerFiles.updateMany(
// 							{ sys_filename: rev.sys_filename },
// 							{
// 								$set: {
// 									a_party_status: response.data.bulkSearch.status,
// 									a_party_counts: JSON.stringify(party_counts),
// 									progress: progress,
// 								},
// 							}
// 						);

// 						console.log('Anymail Status Updated');
// 						if (response.data.bulkSearch.status === 'completed') {
// 							console.log('Anymail File Completed');
// 							const resp = await axios.get(
// 								`https://api.anymailfinder.com/v5.0/bulk/${rev.a_party_id}/download`,
// 								{
// 									headers: { Authorization: 'Bearer x4eIhx3IQ6rMB72MborG2oEf' },
// 								}
// 							);

// 							let result = [];

// 							const parsedData = papaparse.parse(resp.data, {
// 								header: true,
// 								skipEmptyLines: true,
// 							});

// 							if (parsedData.errors.length > 0) {
// 								console.error('Error parsing CSV:', parsedData.errors);
// 							} else {
// 								result = parsedData.data;
// 							}

// 							if (result.length > 0) {
// 								while (result.length > 0) {
// 									var shortUpdateArray = result.splice(0, 950);
// 									const bulkOps = shortUpdateArray.map((obj) => ({
// 										updateOne: {
// 											filter: { _id: obj._id },
// 											update: {
// 												$set: {
// 													domain_name: obj.domain_name,
// 													valid_email_only: obj.valid_email_only,
// 													email_type: obj.email_type,
// 													amf_status: obj.amf_status,
// 													...(obj.email && { email: obj.email }),
// 												},
// 											},
// 										},
// 									}));

// 									await EnhancerFiles.bulkWrite(bulkOps);
// 								}
// 								await EnhancerFiles.updateMany(
// 									{ sys_filename: rev.sys_filename },
// 									{
// 										anymail: true,
// 										progress: 100,
// 										e_status: 'Anymail Appended',
// 									}
// 								);
// 								console.log(`Anymail Completed: ${rev.sys_filename}`);
// 							}
// 						}
// 					} else {
// 						// await EnhancerFiles.updateMany(
// 						// 	{ sys_filename: rev.sys_filename },
// 						// 	{ progress_status: 'Failed' }
// 						// );
// 						console.log('Anymail Status Error', response?.data);
// 					}
// 				} catch (err) {
// 					if (err?.response?.data?.error === 'not_found') {
// 						// await EnhancerFiles.updateMany(
// 						// 	{ sys_filename: rev.sys_filename },
// 						// 	{ progress_status: 'Failed' }
// 						// );
// 						console.log('Anymail Status Error', err?.response?.data);
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function VerifyAnymailFile() {
// 	try {
// 		let data = await EnhancerFiles.findOne({
// 			e_status: 'Anymail Appended',
// 		});
// 		if (data) {
// 			const dataArray = await EnhancerFiles.find(
// 				{
// 					sys_filename: data.sys_filename,
// 				},
// 				{
// 					sys_filename: 1,
// 					email: 1,
// 					amf_status: 1,
// 					email_type: 1,
// 				}
// 			);
// 			const appended = await EnhancerFiles.countDocuments({
// 				sys_filename: data.sys_filename,
// 				email: { $exists: true, $nin: [''] },
// 			});

// 			await EnhancerFiles.updateMany(
// 				{ sys_filename: data.sys_filename },
// 				{ appended: appended }
// 			);
// 			console.log('Appended Count Updated');

// 			if (dataArray.length > 0) {
// 				const emailData = dataArray
// 					.filter(
// 						(item) =>
// 							item?.amf_status === 'ok' &&
// 							item?.email_type === 'not_verified' &&
// 							item?.email
// 					)
// 					.map((item) => ({
// 						email: item?.email || '',
// 					}));

// 				if (emailData?.length > 0) {
// 					const csvData = papaparse.unparse(emailData, { header: true });

// 					//const bufferData = Buffer.from(csvData);
// 					const tempFilePath = `${data.filename}.csv`;
// 					fs.writeFileSync(tempFilePath, csvData);

// 					const formData = new FormData();
// 					formData.append('file', fs.createReadStream(tempFilePath));
// 					formData.append('email_column', 0);
// 					formData.append('name', data.filename + '_anymail');

// 					try {
// 						const response = await axios.post(
// 							'https://api.bounceban.com/v1/verify/bulk/file',
// 							formData,
// 							{
// 								headers: {
// 									Authorization: process.env.BOUNCEBAN_KEY,
// 								},
// 							}
// 						);

// 						if (response.data) {
// 							await EnhancerFiles.updateMany(
// 								{ sys_filename: data.sys_filename },
// 								{
// 									bbid: response.data.id,
// 									progress: 0,
// 									e_status: 'Anymail_Progress',
// 									progress_status: 'Verifying',
// 								}
// 							);
// 							fs.unlink(`${data.filename}.csv`, (err) => {
// 								if (err) {
// 									console.error('Error deleting file:', err);
// 								} else {
// 									console.log('File deleted successfully.');
// 								}
// 							});
// 						}
// 					} catch (error) {
// 						console.error('Error uploading file:', error.message);
// 					}
// 				} else {
// 					await EnhancerFiles.updateMany(
// 						{ sys_filename: data.sys_filename },
// 						{
// 							progress: 100,
// 							progress_status: 'Organizing',
// 						}
// 					);
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function BBStatusCheckAnymail() {
// 	try {
// 		let data = await EnhancerFiles.aggregate([
// 			{
// 				$match: {
// 					progress_status: { $ne: 'Completed' },
// 					bbid: { $exists: true },
// 					e_status: 'Anymail_Progress',
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: '$sys_filename',
// 					bbid: { $first: '$bbid' },
// 				},
// 			},
// 		]);

// 		if (data.length > 0) {
// 			for (const rev of data) {
// 				console.log('BB Status Check');
// 				const response = await axios.get(
// 					`https://api.bounceban.com/v1/verify/bulk/status?id=${rev.bbid}`,
// 					{
// 						headers: {
// 							Authorization: process.env.BOUNCEBAN_KEY,
// 						},
// 					}
// 				);

// 				if (response.data) {
// 					const { credits_remaining, ...rest } = response?.data;
// 					if (response.data.status !== 'finished') {
// 						const progress =
// 							(response.data.finished_count / response.data.total_count) * 100;
// 						await EnhancerFiles.updateMany(
// 							{ sys_filename: rev._id },
// 							{
// 								progress: progress,
// 								party_counts: rest,
// 							}
// 						);
// 						console.log('BB Status Updated');
// 					} else {
// 						await EnhancerFiles.updateMany(
// 							{ sys_filename: rev._id },
// 							{
// 								progress: 100,
// 								e_status: 'Anymail Completed',
// 								party_counts: rest,
// 								progress_status: 'Organizing',
// 							}
// 						);
// 						console.log('BB Completed');
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function addBBResultAnymail() {
// 	try {
// 		let data = await EnhancerFiles.findOne({
// 			progress_status: 'Organizing',
// 		});

// 		if (data) {
// 			console.log('Adding Anymail Result', data.sys_filename);
// 			if (data.bbid) {
// 				await EnhancerFiles.updateMany(
// 					{
// 						sys_filename: data.sys_filename,
// 						amf_status: 'ok',
// 						email_type: 'verified',
// 					},
// 					{ $set: { result: 'deliverable' } }
// 				);
// 				await EnhancerFiles.updateMany(
// 					{
// 						sys_filename: data.sys_filename,
// 						i_status: { $in: ['ultra_sure', 'very_sure', 'sure', 'probable'] },
// 					},
// 					{ $set: { result: 'deliverable' } }
// 				);

// 				const response = await axios.get(
// 					`https://api.bounceban.com/v1/verify/bulk/dump?id=${data.bbid}&retrieve_all=1`,
// 					{
// 						headers: {
// 							Authorization: process.env.BOUNCEBAN_KEY,
// 						},
// 					}
// 				);

// 				if (response.data && response.data.items.length > 0) {
// 					const bulkOps = response.data.items.map((rev) => ({
// 						updateOne: {
// 							filter: { email: rev.email, sys_filename: data.sys_filename },
// 							update: { result: rev.result, bb: rev },
// 						},
// 					}));

// 					const executeBulkInBatches = async (operations, batchSize = 900) => {
// 						for (let i = 0; i < operations.length; i += batchSize) {
// 							const batch = operations.slice(i, i + batchSize);
// 							await EnhancerFiles.bulkWrite(batch);
// 						}
// 					};

// 					await executeBulkInBatches(bulkOps, 900);

// 					const deliverableCount = await EnhancerFiles.countDocuments({
// 						sys_filename: data.sys_filename,
// 						result: 'deliverable',
// 					});

// 					await EnhancerFiles.updateMany(
// 						{
// 							sys_filename: data.sys_filename,
// 							is_enrichment: false,
// 							result: { $ne: 'deliverable' },
// 						},
// 						{ $set: { is_enrichment: true } }
// 					);

// 					await EnhancerFiles.updateMany(
// 						{ sys_filename: data.sys_filename },
// 						{
// 							progress_status: 'Enrichment',
// 							e_status: 'Completed',
// 							deliverable_count: deliverableCount,
// 						}
// 					);
// 				}
// 			} else {
// 				await EnhancerFiles.updateMany(
// 					{
// 						sys_filename: data.sys_filename,
// 						amf_status: 'ok',
// 						email_type: 'verified',
// 					},
// 					{ $set: { result: 'deliverable' } }
// 				);
// 				await EnhancerFiles.updateMany(
// 					{
// 						sys_filename: data.sys_filename,
// 						i_status: { $in: ['ultra_sure', 'very_sure', 'sure', 'probable'] },
// 					},
// 					{ $set: { result: 'deliverable' } }
// 				);

// 				await EnhancerFiles.updateMany(
// 					{
// 						sys_filename: data.sys_filename,
// 						is_enrichment: false,
// 						result: { $ne: 'deliverable' },
// 					},
// 					{ $set: { is_enrichment: true } }
// 				);

// 				await EnhancerFiles.updateMany(
// 					{ sys_filename: data.sys_filename },
// 					{
// 						progress_status: 'Enrichment',
// 						e_status: 'Completed',
// 					}
// 				);
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function enrichEnhancerFile() {
// 	try {
// 		const checkOption = await EnhancerFiles.findOne({
// 			progress_status: 'Enrichment',
// 			findProfile: false,
// 		});
// 		if (checkOption) {
// 			await EnhancerFiles.updateMany(
// 				{
// 					progress_status: 'Enrichment',
// 					findProfile: false,
// 				},
// 				{ $set: { is_enrichment: true } }
// 			);
// 		}

// 		let data = await EnhancerFiles.find({
// 			progress_status: 'Enrichment',
// 			is_enrichment: false,
// 		}).limit(10);
// 		if (data?.length > 0) {
// 			for (const rev of data) {
// 				if (rev?.result === 'deliverable') {
// 					try {
// 						const enrichmentRes = await axios.get(
// 							`https://api.enrichmentapi.io/reverse_email?api_key=${process.env.ENRICHMENT_KEY}&email=${rev.email}`
// 						);

// 						if (enrichmentRes?.data?.status === 200) {
// 							const { person_data, company_data } = enrichmentRes?.data;

// 							await EnhancerFiles.findByIdAndUpdate(rev._id, {
// 								$set: {
// 									profile_data: person_data,
// 									company_data: company_data,
// 									is_enrichment: true,
// 								},
// 							});
// 						}
// 					} catch (err) {
// 						await EnhancerFiles.findByIdAndUpdate(rev._id, {
// 							$set: {
// 								is_enrichment: true,
// 							},
// 						});
// 					}
// 				} else {
// 					await EnhancerFiles.findByIdAndUpdate(rev._id, {
// 						$set: {
// 							is_enrichment: true,
// 						},
// 					});
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function completeEnhancerFile() {
// 	try {
// 		let data = await EnhancerFiles.findOne({
// 			progress_status: 'Enrichment',
// 		});

// 		if (data) {
// 			const check = await EnhancerFiles.findOne({
// 				sys_filename: data.sys_filename,
// 				is_enrichment: false,
// 			});

// 			if (!check) {
// 				await EnhancerFiles.updateMany(
// 					{ sys_filename: data.sys_filename },
// 					{
// 						progress_status: 'Completed',
// 						e_status: 'Completed',
// 					}
// 				);
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function sendEnhancerEmail() {
// 	try {
// 		const data = await EnhancerFiles.findOne({
// 			progress_status: 'Completed',
// 			e_status: 'Completed',
// 			emailsent: false,
// 		});

// 		if (data?.emailsent === false) {
// 			const allData = await EnhancerFiles.find(
// 				{
// 					sys_filename: data?.sys_filename,
// 				},
// 				{ result: 1 }
// 			);

// 			const deliverableCount = allData.filter(
// 				(rev) => rev.result === 'deliverable'
// 			).length;

// 			var person =
// 				(await Admin.findById(data?.person)) ||
// 				(await SubAdmin.findById(data?.person)) ||
// 				(await Companies.findById(data?.person)) ||
// 				(await Members.findById(data?.person).populate('company_id'));

// 			const msg2 = {
// 				to: person?.email,
// 				from: process.env.EMAIL_USERNAME,
// 				bcc: 'girishk919@gmail.com',
// 				subject: `Your Email Finder: ${data.filename} file is Appended.`,
// 				html: `<p>File processing complete and ready to download.</p><br />
// 			<p>You have requested to find ${data.total_count} contacts.</p>
// 			<p>${deliverableCount} of these emails are deliverable.</p>
// 			<p>If you have not requested one, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
// 			<p>Thanks,</p><p>Team at EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 			};

// 			let transport = nodemailer.createTransport({
// 				pool: true,
// 				host: 'smtp.gmail.com',
// 				port: 465,
// 				secure: true,
// 				auth: {
// 					user: process.env.EMAIL_USERNAME,
// 					pass: process.env.EMAIL_PASSWORD,
// 				},
// 				tls: {
// 					rejectUnauthorized: false,
// 				},
// 				maxConnections: 5,
// 				maxMessages: 100,
// 			});

// 			await transport.sendMail(msg2);

// 			await EnhancerFiles.updateMany(
// 				{ sys_filename: data.sys_filename },
// 				{ emailsent: true }
// 			);

// 			const extraCredits =
// 				Number(data?.total_count) * 3 - Number(deliverableCount) * 3;

// 			if (person && data?.company_id) {
// 				person.credits += extraCredits;
// 				await person.save();
// 			}
// 			if (data?.company_id) {
// 				const findUsage = await CreditUsage.findOne({
// 					member: data?.person,
// 					fileId: data?.sys_filename,
// 				});
// 				if (findUsage) {
// 					findUsage.credits = Number(deliverableCount) * 3;
// 					await findUsage.save();

// 					const today = new Date().toISOString().split('T')[0];
// 					let entry = await CreditUsageData.findOne({
// 						member: data?.person,
// 						date: today,
// 					});
// 					if (entry) {
// 						entry.credits -= extraCredits;
// 						await entry.save();
// 					}
// 				} else {
// 					const findComUsage = await CreditUsage.findOne({
// 						company: data?.person,
// 						fileId: data?.sys_filename,
// 					});
// 					if (findComUsage) {
// 						findComUsage.credits = Number(deliverableCount) * 3;
// 						await findComUsage.save();

// 						const today = new Date().toISOString().split('T')[0];
// 						let entry = await CreditUsageData.findOne({
// 							company: data?.person,
// 							date: today,
// 						});
// 						if (entry) {
// 							entry.credits -= extraCredits;
// 							await entry.save();
// 						}
// 					}
// 				}
// 			} else if (data?.mainadmin_id) {
// 				const findUsage = await CreditUsage.findOne({
// 					admin: data?.person,
// 					fileId: data?.sys_filename,
// 				});
// 				if (findUsage) {
// 					findUsage.credits = Number(deliverableCount) * 3;
// 					await findUsage.save();

// 					const today = new Date().toISOString().split('T')[0];
// 					let entry = await CreditUsageData.findOne({
// 						admin: data?.person,
// 						date: today,
// 					});
// 					if (entry) {
// 						entry.credits -= extraCredits;
// 						await entry.save();
// 					}
// 				}
// 			} else if (data?.mainsubadmin) {
// 				const findUsage = await CreditUsage.findOne({
// 					subadmin: data?.person,
// 					fileId: data?.sys_filename,
// 				});
// 				if (findUsage) {
// 					findUsage.credits = Number(deliverableCount) * 3;
// 					await findUsage.save();

// 					const today = new Date().toISOString().split('T')[0];
// 					let entry = await CreditUsageData.findOne({
// 						subadmin: data?.person,
// 						date: today,
// 					});
// 					if (entry) {
// 						entry.credits -= extraCredits;
// 						await entry.save();
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function csvToJson(filePath) {
// 	return new Promise((resolve, reject) => {
// 		const jsonArray = [];
// 		const stream = fs.createReadStream(filePath);

// 		stream
// 			.pipe(fastcsv.parse({ headers: true, ignoreEmpty: true, trim: true }))
// 			.on('data', (row) => jsonArray.push(row))
// 			.on('end', () => {
// 				// fs.unlink(filePath, (err) => {
// 				// 	if (err) {
// 				// 		console.error('Error deleting file:', err);
// 				// 	} else {
// 				// 		console.log('File deleted:', filePath);
// 				// 	}
// 				// });
// 				resolve(jsonArray);
// 			})
// 			.on('error', (error) => {
// 				// fs.unlink(filePath, (err) => {
// 				// 	if (err) {
// 				// 		console.error('Error deleting file:', err);
// 				// 	} else {
// 				// 		console.log('File deleted due to error:', filePath);
// 				// 	}
// 				// });
// 				reject(error);
// 			});
// 	});
// }

// async function uploadVerificationFile() {
// 	try {
// 		var JSONArray = [];
// 		const findFile = await FileVerifications.findOne({
// 			uploaded: false,
// 			progress_status: { $ne: 'Failed' },
// 		});
// 		if (findFile?.filePath) {
// 			console.log(findFile?.filePath);
// 			const countFile = await FileVerifications.countDocuments({
// 				sys_filename: findFile?.sys_filename,
// 			});
// 			console.log(countFile, findFile._id);
// 			if (countFile === 1) {
// 				var person =
// 					(await Admin.findById(findFile?.person)) ||
// 					(await SubAdmin.findById(findFile?.person)) ||
// 					(await Companies.findById(findFile?.person)) ||
// 					(await Members.findById(findFile?.person).populate('company_id'));

// 				JSONArray = await csvToJson(findFile?.filePath);

// 				console.log(JSONArray?.length, person);
// 				function replaceKeys(obj, dataObj) {
// 					const newObj = { ...obj };
// 					for (const key in dataObj) {
// 						const value = dataObj[key];
// 						if (value in obj) {
// 							newObj[key] = obj[value];
// 							if (key !== value) {
// 								delete newObj[value];
// 							}
// 						}
// 					}
// 					return newObj;
// 				}

// 				// if (JSONArray.length > 1000001) {
// 				// 	return res.status(400).json({
// 				// 		success: false,
// 				// 		msg: 'The file limit has exceeded 1,000,000 records.',
// 				// 	});
// 				// }

// 				const dataMap = JSON.parse(findFile?.data);
// 				const uniqueEmails = new Set();
// 				const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

// 				console.log('Ok4', JSONArray?.length, findFile?.data);
// 				JSONArray = JSONArray.reduce((acc, obj) => {
// 					const newObj = replaceKeys(obj, dataMap);

// 					if (newObj.email) {
// 						const email = newObj.email.trim().toLowerCase();
// 						if (emailRegex.test(email) && !uniqueEmails.has(email)) {
// 							uniqueEmails.add(email);
// 							newObj.email = email;
// 							acc.push(newObj);
// 						}
// 					}
// 					return acc;
// 				}, []);

// 				if (JSONArray.length === 0) {
// 					console.log('No Valid');
// 					await FileVerifications.findByIdAndUpdate(findFile?._id, {
// 						$set: {
// 							progress_status: 'Failed',
// 							e_status: 'Failed',
// 							total_count: 0,
// 							uploaded: true,
// 						},
// 					});
// 				}

// 				console.log('Ok5', new Date().toISOString());

// 				if (
// 					(person.role === 'COMPANY' || person.role === 'MEMBER') &&
// 					JSONArray.length > person.credits
// 				) {
// 					console.log('No Credit');
// 					await FileVerifications.findByIdAndUpdate(findFile?._id, {
// 						$set: {
// 							progress_status: 'Failed',
// 							e_status: 'Failed',
// 							total_count: JSONArray?.length,
// 							uploaded: true,
// 						},
// 					});
// 				}

// 				let makeArray = [];

// 				if (person.role === 'COMPANY' || person.role === 'MEMBER') {
// 					var insertArray = JSONArray.map((rev) => ({
// 						...rev,
// 						company_id: findFile?.company_id,
// 						person: person._id,
// 						filename: findFile?.filename,
// 						sys_filename: findFile?.sys_filename,
// 						uploadby: findFile?.uploadby,
// 						vendor: findFile?.vendor,
// 						// progress_status: 'In-Process',
// 						// e_status: 'In-Progress',
// 						verified: 0,
// 						progress: 0,
// 						uploaded: true,
// 						emailsent: false,
// 						is_enrichment: false,
// 						total_count: JSONArray.length,
// 						findProfile: findFile?.findProfile,
// 						created_at: findFile?.created_at,
// 						updated_at: findFile?.updated_at,
// 					}));

// 					makeArray = [...insertArray];

// 					const bulkOps = insertArray.map((doc) => ({
// 						insertOne: { document: doc },
// 					}));
// 					const batchSize = 8000;

// 					console.log('Ok8', insertArray?.length);
// 					for (let i = 0; i < bulkOps.length; i += batchSize) {
// 						await FileVerifications.bulkWrite(bulkOps.slice(i, i + batchSize));
// 					}
// 				} else if (person.role === 'ADMIN') {
// 					var insertArray = JSONArray.map((rev) => ({
// 						...rev,
// 						admin: findFile?.admin,
// 						person: person._id,
// 						filename: findFile?.filename,
// 						sys_filename: findFile?.sys_filename,
// 						uploadby: findFile?.uploadby,
// 						vendor: findFile?.vendor,
// 						progress_status: 'Failed',
// 						e_status: 'Failed',
// 						verified: 0,
// 						progress: 0,
// 						uploaded: true,
// 						emailsent: false,
// 						is_enrichment: false,
// 						total_count: JSONArray.length,
// 						findProfile: findFile?.findProfile,
// 						created_at: findFile?.created_at,
// 						updated_at: findFile?.updated_at,
// 					}));

// 					makeArray = [...insertArray];

// 					const bulkOps = insertArray.map((doc) => ({
// 						insertOne: { document: doc },
// 					}));
// 					const batchSize = 8000;

// 					console.log('Ok8', insertArray?.length);
// 					for (let i = 0; i < bulkOps.length; i += batchSize) {
// 						await FileVerifications.bulkWrite(bulkOps.slice(i, i + batchSize));
// 					}
// 				} else if (person.role === 'SUB_ADMIN') {
// 					var insertArray = JSONArray.map((rev) => ({
// 						...rev,
// 						subadmin: findFile?.subadmin,
// 						person: person._id,
// 						filename: findFile?.filename,
// 						sys_filename: findFile?.sys_filename,
// 						uploadby: findFile?.uploadby,
// 						vendor: findFile?.vendor,
// 						// progress_status: 'In-Process',
// 						// e_status: 'In-Progress',
// 						verified: 0,
// 						progress: 0,
// 						uploaded: true,
// 						emailsent: false,
// 						is_enrichment: false,
// 						total_count: JSONArray.length,
// 						findProfile: findFile?.findProfile,
// 						created_at: findFile?.created_at,
// 						updated_at: findFile?.updated_at,
// 					}));

// 					makeArray = [...insertArray];

// 					const bulkOps = insertArray.map((doc) => ({
// 						insertOne: { document: doc },
// 					}));
// 					const batchSize = 8000;

// 					console.log('Ok8', insertArray?.length);
// 					for (let i = 0; i < bulkOps.length; i += batchSize) {
// 						await FileVerifications.bulkWrite(bulkOps.slice(i, i + batchSize));
// 					}
// 				}

// 				if (makeArray[0]?.progress_status === 'Failed') {
// 					console.log('Complete');
// 					await FileVerifications.findByIdAndDelete(findFile?._id);
// 					await FileVerifications.updateMany(
// 						{ sys_filename: findFile?.sys_filename },
// 						{
// 							$set: {
// 								progress: 0,
// 								progress_status: 'Failed',
// 								e_status: 'Failed',
// 								uploaded: true,
// 							},
// 						}
// 					);
// 					fs.unlink(findFile?.filePath, (err) => {
// 						if (err) {
// 							console.error('Error deleting file:', err);
// 						} else {
// 							console.log('File deleted:', findFile?.filePath);
// 						}
// 					});
// 					return;
// 				}

// 				const emailAddresses = makeArray.map((obj) => obj.email);

// 				try {
// 					const response = await axios.post(
// 						`https://api.bounceban.com/v1/verify/bulk`,
// 						{
// 							emails: emailAddresses,
// 							name: findFile?.filename,
// 						},
// 						{
// 							headers: {
// 								Authorization: process.env.BOUNCEBAN_KEY,
// 							},
// 						}
// 					);

// 					await FileVerifications.updateMany(
// 						{ sys_filename: findFile?.sys_filename },
// 						{
// 							$set: {
// 								bbid: response?.data?.id,
// 								progress: 0,
// 								progress_status: 'In-Process',
// 								e_status: 'In_Progress',
// 								mainVerify: true,
// 								uploaded: true,
// 							},
// 						}
// 					);

// 					await FileVerifications.findByIdAndDelete(findFile?._id);

// 					if (person.role === 'COMPANY' || person.role === 'MEMBER') {
// 						let person2 =
// 							(await Companies.findById(req.person._id)) ||
// 							(await Members.findById(req.person._id).populate('company_id'));

// 						person2.credits -= JSONArray.length;
// 						await person2.save();

// 						if (person.role === 'COMPANY') {
// 							await CreditUsage.create({
// 								company: person._id,
// 								type: 'debit',
// 								product: 'Verifier',
// 								credits: JSONArray.length,
// 								isBulk: true,
// 								filename: req.body.filename,
// 								fileId: commonGUID,
// 							});
// 							const today = new Date().toISOString().split('T')[0];
// 							let entry = await CreditUsageData.findOne({
// 								company: person._id,
// 								date: today,
// 							});
// 							if (entry) {
// 								entry.credits += JSONArray.length;
// 								await entry.save();
// 							} else {
// 								await CreditUsageData.create({
// 									company: person._id,
// 									date: today,
// 									credits: JSONArray.length,
// 								});
// 							}
// 						} else {
// 							await CreditUsage.create({
// 								company: person.company_id._id,
// 								member: person._id,
// 								type: 'debit',
// 								product: 'Verifier',
// 								credits: JSONArray.length,
// 								isBulk: true,
// 								filename: req.body.filename,
// 								fileId: commonGUID,
// 							});
// 							const today = new Date().toISOString().split('T')[0];
// 							let entry = await CreditUsageData.findOne({
// 								member: person._id,
// 								date: today,
// 							});
// 							if (entry) {
// 								entry.credits += JSONArray.length;
// 								await entry.save();
// 							} else {
// 								await CreditUsageData.create({
// 									company: person.company_id._id,
// 									member: person._id,
// 									date: today,
// 									credits: JSONArray.length,
// 								});
// 							}
// 						}
// 					} else if (person.role === 'ADMIN') {
// 						await CreditUsage.create({
// 							admin: person._id,
// 							type: 'debit',
// 							product: 'Verifier',
// 							credits: JSONArray.length,
// 							isBulk: true,
// 							filename: req.body.filename,
// 							fileId: commonGUID,
// 						});
// 						const today = new Date().toISOString().split('T')[0];
// 						let entry = await CreditUsageData.findOne({
// 							admin: person._id,
// 							date: today,
// 						});
// 						if (entry) {
// 							entry.credits += JSONArray.length;
// 							await entry.save();
// 						} else {
// 							await CreditUsageData.create({
// 								admin: person._id,
// 								date: today,
// 								credits: JSONArray.length,
// 							});
// 						}
// 					} else if (person.role === 'SUB_ADMIN') {
// 						await CreditUsage.create({
// 							subadmin: person._id,
// 							type: 'debit',
// 							product: 'Verifier',
// 							credits: JSONArray.length,
// 							isBulk: true,
// 							filename: req.body.filename,
// 							fileId: commonGUID,
// 						});
// 						const today = new Date().toISOString().split('T')[0];
// 						let entry = await CreditUsageData.findOne({
// 							subadmin: person._id,
// 							date: today,
// 						});
// 						if (entry) {
// 							entry.credits += JSONArray.length;
// 							await entry.save();
// 						} else {
// 							await CreditUsageData.create({
// 								subadmin: person._id,
// 								date: today,
// 								credits: JSONArray.length,
// 							});
// 						}
// 					}
// 				} catch (err) {
// 					await FileVerifications.updateMany(
// 						{ sys_filename: findFile?.sys_filename },
// 						{
// 							$set: {
// 								progress_status: 'Failed',
// 								progress: 0,
// 								e_status: 'Failed',
// 							},
// 						}
// 					);
// 				}

// 				fs.unlink(findFile?.filePath, (err) => {
// 					if (err) {
// 						console.error('Error deleting file:', err);
// 					} else {
// 						console.log('File deleted:', findFile?.filePath);
// 					}
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err?.message);
// 	}
// }

// async function VerifierStatusCheck() {
// 	try {
// 		let data = await FileVerifications.aggregate([
// 			{
// 				$match: {
// 					mainVerify: true,
// 					progress_status: 'In-Process',
// 					bbid: { $exists: true },
// 					e_status: 'In_Progress',
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: '$sys_filename',
// 					bbid: { $first: '$bbid' },
// 				},
// 			},
// 		]);
// 		if (data.length > 0) {
// 			for (const rev of data) {
// 				const response = await axios.get(
// 					`https://api.bounceban.com/v1/verify/bulk/status?id=${rev.bbid}`,
// 					{
// 						headers: {
// 							Authorization: process.env.BOUNCEBAN_KEY,
// 						},
// 					}
// 				);

// 				if (response.data) {
// 					const { credits_remaining, ...rest } = response?.data;
// 					if (response.data.status !== 'finished') {
// 						const progress =
// 							(response.data.finished_count / response.data.total_count) * 100;
// 						await FileVerifications.updateMany(
// 							{ sys_filename: rev._id },
// 							{
// 								progress: progress,
// 								party_counts: rest,
// 							}
// 						);
// 					} else {
// 						await FileVerifications.updateMany(
// 							{ sys_filename: rev._id },
// 							{
// 								progress: 100,
// 								party_counts: rest,
// 								progress_status: 'Organizing',
// 							}
// 						);
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function VerifierStatusCheckMV() {
// 	try {
// 		let data = await FileVerifications.aggregate([
// 			{
// 				$match: {
// 					vendor: 'Million Verifier',
// 					mainVerify: false,
// 					progress_status: 'In-Process',
// 					bbid: { $exists: true },
// 					e_status: 'In_Other_Progress',
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: '$sys_filename',
// 					bbid: { $first: '$bbid' },
// 					person: { $first: '$person' },
// 				},
// 			},
// 		]);
// 		if (data.length > 0) {
// 			for (const rev of data) {
// 				const key = await integrate_key_model.findOne({
// 					title: 'Million Verifier',
// 					company: rev.person.toString(),
// 				});
// 				if (key) {
// 					const response = await axios.get(
// 						`https://bulkapi.millionverifier.com/bulkapi/v2/fileinfo?key=${key?.apiKey}&file_id=${rev?.bbid}`
// 					);

// 					if (response?.data?.error === 'parameter file_id is not integer') {
// 						await FileVerifications.updateMany(
// 							{ sys_filename: rev._id },
// 							{ $set: { progress_status: 'Failed' } }
// 						);
// 					}

// 					if (response.data) {
// 						if (response.data.status !== 'finished') {
// 							const progress = response.data.percent;
// 							await FileVerifications.updateMany(
// 								{ sys_filename: rev._id },
// 								{
// 									progress: progress,
// 									party_counts: {
// 										deliverable_count: 0,
// 										pushed_count: 0,
// 										risky_count: 0,
// 										total_count: 0,
// 										undeliverable_count: 0,
// 										unknown_count: 0,
// 										credits_used: 0,
// 									},
// 									other_vendor_counts: {
// 										deliverable_count: response.data.ok,
// 										pushed_count: response.data.unique_emails,
// 										risky_count: response.data.catch_all,
// 										total_count: response.data.unique_emails,
// 										undeliverable_count: response.data.invalid,
// 										unknown_count: response.data.unknown,
// 										credits_used: response.data.unique_emails,
// 									},
// 								}
// 							);
// 						} else {
// 							await FileVerifications.updateMany(
// 								{ sys_filename: rev._id },
// 								{
// 									progress: 100,
// 									party_counts: {
// 										deliverable_count: 0,
// 										pushed_count: 0,
// 										risky_count: 0,
// 										total_count: 0,
// 										undeliverable_count: 0,
// 										unknown_count: 0,
// 										credits_used: 0,
// 									},
// 									other_vendor_counts: {
// 										deliverable_count: response.data.ok,
// 										pushed_count: response.data.unique_emails,
// 										risky_count: response.data.catch_all,
// 										total_count: response.data.unique_emails,
// 										undeliverable_count: response.data.invalid,
// 										unknown_count: response.data.unknown,
// 										credits_used: 0,
// 									},
// 									progress_status: 'Organizing',
// 								}
// 							);
// 						}
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function VerifierStatusCheckZB() {
// 	try {
// 		let data = await FileVerifications.aggregate([
// 			{
// 				$match: {
// 					vendor: 'Zero Bounce',
// 					mainVerify: false,
// 					progress_status: 'In-Process',
// 					bbid: { $exists: true },
// 					e_status: 'In_Other_Progress',
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: '$sys_filename',
// 					bbid: { $first: '$bbid' },
// 					person: { $first: '$person' },
// 				},
// 			},
// 		]);
// 		if (data.length > 0) {
// 			for (const rev of data) {
// 				const key = await integrate_key_model.findOne({
// 					title: 'Zero Bounce',
// 					company: rev.person.toString(),
// 				});
// 				if (key) {
// 					const response = await axios.get(
// 						`https://bulkapi.zerobounce.net/v2/filestatus?api_key=${key?.apiKey}&file_id=${rev?.bbid}`
// 					);

// 					if (response.data?.success) {
// 						if (response.data) {
// 							if (response.data.file_status !== 'Complete') {
// 								const progress = response.data.complete_percentage.replace(
// 									'%',
// 									''
// 								);
// 								await FileVerifications.updateMany(
// 									{ sys_filename: rev._id },
// 									{
// 										progress: progress,
// 										party_counts: {
// 											deliverable_count: 0,
// 											pushed_count: 0,
// 											risky_count: 0,
// 											total_count: 0,
// 											undeliverable_count: 0,
// 											unknown_count: 0,
// 											credits_used: 0,
// 										},
// 										// other_vendor_counts: {
// 										// 	deliverable_count: response.data.ok,
// 										// 	pushed_count: response.data.unique_emails,
// 										// 	risky_count: response.data.catch_all,
// 										// 	total_count: response.data.unique_emails,
// 										// 	undeliverable_count: response.data.invalid,
// 										// 	unknown_count: response.data.unknown,
// 										// 	credits_used: 0,
// 										// },
// 									}
// 								);
// 							} else {
// 								await FileVerifications.updateMany(
// 									{ sys_filename: rev._id },
// 									{
// 										progress: 100,
// 										party_counts: {
// 											deliverable_count: 0,
// 											pushed_count: 0,
// 											risky_count: 0,
// 											total_count: 0,
// 											undeliverable_count: 0,
// 											unknown_count: 0,
// 											credits_used: 0,
// 										},
// 										// other_vendor_counts: {
// 										// 	deliverable_count: response.data.ok,
// 										// 	pushed_count: response.data.unique_emails,
// 										// 	risky_count: response.data.catch_all,
// 										// 	total_count: response.data.unique_emails,
// 										// 	undeliverable_count: response.data.invalid,
// 										// 	unknown_count: response.data.unknown,
// 										// 	credits_used: 0,
// 										// },
// 										progress_status: 'Organizing',
// 									}
// 								);
// 							}
// 						}
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function VerifierStatusCheckNB() {
// 	try {
// 		let data = await FileVerifications.aggregate([
// 			{
// 				$match: {
// 					vendor: 'Never Bounce',
// 					mainVerify: false,
// 					progress_status: 'In-Process',
// 					bbid: { $exists: true },
// 					e_status: 'In_Other_Progress',
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: '$sys_filename',
// 					bbid: { $first: '$bbid' },
// 					person: { $first: '$person' },
// 				},
// 			},
// 		]);
// 		if (data.length > 0) {
// 			for (const rev of data) {
// 				const key = await integrate_key_model.findOne({
// 					title: 'Never Bounce',
// 					company: rev.person.toString(),
// 				});
// 				if (key) {
// 					const response = await axios.get(
// 						`https://api.neverbounce.com/v4.2/jobs/status?key=${key?.apiKey}&job_id=${rev?.bbid}`
// 					);

// 					if (response.data?.status === 'success') {
// 						if (response.data.job_status !== 'complete') {
// 							const progress = response.data.percent_complete;
// 							await FileVerifications.updateMany(
// 								{ sys_filename: rev._id },
// 								{
// 									progress: progress,
// 									party_counts: {
// 										deliverable_count: 0,
// 										pushed_count: 0,
// 										risky_count: 0,
// 										total_count: 0,
// 										undeliverable_count: 0,
// 										unknown_count: 0,
// 										credits_used: 0,
// 									},
// 									other_vendor_counts: {
// 										deliverable_count: response.data.total.valid,
// 										pushed_count: response.data.total.records,
// 										risky_count: response.data.total.catchall,
// 										total_count: response.data.total.records,
// 										undeliverable_count:
// 											response.data.total.invalid +
// 											response.data.total.bad_syntax +
// 											response.data.total.disposable,
// 										unknown_count: response.data.total.unknown,
// 										credits_used: response.data.total.records,
// 									},
// 								}
// 							);
// 						} else {
// 							await FileVerifications.updateMany(
// 								{ sys_filename: rev._id },
// 								{
// 									progress: 100,
// 									party_counts: {
// 										deliverable_count: 0,
// 										pushed_count: 0,
// 										risky_count: 0,
// 										total_count: 0,
// 										undeliverable_count: 0,
// 										unknown_count: 0,
// 										credits_used: 0,
// 									},
// 									other_vendor_counts: {
// 										deliverable_count: response.data.total.valid,
// 										pushed_count: response.data.total.records,
// 										risky_count: response.data.total.catchall,
// 										total_count: response.data.total.records,
// 										undeliverable_count:
// 											response.data.total.invalid +
// 											response.data.total.bad_syntax +
// 											response.data.total.disposable,
// 										unknown_count: response.data.total.unknown,
// 										credits_used: 0,
// 									},
// 									progress_status: 'Organizing',
// 								}
// 							);
// 						}
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function VerifierStatusCheckELV() {
// 	try {
// 		let data = await FileVerifications.aggregate([
// 			{
// 				$match: {
// 					vendor: 'Email List Verify',
// 					mainVerify: false,
// 					progress_status: 'In-Process',
// 					bbid: { $exists: true },
// 					e_status: 'In_Other_Progress',
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: '$sys_filename',
// 					bbid: { $first: '$bbid' },
// 					person: { $first: '$person' },
// 				},
// 			},
// 		]);
// 		if (data.length > 0) {
// 			for (const rev of data) {
// 				const key = await integrate_key_model.findOne({
// 					title: 'Email List Verify',
// 					company: rev.person.toString(),
// 				});
// 				if (key) {
// 					const response = await axios.get(
// 						`https://api.emaillistverify.com/api/maillists/${rev?.bbid}/progress`,
// 						{
// 							headers: { 'x-api-key': key?.apiKey },
// 						}
// 					);

// 					if (response.data) {
// 						if (response.data.status !== 'finished') {
// 							const progress = response.data.progress;
// 							await FileVerifications.updateMany(
// 								{ sys_filename: rev._id },
// 								{
// 									progress: progress,
// 									party_counts: {
// 										deliverable_count: 0,
// 										pushed_count: 0,
// 										risky_count: 0,
// 										total_count: 0,
// 										undeliverable_count: 0,
// 										unknown_count: 0,
// 										credits_used: 0,
// 									},
// 									// other_vendor_counts: {
// 									// 	deliverable_count: response.data.ok,
// 									// 	pushed_count: response.data.unique_emails,
// 									// 	risky_count: response.data.catch_all,
// 									// 	total_count: response.data.unique_emails,
// 									// 	undeliverable_count: response.data.invalid,
// 									// 	unknown_count: response.data.unknown,
// 									// 	credits_used: 0,
// 									// },
// 								}
// 							);
// 						} else {
// 							await FileVerifications.updateMany(
// 								{ sys_filename: rev._id },
// 								{
// 									progress: 100,
// 									party_counts: {
// 										deliverable_count: 0,
// 										pushed_count: 0,
// 										risky_count: 0,
// 										total_count: 0,
// 										undeliverable_count: 0,
// 										unknown_count: 0,
// 										credits_used: 0,
// 									},
// 									// other_vendor_counts: {
// 									// 	deliverable_count: response.data.ok,
// 									// 	pushed_count: response.data.unique_emails,
// 									// 	risky_count: response.data.catch_all,
// 									// 	total_count: response.data.unique_emails,
// 									// 	undeliverable_count: response.data.invalid,
// 									// 	unknown_count: response.data.unknown,
// 									// 	credits_used: 0,
// 									// },
// 									progress_status: 'Organizing',
// 								}
// 							);
// 						}
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function arrangeVerifierFile() {
// 	try {
// 		let data = await FileVerifications.findOne({
// 			progress_status: 'Organizing',
// 			mainVerify: true,
// 		});

// 		if (data) {
// 			const response = await axios.get(
// 				`https://api.bounceban.com/v1/verify/bulk/dump?id=${data.bbid}&retrieve_all=1`,
// 				{
// 					headers: {
// 						Authorization: process.env.BOUNCEBAN_KEY,
// 					},
// 				}
// 			);

// 			if (response.data && response.data.items.length > 0) {
// 				const bulkOps = response.data.items.map((rev) => ({
// 					updateOne: {
// 						filter: { email: rev.email, sys_filename: data.sys_filename },
// 						update: { result: rev, emailstatus: rev.result, score: rev.score },
// 					},
// 				}));

// 				const executeBulkInBatches = async (operations, batchSize = 900) => {
// 					for (let i = 0; i < operations.length; i += batchSize) {
// 						const batch = operations.slice(i, i + batchSize);
// 						await FileVerifications.bulkWrite(batch);
// 					}
// 				};

// 				await executeBulkInBatches(bulkOps, 900);

// 				if (data.vendor !== 'EmailAddress.ai') {
// 					const credits_used = data.party_counts.credits_consumed;

// 					const deliverable_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'deliverable',
// 					});
// 					const undeliverable_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'undeliverable',
// 					});
// 					const unknown_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'unknown',
// 					});
// 					const risky_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'risky',
// 					});

// 					await FileVerifications.updateMany(
// 						{ sys_filename: data.sys_filename },
// 						{
// 							ea_counts: data.party_counts,
// 							party_counts: {
// 								deliverable_count: deliverable_count,
// 								pushed_count: data.total_count,
// 								risky_count: risky_count,
// 								total_count: data.total_count,
// 								undeliverable_count: undeliverable_count,
// 								unknown_count: unknown_count,
// 								credits_used: credits_used,
// 							},
// 						}
// 					);
// 				}

// 				await FileVerifications.updateMany(
// 					{ sys_filename: data.sys_filename },
// 					{
// 						is_enrichment: true,
// 						progress_status: 'Enrichment',
// 						e_status: 'Completed',
// 					}
// 				);
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function arrangeVerifierFileMV() {
// 	try {
// 		let data = await FileVerifications.findOne({
// 			progress_status: 'Organizing',
// 			vendor: 'Million Verifier',
// 			mainVerify: false,
// 		});

// 		if (data) {
// 			const key = await integrate_key_model.findOne({
// 				title: 'Million Verifier',
// 				company: data.person.toString(),
// 			});
// 			if (key) {
// 				const response = await axios.get(
// 					`https://bulkapi.millionverifier.com/bulkapi/v2/download?key=${key?.apiKey}&file_id=${data.bbid}&filter=all`
// 				);

// 				let result = await csvtojson().fromString(response.data);

// 				let fileData = await FileVerifications.find({
// 					sys_filename: data.sys_filename,
// 				});

// 				const resultMap = new Map([
// 					['ok', 'deliverable'],
// 					['catch_all', 'risky'],
// 					['unknown', 'risky'],
// 					['invalid', 'undeliverable'],
// 				]);

// 				const updateArray = fileData.map((obj) => {
// 					const resultObj = result.find((item) => item.email === obj.email);
// 					if (resultObj) {
// 						const { result } = resultObj;
// 						const status = resultMap.get(result) || 'undeliverable';
// 						return { ...obj._doc, emailstatus: status };
// 					} else {
// 						return { ...obj._doc };
// 					}
// 				});

// 				if (updateArray.length > 0) {
// 					while (updateArray.length > 0) {
// 						var shortUpdateArray = updateArray.splice(0, 950);
// 						const bulkOps = shortUpdateArray.map((obj) => ({
// 							updateOne: {
// 								filter: { sys_filename: data.sys_filename, email: obj.email },
// 								update: {
// 									$set: {
// 										emailstatus: obj.emailstatus,
// 									},
// 								},
// 							},
// 						}));

// 						await FileVerifications.bulkWrite(bulkOps);
// 					}

// 					const findCatchAlls = await FileVerifications.find(
// 						{
// 							sys_filename: data.sys_filename,
// 							emailstatus: 'risky',
// 						},
// 						{ email: 1, filename: 1, sys_filename: 1 }
// 					);

// 					if (findCatchAlls?.length > 0) {
// 						const emailAddresses = findCatchAlls.map((obj) => obj.email);

// 						const response = await axios.post(
// 							`https://api.bounceban.com/v1/verify/bulk`,
// 							{
// 								emails: emailAddresses,
// 								name: findCatchAlls[0].filename,
// 								url: `${process.env.BackendURL}/internal/bulkUrl`,
// 								url_finished: `${process.env.BackendURL}/internal/bulkUrlFinished`,
// 							},
// 							{
// 								headers: {
// 									Authorization: process.env.BOUNCEBAN_KEY,
// 								},
// 							}
// 						);

// 						await FileVerifications.updateMany(
// 							{ sys_filename: findCatchAlls[0].sys_filename },
// 							{
// 								$set: {
// 									bbid: response?.data?.id,
// 									progress: 0,
// 									e_status: 'In_Progress',
// 									progress_status: 'In-Process',
// 									mainVerify: true,
// 								},
// 							}
// 						);
// 					} else {
// 						await FileVerifications.updateMany(
// 							{ sys_filename: data.sys_filename },
// 							{
// 								$set: {
// 									is_enrichment: true,
// 									progress_status: 'Enrichment',
// 									e_status: 'Completed',
// 								},
// 							}
// 						);
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function arrangeVerifierFileZB() {
// 	try {
// 		let data = await FileVerifications.findOne({
// 			progress_status: 'Organizing',
// 			vendor: 'Zero Bounce',
// 			mainVerify: false,
// 		});

// 		if (data) {
// 			const key = await integrate_key_model.findOne({
// 				title: 'Zero Bounce',
// 				company: data.person.toString(),
// 			});
// 			if (key) {
// 				const response = await axios.get(
// 					`https://bulkapi.zerobounce.net/v2/getfile?api_key=${key?.apiKey}&file_id=${data.bbid}`
// 				);

// 				let result = await csvtojson().fromString(response.data);

// 				let fileData = await FileVerifications.find({
// 					sys_filename: data.sys_filename,
// 				});

// 				const resultMap = new Map([
// 					['valid', 'deliverable'],
// 					['catchall', 'risky'],
// 					['catch-all', 'risky'],
// 					['catch_all', 'risky'],
// 					['unknown', 'unknown'],
// 					['disposable', 'risky'],
// 					['invalid', 'undeliverable'],
// 					['do_not_mail', 'undeliverable'],
// 					['abuse', 'undeliverable'],
// 					['spamtrap', 'undeliverable'],
// 				]);

// 				const updateArray = fileData.map((obj) => {
// 					const resultObj = result.find(
// 						(item) => item['Email Address'] === obj.email
// 					);
// 					if (resultObj) {
// 						const status =
// 							resultMap.get(resultObj['ZB Status']) || 'undeliverable';
// 						return {
// 							...obj._doc,
// 							emailstatus: status,
// 							result: {
// 								mx_records: [resultObj['ZB Mx Record']],
// 								smtp_provider: resultObj['ZB SMTP Provider'],
// 							},
// 						};
// 					} else {
// 						return { ...obj._doc };
// 					}
// 				});

// 				if (updateArray.length > 0) {
// 					while (updateArray.length > 0) {
// 						var shortUpdateArray = updateArray.splice(0, 950);
// 						const bulkOps = shortUpdateArray.map((obj) => ({
// 							updateOne: {
// 								filter: { sys_filename: data.sys_filename, email: obj.email },
// 								update: {
// 									$set: {
// 										emailstatus: obj.emailstatus,
// 										result: obj.result,
// 									},
// 								},
// 							},
// 						}));

// 						await FileVerifications.bulkWrite(bulkOps);
// 					}

// 					const deliverable_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'deliverable',
// 					});
// 					const undeliverable_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'undeliverable',
// 					});
// 					const unknown_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'unknown',
// 					});
// 					const risky_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'risky',
// 					});

// 					var party_counts = {
// 						deliverable_count: 0,
// 						pushed_count: 0,
// 						risky_count: 0,
// 						total_count: 0,
// 						undeliverable_count: 0,
// 						unknown_count: 0,
// 						credits_used: 0,
// 					};
// 					var other_vendor_counts = {
// 						deliverable_count: deliverable_count,
// 						pushed_count: result?.length,
// 						risky_count: risky_count,
// 						total_count: result?.length,
// 						undeliverable_count: undeliverable_count,
// 						unknown_count: unknown_count,
// 						credits_used: result?.length,
// 					};

// 					await FileVerifications.updateMany(
// 						{ sys_filename: data.sys_filename },
// 						{
// 							party_counts: party_counts,
// 							other_vendor_counts: other_vendor_counts,
// 						}
// 					);

// 					const findCatchAlls = await FileVerifications.find(
// 						{
// 							sys_filename: data.sys_filename,
// 							emailstatus: { $in: ['risky', 'unknown'] },
// 						},
// 						{ email: 1, filename: 1, sys_filename: 1 }
// 					);

// 					if (findCatchAlls?.length > 0) {
// 						const emailAddresses = findCatchAlls.map((obj) => obj.email);

// 						const response = await axios.post(
// 							`https://api.bounceban.com/v1/verify/bulk`,
// 							{
// 								emails: emailAddresses,
// 								name: findCatchAlls[0].filename,
// 								url: `${process.env.BackendURL}/internal/bulkUrl`,
// 								url_finished: `${process.env.BackendURL}/internal/bulkUrlFinished`,
// 							},
// 							{
// 								headers: {
// 									Authorization: process.env.BOUNCEBAN_KEY,
// 								},
// 							}
// 						);

// 						await FileVerifications.updateMany(
// 							{ sys_filename: findCatchAlls[0].sys_filename },
// 							{
// 								$set: {
// 									bbid: response?.data?.id,
// 									progress: 0,
// 									e_status: 'In_Progress',
// 									progress_status: 'In-Process',
// 									mainVerify: true,
// 								},
// 							}
// 						);
// 					} else {
// 						await FileVerifications.updateMany(
// 							{ sys_filename: data.sys_filename },
// 							{
// 								$set: {
// 									is_enrichment: true,
// 									progress_status: 'Enrichment',
// 									e_status: 'Completed',
// 								},
// 							}
// 						);
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function arrangeVerifierFileNB() {
// 	try {
// 		let data = await FileVerifications.findOne({
// 			progress_status: 'Organizing',
// 			vendor: 'Never Bounce',
// 			mainVerify: false,
// 		});

// 		if (data) {
// 			const key = await integrate_key_model.findOne({
// 				title: 'Never Bounce',
// 				company: data.person.toString(),
// 			});
// 			if (key) {
// 				const response = await axios.get(
// 					`https://api.neverbounce.com/v4.2/jobs/results?key=${key?.apiKey}&job_id=${data.bbid}`
// 				);

// 				let result = response.data.results;

// 				let fileData = await FileVerifications.find({
// 					sys_filename: data.sys_filename,
// 				});

// 				const resultMap = new Map([
// 					['valid', 'deliverable'],
// 					['catchall', 'risky'],
// 					['unknown', 'unknown'],
// 					['disposable', 'risky'],
// 					['invalid', 'undeliverable'],
// 				]);

// 				const updateArray = fileData.map((obj) => {
// 					const resultObj = result.find(
// 						(item) => item?.data?.email === obj.email
// 					);
// 					if (resultObj) {
// 						const { verification } = resultObj;
// 						const status =
// 							resultMap.get(verification.result) || 'undeliverable';
// 						return { ...obj._doc, emailstatus: status };
// 					} else {
// 						return { ...obj._doc };
// 					}
// 				});

// 				if (updateArray.length > 0) {
// 					while (updateArray.length > 0) {
// 						var shortUpdateArray = updateArray.splice(0, 950);
// 						const bulkOps = shortUpdateArray.map((obj) => ({
// 							updateOne: {
// 								filter: { sys_filename: data.sys_filename, email: obj.email },
// 								update: {
// 									$set: {
// 										emailstatus: obj.emailstatus,
// 									},
// 								},
// 							},
// 						}));

// 						await FileVerifications.bulkWrite(bulkOps);
// 					}

// 					const findCatchAlls = await FileVerifications.find(
// 						{
// 							sys_filename: data.sys_filename,
// 							emailstatus: { $in: ['risky', 'unknown'] },
// 						},
// 						{ email: 1, filename: 1, sys_filename: 1 }
// 					);

// 					if (findCatchAlls?.length > 0) {
// 						const emailAddresses = findCatchAlls.map((obj) => obj.email);

// 						const response = await axios.post(
// 							`https://api.bounceban.com/v1/verify/bulk`,
// 							{
// 								emails: emailAddresses,
// 								name: findCatchAlls[0].filename,
// 								url: `${process.env.BackendURL}/internal/bulkUrl`,
// 								url_finished: `${process.env.BackendURL}/internal/bulkUrlFinished`,
// 							},
// 							{
// 								headers: {
// 									Authorization: process.env.BOUNCEBAN_KEY,
// 								},
// 							}
// 						);

// 						await FileVerifications.updateMany(
// 							{ sys_filename: findCatchAlls[0].sys_filename },
// 							{
// 								$set: {
// 									bbid: response?.data?.id,
// 									progress: 0,
// 									e_status: 'In_Progress',
// 									progress_status: 'In-Process',
// 									mainVerify: true,
// 								},
// 							}
// 						);
// 					} else {
// 						await FileVerifications.updateMany(
// 							{ sys_filename: data.sys_filename },
// 							{
// 								$set: {
// 									is_enrichment: true,
// 									progress_status: 'Enrichment',
// 									e_status: 'Completed',
// 								},
// 							}
// 						);
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function arrangeVerifierFileELV() {
// 	try {
// 		let data = await FileVerifications.findOne({
// 			progress_status: 'Organizing',
// 			vendor: 'Email List Verify',
// 			mainVerify: false,
// 		});

// 		if (data) {
// 			const key = await integrate_key_model.findOne({
// 				title: 'Email List Verify',
// 				company: data.person.toString(),
// 			});
// 			if (key) {
// 				console.log('elv yes');
// 				const response = await axios.get(
// 					`https://api.emaillistverify.com/api/maillists/${data?.bbid}?addMxServer=true&format=csv`,
// 					{
// 						headers: { 'x-api-key': key?.apiKey },
// 					}
// 				);

// 				let result = await csvtojson().fromString(response.data);

// 				let fileData = await FileVerifications.find({
// 					sys_filename: data.sys_filename,
// 				});

// 				const resultMap = new Map([
// 					['ok', 'deliverable'],
// 					['ok_for_all', 'risky'],
// 					['unknown', 'unknown'],
// 					['email_disabled', 'risky'],
// 					['antispam_system', 'risky'],
// 					['disposable', 'risky'],
// 					['invalid', 'undeliverable'],
// 					['dead_server', 'undeliverable'],
// 					['spamtrap', 'undeliverable'],
// 					['invalid_mx', 'undeliverable'],
// 					['invalid_syntax', 'undeliverable'],
// 				]);

// 				const updateArray = fileData.map((obj) => {
// 					const resultObj = result.find((item) => item?.email === obj.email);
// 					if (resultObj) {
// 						const status =
// 							resultMap.get(resultObj['ELV Result']) || 'undeliverable';
// 						return {
// 							...obj._doc,
// 							emailstatus: status,
// 							result: { mx_records: [resultObj['ELV MX Server']] },
// 						};
// 					} else {
// 						return { ...obj._doc };
// 					}
// 				});

// 				if (updateArray.length > 0) {
// 					while (updateArray.length > 0) {
// 						var shortUpdateArray = updateArray.splice(0, 950);
// 						const bulkOps = shortUpdateArray.map((obj) => ({
// 							updateOne: {
// 								filter: { sys_filename: data.sys_filename, email: obj.email },
// 								update: {
// 									$set: {
// 										emailstatus: obj.emailstatus,
// 										result: obj.result,
// 									},
// 								},
// 							},
// 						}));

// 						await FileVerifications.bulkWrite(bulkOps);
// 					}

// 					const deliverable_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'deliverable',
// 					});
// 					const undeliverable_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'undeliverable',
// 					});
// 					const unknown_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'unknown',
// 					});
// 					const risky_count = await FileVerifications.countDocuments({
// 						sys_filename: data.sys_filename,
// 						emailstatus: 'risky',
// 					});

// 					var party_counts = {
// 						deliverable_count: 0,
// 						pushed_count: 0,
// 						risky_count: 0,
// 						total_count: 0,
// 						undeliverable_count: 0,
// 						unknown_count: 0,
// 						credits_used: 0,
// 					};
// 					var other_vendor_counts = {
// 						deliverable_count: deliverable_count,
// 						pushed_count: result?.length,
// 						risky_count: risky_count,
// 						total_count: result?.length,
// 						undeliverable_count: undeliverable_count,
// 						unknown_count: unknown_count,
// 						credits_used: result?.length,
// 					};

// 					await FileVerifications.updateMany(
// 						{ sys_filename: data.sys_filename },
// 						{
// 							party_counts: party_counts,
// 							other_vendor_counts: other_vendor_counts,
// 						}
// 					);

// 					const findCatchAlls = await FileVerifications.find(
// 						{
// 							sys_filename: data.sys_filename,
// 							emailstatus: { $in: ['risky', 'unknown'] },
// 						},
// 						{ email: 1, filename: 1, sys_filename: 1 }
// 					);

// 					if (findCatchAlls?.length > 0) {
// 						const emailAddresses = findCatchAlls.map((obj) => obj.email);

// 						const response = await axios.post(
// 							`https://api.bounceban.com/v1/verify/bulk`,
// 							{
// 								emails: emailAddresses,
// 								name: findCatchAlls[0].filename,
// 								url: `${process.env.BackendURL}/internal/bulkUrl`,
// 								url_finished: `${process.env.BackendURL}/internal/bulkUrlFinished`,
// 							},
// 							{
// 								headers: {
// 									Authorization: process.env.BOUNCEBAN_KEY,
// 								},
// 							}
// 						);

// 						await FileVerifications.updateMany(
// 							{ sys_filename: findCatchAlls[0].sys_filename },
// 							{
// 								$set: {
// 									bbid: response?.data?.id,
// 									progress: 0,
// 									e_status: 'In_Progress',
// 									progress_status: 'In-Process',
// 									mainVerify: true,
// 								},
// 							}
// 						);
// 					} else {
// 						await FileVerifications.updateMany(
// 							{ sys_filename: data.sys_filename },
// 							{
// 								$set: {
// 									is_enrichment: true,
// 									progress_status: 'Enrichment',
// 									e_status: 'Completed',
// 								},
// 							}
// 						);
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function VerifyAnymailFile() {
// 	try {
// 		let data = await EnhancerFiles.findOne({
// 			e_status: 'Anymail Appended',
// 		});
// 		if (data) {
// 			const dataArray = await EnhancerFiles.find(
// 				{
// 					sys_filename: data.sys_filename,
// 				},
// 				{
// 					sys_filename: 1,
// 					email: 1,
// 					amf_status: 1,
// 					email_type: 1,
// 				}
// 			);
// 			const appended = await EnhancerFiles.countDocuments({
// 				sys_filename: data.sys_filename,
// 				email: { $exists: true, $nin: [''] },
// 			});

// 			await EnhancerFiles.updateMany(
// 				{ sys_filename: data.sys_filename },
// 				{ appended: appended }
// 			);
// 			console.log('Appended Count Updated');

// 			if (dataArray.length > 0) {
// 				const emailData = dataArray
// 					.filter(
// 						(item) =>
// 							item?.amf_status === 'ok' &&
// 							item?.email_type === 'not_verified' &&
// 							item?.email
// 					)
// 					.map((item) => ({
// 						email: item?.email || '',
// 					}));

// 				if (emailData?.length > 0) {
// 					const csvData = papaparse.unparse(emailData, { header: true });

// 					//const bufferData = Buffer.from(csvData);
// 					const tempFilePath = `${data.filename}.csv`;
// 					fs.writeFileSync(tempFilePath, csvData);

// 					const formData = new FormData();
// 					formData.append('file', fs.createReadStream(tempFilePath));
// 					formData.append('email_column', 0);
// 					formData.append('name', data.filename + '_anymail');

// 					try {
// 						const response = await axios.post(
// 							'https://api.bounceban.com/v1/verify/bulk/file',
// 							formData,
// 							{
// 								headers: {
// 									Authorization: process.env.BOUNCEBAN_KEY,
// 								},
// 							}
// 						);

// 						if (response.data) {
// 							await EnhancerFiles.updateMany(
// 								{ sys_filename: data.sys_filename },
// 								{
// 									bbid: response.data.id,
// 									progress: 0,
// 									e_status: 'Anymail_Progress',
// 									progress_status: 'Verifying',
// 								}
// 							);
// 							fs.unlink(`${data.filename}.csv`, (err) => {
// 								if (err) {
// 									console.error('Error deleting file:', err);
// 								} else {
// 									console.log('File deleted successfully.');
// 								}
// 							});
// 						}
// 					} catch (error) {
// 						console.error('Error uploading file:', error.message);
// 					}
// 				} else {
// 					await EnhancerFiles.updateMany(
// 						{ sys_filename: data.sys_filename },
// 						{
// 							progress: 100,
// 							progress_status: 'Organizing',
// 						}
// 					);
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function enrichVerifierFile() {
// 	try {
// 		const checkOption = await FileVerifications.findOne({
// 			progress_status: 'Enrichment',
// 			findProfile: false,
// 		});
// 		if (checkOption) {
// 			await FileVerifications.updateMany(
// 				{
// 					progress_status: 'Enrichment',
// 					findProfile: false,
// 				},
// 				{ $set: { is_enrichment: true } }
// 			);
// 		}

// 		const checkInvalid = await FileVerifications.findOne({
// 			progress_status: 'Enrichment',
// 			is_enrichment: false,
// 			emailstatus: { $ne: 'deliverable' },
// 		});
// 		if (checkInvalid) {
// 			await FileVerifications.updateMany(
// 				{
// 					progress_status: 'Enrichment',
// 					is_enrichment: false,
// 					emailstatus: { $ne: 'deliverable' },
// 				},
// 				{ $set: { is_enrichment: true } }
// 			);
// 		}

// 		let data = await FileVerifications.find({
// 			progress_status: 'Enrichment',
// 			is_enrichment: false,
// 		}).limit(10);

// 		if (data?.length > 0) {
// 			for (const rev of data) {
// 				if (rev?.emailstatus === 'deliverable') {
// 					try {
// 						const enrichmentRes = await axios.get(
// 							`https://api.enrichmentapi.io/reverse_email?api_key=${process.env.ENRICHMENT_KEY}&email=${rev.email}`
// 						);

// 						if (enrichmentRes?.data?.status === 200) {
// 							const { person_data, company_data } = enrichmentRes?.data;

// 							await FileVerifications.findByIdAndUpdate(rev._id, {
// 								$set: {
// 									profile_data: person_data,
// 									company_data: company_data,
// 									is_enrichment: true,
// 								},
// 							});
// 						}
// 					} catch (err) {
// 						await FileVerifications.findByIdAndUpdate(rev._id, {
// 							$set: {
// 								is_enrichment: true,
// 							},
// 						});
// 					}
// 				} else {
// 					await FileVerifications.findByIdAndUpdate(rev._id, {
// 						$set: {
// 							is_enrichment: true,
// 						},
// 					});
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function completeVerifierFile() {
// 	try {
// 		let data = await FileVerifications.findOne({
// 			progress_status: 'Enrichment',
// 		});

// 		if (data) {
// 			const check = await FileVerifications.findOne({
// 				sys_filename: data.sys_filename,
// 				is_enrichment: false,
// 			});

// 			if (!check) {
// 				await FileVerifications.updateMany(
// 					{ sys_filename: data.sys_filename },
// 					{
// 						progress_status: 'Completed',
// 						e_status: 'Completed',
// 					}
// 				);
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// async function sendVerifierEmail() {
// 	try {
// 		const data = await FileVerifications.findOne({
// 			progress_status: 'Completed',
// 			e_status: 'Completed',
// 			emailsent: false,
// 		});

// 		if (data?.emailsent === false) {
// 			const allData = await FileVerifications.find(
// 				{
// 					sys_filename: data?.sys_filename,
// 				},
// 				{ emailstatus: 1 }
// 			);

// 			const deliverableCount = allData.filter(
// 				(rev) => rev.emailstatus === 'deliverable'
// 			).length;

// 			var person =
// 				(await Admin.findById(data?.person)) ||
// 				(await SubAdmin.findById(data?.person)) ||
// 				(await Companies.findById(data?.person)) ||
// 				(await Members.findById(data?.person).populate('company_id'));

// 			const msg2 = {
// 				to: person.email,
// 				from: process.env.EMAIL_USERNAME,
// 				bcc: 'girishk919@gmail.com',
// 				subject: `Your Email Verification: ${data.filename} file is Verified.`,
// 				html: `<p>File processing complete and ready to download.</p><br />
// 				<p>You have requested to verify ${data.total_count} emails.</p>
// 				<p>${deliverableCount} of these emails are deliverable.</p>
// 				<p>If you have not requested one, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
// 				<p>Thanks,</p><p>Team at EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
// 			};

// 			let transport = nodemailer.createTransport({
// 				pool: true,
// 				host: 'smtp.gmail.com',
// 				port: 465,
// 				secure: true,
// 				auth: {
// 					user: process.env.EMAIL_USERNAME,
// 					pass: process.env.EMAIL_PASSWORD,
// 				},
// 				tls: {
// 					rejectUnauthorized: false,
// 				},
// 				maxConnections: 5,
// 				maxMessages: 100,
// 			});

// 			await transport.sendMail(msg2);

// 			await FileVerifications.updateMany(
// 				{ sys_filename: data.sys_filename },
// 				{ emailsent: true }
// 			);

// 			const extraCredits =
// 				Number(data?.total_count) - Number(data?.party_counts?.credits_used);

// 			if (person && data?.company_id) {
// 				person.credits += extraCredits;
// 				await person.save();
// 			}

// 			if (data?.company_id) {
// 				const findUsage = await CreditUsage.findOne({
// 					member: data?.person,
// 					fileId: data?.sys_filename,
// 				});
// 				if (findUsage) {
// 					findUsage.credits = Number(data?.party_counts?.credits_used);
// 					await findUsage.save();

// 					const today = new Date().toISOString().split('T')[0];
// 					let entry = await CreditUsageData.findOne({
// 						member: data?.person,
// 						date: today,
// 					});
// 					if (entry) {
// 						entry.credits -= extraCredits;
// 						await entry.save();
// 					}
// 				} else {
// 					const findComUsage = await CreditUsage.findOne({
// 						company: data?.person,
// 						fileId: data?.sys_filename,
// 					});
// 					if (findComUsage) {
// 						findComUsage.credits = Number(data?.party_counts?.credits_used);
// 						await findComUsage.save();

// 						const today = new Date().toISOString().split('T')[0];
// 						let entry = await CreditUsageData.findOne({
// 							company: data?.person,
// 							date: today,
// 						});
// 						if (entry) {
// 							entry.credits -= extraCredits;
// 							await entry.save();
// 						}
// 					}
// 				}
// 			} else if (data?.admin) {
// 				const findUsage = await CreditUsage.findOne({
// 					admin: data?.person,
// 					fileId: data?.sys_filename,
// 				});
// 				if (findUsage) {
// 					findUsage.credits = Number(data?.party_counts?.credits_used);
// 					await findUsage.save();

// 					const today = new Date().toISOString().split('T')[0];
// 					let entry = await CreditUsageData.findOne({
// 						admin: data?.person,
// 						date: today,
// 					});
// 					if (entry) {
// 						entry.credits -= extraCredits;
// 						await entry.save();
// 					}
// 				}
// 			} else if (data?.subadmin) {
// 				const findUsage = await CreditUsage.findOne({
// 					subadmin: data?.person,
// 					fileId: data?.sys_filename,
// 				});
// 				if (findUsage) {
// 					findUsage.credits = Number(data?.party_counts?.credits_used);
// 					await findUsage.save();

// 					const today = new Date().toISOString().split('T')[0];
// 					let entry = await CreditUsageData.findOne({
// 						subadmin: data?.person,
// 						date: today,
// 					});
// 					if (entry) {
// 						entry.credits -= extraCredits;
// 						await entry.save();
// 					}
// 				}
// 			}
// 		}
// 	} catch (err) {
// 		console.log(err);
// 	}
// }

// setInterval(checkexpire, 300000);
// setInterval(checkunpaidinvoice, 60000);

// // setInterval(AppendSkrappFile, 20000);
// // setInterval(VerifySkrappFile, 30000);
// // setInterval(BBStatusCheckSkrapp, 60000);
// // setInterval(addBBResultSkrapp, 120000);

// setInterval(AppendAnymailFile, 60000);
// setInterval(checkAnymailStatus, 90000);
// setInterval(VerifyAnymailFile, 30000);
// setInterval(BBStatusCheckAnymail, 60000);
// setInterval(addBBResultAnymail, 120000);

// setInterval(AppendIcypeasFile, 60000);
// setInterval(checkIcypeasStatus, 90000);
// setInterval(enrichEnhancerFile, 20000);
// setInterval(completeEnhancerFile, 15000);
// // setInterval(VerifyIcypeasFile, 30000);
// // setInterval(BBStatusCheckIcypeas, 60000);
// // setInterval(addBBResultIcypeas, 120000);

// setInterval(sendEnhancerEmail, 30000);

// setInterval(uploadVerificationFile, 300000);

// setInterval(VerifierStatusCheck, 60000);
// setInterval(VerifierStatusCheckMV, 60000);
// setInterval(VerifierStatusCheckZB, 60000);
// setInterval(VerifierStatusCheckNB, 60000);
// setInterval(VerifierStatusCheckELV, 60000);
// setInterval(arrangeVerifierFile, 180000);
// setInterval(arrangeVerifierFileMV, 180000);
// setInterval(arrangeVerifierFileZB, 180000);
// setInterval(arrangeVerifierFileNB, 180000);
// setInterval(arrangeVerifierFileELV, 180000);
// setInterval(enrichVerifierFile, 20000);
// setInterval(completeVerifierFile, 15000);

// setInterval(sendVerifierEmail, 60000);
// setInterval(checkFile, 60000);
// setInterval(completeFile, 120000);
// setInterval(deleteQueue, 200000);

app.get('/', async (req, res) => {
	res.json({ message: 'Servers is up and running at 3333' });
});

app.get('/test-changes', async (req, res) => {
	try {
		const data = await Invoices.findById('6779cbe34bc410eb94643758');

		const stripeSub = await stripe.subscriptions.retrieve(
			'sub_1QShxiIJ6O2h2Dg7vyDsuNEI'
		);
		const stripeInvoice = await stripe.invoices.retrieve(
			data.stripe_invoice_id
		);
		return res.json({ message: 'Done', data, stripeSub, stripeInvoice });
	} catch (err) {
		return res.json({ err });
	}
});

app.listen(port, () => {
	console.log(`Server is running on port: ${port}`);
});
