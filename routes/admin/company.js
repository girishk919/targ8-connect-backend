/** @format */

const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

const authorize = require('../../helpers/authorize');

const Activities = require('../../models/admin/activity_log_model');
const Admins = require('../../models/admin/admin_model');
const Companies = require('../../models/company/company_model');
const TempCompanies = require('../../models/company/tempCompany_model');
const Members = require('../../models/member/member_model');
const Invites = require('../../models/company/invite_model');
const Invoices = require('../../models/company/invoice_model');
const Plans = require('../../models/company/plans_model');
const Folders = require('../../models/common/folder_model');
const Downloads = require('../../models/common/downloads_model');
const SaveSearch = require('../../models/common/savesearch_model');
const Exclusions = require('../../models/common/exclusion_model');
const CreditRequests = require('../../models/member/request_credits_model');
const Subscriptions = require('../../models/admin/subscription_model');
const CompanyActivityLogs = require('../../models/company/activity_log_model');
const MemberActivityLogs = require('../../models/member/activity_log_model');
const CompanyTransaction = require('../../models/company/trans_model');
const CreditUsage = require('../../models/common/credit_usage');

// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const editProfileValidation = require('../../validations/common/edit_profile_validation');
const inviteValidation = require('../../validations/company/invite_validation');
const addCompanyValidation = require('../../validations/admin/addcompany_validation');
const { verifyToken, accessAdmin } = require('../../helpers/authorize');
const nodemailer = require('nodemailer');
const blocked_model = require('../../models/company/blocked_model');
const Product = require('../../models/admin/product_model');

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
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			var companies = await Companies.find()
				.select('-password')
				.sort({ createdAt: -1 });
			// .populate('plan');

			//var tempCompanies = await TempCompanies.find().select('-password');

			if (!companies) return res.status(400).json('No Company found!');

			// companies.forEach(async (comp, id) => {
			// 	if (companies[id].planType === 'PYG') {
			// 		// companies[id].type = 'PYG';
			// 	} else {
			// 		// companies[id].type = 'Monthly';
			// 		if (companies[id]?.plan?.subscription_end_date < new Date()) {
			// 			companies[id].plan.isExpired = true;
			// 			await companies[id].save();
			// 		} else {
			// 			companies[id].plan.isExpired = false;
			// 			await companies[id].save();
			// 		}
			// 	}
			// });
			// tempCompanies.forEach((comp, id) => {
			// 	tempCompanies[id].type = 'PYG';
			// 	companies.push(
			// 		Object.assign(tempCompanies[id], {
			// 			plan: {
			// 				subscription_type: 'No Subscription',
			// 				credits: 0,
			// 				subscription_amount: 0,
			// 				subscription_end_date: new Date(
			// 					new Date().setMinutes(new Date().getMinutes() + 30)
			// 				),
			// 				subscription_amount_status: false,
			// 				cost_per_credit: 0,
			// 				isExpired: false,
			// 				max_members: 0,
			// 				createdAt: new Date(),
			// 				updatedAt: new Date(),
			// 				blocked: false,
			// 			},
			// 		})
			// 	);
			// });

			return res.status(200).json(companies);
		} catch (error) {
			return res.status(400).json(error.message);
		}
	}
);

router.get(
	'/basedOnType',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const companies = await Companies.find()
				.sort({ createdAt: -1 })
				.skip((req.query.page - 1) * req.query.limits)
				.limit(req.query.limits)
				.populate('plan');
			if (!companies) return res.status(400).json('No Company found!');

			let freeCompanies = [];
			let premiumCompanies = [];

			for (let i = 0; i < companies.length; i++) {
				if (
					companies[i].plan == null ||
					companies[i].plan.subscription_type === 'Free Trial'
				) {
					freeCompanies.push(companies[i]);
				} else {
					premiumCompanies.push(companies[i]);
				}
			}

			if (req.query.type === 'free') {
				return res.json({
					count: freeCompanies.length,
					companies: freeCompanies,
				});
			} else {
				return res.json({
					count: premiumCompanies.length,
					companies: premiumCompanies,
				});
			}
		} catch (error) {
			res.status(400).json('There was some error!' + error);
		}
	}
);

router.get(
	'/companyInfo',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.query.company_id).populate(
				'plan'
			);
			if (!company) return res.status(400).json('No Company found!');

			return res.json({
				name: company.name,
				company_name: company.company_name,
				email: company.email,
				mobile: company.mobile,
				login_ip: company.login_ip,
				location: company.location,
				browserType: company.browserType,
				availCredits: company.credits,
				totalCredits: company.totalCredits,
				planType: company.planType,
				plan: company?.plan,
				AssMem: company?.members?.length + 1 + company?.invites?.length,
				UnassMem:
					company?.plan?.max_members -
					(company?.members?.length + 1 + company?.invites?.length),
				is_internal_user:
					company?.is_internal_user === null ? false : company.is_internal_user,
				upload_limit:
					company?.upload_limit === null ? 5000 : company.upload_limit,
				is_file_enhancer_user:
					company?.is_file_enhancer_user === null
						? false
						: company.is_file_enhancer_user,
			});
		} catch (error) {
			console.log(error);
			res.status(400).json(error);
		}
	}
);

router.post(
	'/editdetails',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		// const { error } = editProfileValidation.validate(req.body);
		// if (error) return res.status(400).json(error.details[0].message);

		try {
			const company = await Companies.findById(req.query.company_id);
			if (!company) return res.status(400).json('No Company found!');

			company.name = req.body.name;

			if (req.body?.company_name?.length > 0)
				company.company_name = req.body.company_name;

			// if (company.mobile != req.body.mobile) {
			//   const checkNum = await Companies.findOne({ mobile: req.body.mobile });
			//   if (checkNum) return res.status(400).json("Company with this mobile already exists!");
			// }

			company.mobile = req.body.mobile;

			if (req.body.password) {
				const salt = await bcrypt.genSalt(10);
				const hashPassword = await bcrypt.hash(req.body.password, salt);

				company.password = hashPassword;
			}

			company.is_internal_user =
				req.body.is_internal_user === true ? true : false;

			company.upload_limit = req.body.upload_limit
				? req.body.upload_limit
				: 5000;

			company.is_file_enhancer_user =
				req.body.is_file_enhancer_user === true ? true : false;

			await company.save();

			return res.json('Details updated!');
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.post(
	'/create',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		//const { error } = addCompanyValidation.validate(req.body);
		//if (error) return res.status(400).json(error.details[0].message);

		try {
			// if (req.body.type === '' || req.body.type == null) {
			// 	return res.status(400).json('Type is required!');
			// }
			// if (
			// 	req.body.type !== 'FREE' &&
			// 	req.body.type !== 'PREMIUM' &&
			// 	req.body.type !== 'INDIVIDUAL'
			// ) {
			// 	return res.status(400).json('Wrong type!');
			// }
			if (!req.body.username) {
				return res.status(400).json('Username is required!');
			}
			const username = req.body.username.toLowerCase();
			const email = req.body.email.toLowerCase();
			// if (req.body.company_name.length > 0) {
			// 	const company1 = await Companies.findOne({
			// 		company_name: req.body.company_name,
			// 	});
			// 	if (company1)
			// 		return res.status(400).json('Company with this name already exists!');

			// 	const company3 = await TempCompanies.findOne({
			// 		company_name: req.body.company_name,
			// 	});
			// 	if (company3)
			// 		return res.status(400).json('Company with this name already exists!');
			// }

			const company2 = await Companies.findOne({ username: username });
			if (company2)
				return res
					.status(400)
					.json('Compaign Owner with this username already exists!');

			const company4 = await TempCompanies.findOne({ email: email });
			if (company4)
				return res.status(400).json('Company with this email already exists!');

			//if (req.body.mobile.length > 0) {
			// const company5 = await Companies.findOne({ mobile: req.body.mobile });
			// if (company5) return res.status(400).json("Company with this mobile already exists!");
			// const company6 = await TempCompanies.findOne({ mobile: req.body.mobile });
			// if (company6) return res.status(400).json("Company with this mobile already exists!");
			//}

			const company7 = await Admins.findOne({ email: email });
			if (company7) return res.status(400).json('Email already exists!');

			const company8 = await Members.findOne({ email: email });
			if (company8) return res.status(400).json('Email already exists!');

			const company9 = await Members.findOne({ username: username });
			if (company9) return res.status(400).json('Username already exists!');

			const salt = await bcrypt.genSalt(10);
			const hashPassword = await bcrypt.hash(req.body.password, salt);

			// let date = new Date();
			// date.setDate(date.getDate() + 7);

			// date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

			// const newPlan = new Plans({
			// 	subscription_end_date: date,
			// });

			// const genPlan = await newPlan.save();

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

			const addCompany = new Companies({
				name: req.body.name,
				email: email,
				// mobile: req.body.mobile,
				username: username,
				// company_name: req.body.company_name,
				// plan: genPlan,
				password: hashPassword,
				isEmailVerified: true,
				clientCode: code,
			});

			const genCompany = await addCompany.save();

			// if (req.body.type === 'PREMIUM') {
			// 	await genPlan.remove();
			// 	if (
			// 		req.body.subscription_id === '' ||
			// 		req.body.subscription_id == null
			// 	) {
			// 		await genCompany.remove();
			// 		return res.status(400).json('Subscription Id is required!');
			// 	}
			// 	if (req.body.subscription_id.length < 6) {
			// 		await genCompany.remove();
			// 		return res
			// 			.status(400)
			// 			.json('Subscription Id should be at least 6 characters!');
			// 	}

			// 	const subscription_id = req.body.subscription_id;

			// 	const subscription = await Subscriptions.findById(subscription_id);
			// 	if (!subscription) {
			// 		await genCompany.remove();
			// 		return res.status(400).json('Subscription not found!');
			// 	}

			// 	var validity = 30;
			// 	var credits = subscription.monthly_credits;
			// 	var amount = subscription.monthly_amount;
			// 	let date = new Date();
			// 	date.setMonth(date.getMonth() + 1);
			// 	if (req.body.isAnnual === true) {
			// 		date.setMonth(date.getMonth() - 1);
			// 		date.setFullYear(date.getFullYear() + 1);
			// 		validity = 365;
			// 		credits = subscription.annually_credits;
			// 		amount = subscription.annually_amount;
			// 	}

			// 	date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

			// 	const createNewPlan = new Plans({
			// 		subscription_type: subscription.title,
			// 		isAnnual: req.body.isAnnual,
			// 		credits: credits,
			// 		subscription_amount: amount,
			// 		validity: validity,
			// 		subscription_end_date: date,
			// 		payment_mode: 'Unpaid',
			// 		subscription_amount_status: false,
			// 		stripe_cpc_price_id: subscription.stripe_cpc_price_id,
			// 		cost_per_credit: subscription.cost_per_credit,
			// 		stripe_cpu_price_id: subscription.stripe_cpu_price_id,
			// 		cost_per_user: subscription.cost_per_user,
			// 		max_members: subscription.no_of_user,
			// 	});

			// 	const new_plan = await createNewPlan.save();
			// 	genCompany.plan = new_plan;
			// 	await genCompany.save();

			// 	const createInvoice = new Invoices({
			// 		name: 'Subscription',
			// 		company: genCompany._id,
			// 		from: {
			// 			name: 'EmailAddress.ai',
			// 			address: '447 Broadway, 2nd floor, #713',
			// 			address2: 'NewYork, NY 10013, USA',
			// 			email: 'team@emailaddress.ai',
			// 		},
			// 		status: false,
			// 		item: {
			// 			subscription_type: subscription.title,
			// 			subscription_credits: credits,
			// 			subscription_description: subscription.desc,
			// 			subscription_validity: validity,
			// 			subscription_max_members: subscription.no_of_user,
			// 		},
			// 		amount: amount,
			// 	});

			// 	const invoice = await createInvoice.save();

			// 	genCompany.invoices.push(invoice._id);

			// 	await genCompany.save();

			// 	const activity = await CompanyActivityLogs.create({
			// 		company: genCompany._id,
			// 		heading: 'Unpaid Invoice',
			// 		message: `You have an Unpaid Invoice for ${subscription.title} Subscription !`,
			// 	});
			// }

			// const msg = {
			// 	to: genCompany.email,
			// 	from: 'team@emailaddress.ai',
			// 	subject: 'Your EmailAddress.ai account is ready',
			// 	html: `<p>Thank you for signing up with EmailAddress.ai.</p><br />
			// <p>To complete the setup, please verify your email by clicking on this
			// <a href="${process.env.BackendURL}/company/auth/activate?company_id=${genCompany._id}">Link.</a></p><br />
			// <p>In case, you are having trouble, you can also copy and paste this link in your browser:</p><br/>
			// <p>Look forward to having you onboard.</p><br />
			// <p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><p>EmailAddress.ai</p>`,
			// };

			// sgMail
			// 	.send(msg)
			// 	.then(() => res.json('Account Creation Mail Sent!'))
			// 	.catch((err) => res.status(400).json('Error: ' + err));
			// transport.sendMail(msg, (err, info) => {
			// 	if (err) {
			// 		res.status(400).json('Error: ' + err);
			// 	} else {
			// 		res.json('Account Creation Mail Sent!');
			// 	}
			// });

			return res.json('Account Created!');
		} catch (error) {
			res.status(400).json('There was some error!' + error);
		}
	}
);

router.post(
	'/markAsPaid',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			if (req.body.invoice_id === '' || req.body.invoice_id == null)
				return res.status(400).json('Invoice Id is required!');
			if (req.body.invoice_id.length < 6)
				return res
					.status(400)
					.json('Invoice Id should be at least 6 characters!');

			if (req.body.company_id === '' || req.body.company_id == null)
				return res.status(400).json('Company Id is required!');
			if (req.body.company_id.length < 6)
				return res
					.status(400)
					.json('Company Id should be at least 6 characters!');

			const company = await Companies.findById(req.body.company_id);
			if (!company) return res.status(400).json('Company not found!');

			const invoice = await Invoices.findOne({
				_id: req.body.invoice_id,
				company: company._id,
			});
			if (!invoice) return res.status(400).json('Invoice not found!');

			if (invoice.status == true)
				return res.status(400).json('Invoice already paid');

			if (invoice.item.subscription_type === 'Assign Credits') {
				invoice.status = true;
				if (req.body.offlinePayment) {
					const createNewPlan = new CompanyTransaction({
						company_id: company._id,
						subscription_type: invoice.item.subscription_type,
						subscription_amount: req.body.amount,
						subscription_amount_status: true,
						payment_mode: 'External',
						date: req.body.date,
						txnId: req.body.txnId,
					});
					const genPlan = await createNewPlan.save();
					invoice.item.paymentMode = 'External';
					// company.previous_plans.push(genPlan._id);
				}
			} else if (invoice.item.subscription_type === 'Add User') {
				invoice.status = true;
				if (req.body.offlinePayment) {
					const createNewPlan = new CompanyTransaction({
						company_id: company._id,
						subscription_type: invoice.item.subscription_type,
						subscription_amount: req.body.amount,
						subscription_amount_status: true,
						payment_mode: 'External',
						date: req.body.date,
						txnId: req.body.txnId,
					});
					const genPlan = await createNewPlan.save();
					invoice.item.paymentMode = 'External';
					//company.previous_plans.push(genPlan._id);
				}
			} else if (invoice.item.subscription_type === 'PAY-AS-YOU-GO') {
				invoice.status = true;
				if (req.body.offlinePayment) {
					const createNewPlan = new CompanyTransaction({
						company_id: company._id,
						subscription_type: invoice.item.subscription_type,
						subscription_amount: req.body.amount,
						subscription_amount_status: true,
						payment_mode: 'External',
						date: req.body.date,
						txnId: req.body.txnId,
					});
					const genPlan = await createNewPlan.save();
					invoice.item.paymentMode = 'External';
					//company.previous_plans.push(genPlan._id);
				}
			} else {
				invoice.status = true;
				if (req.body.offlinePayment) {
					const createNewPlan = new CompanyTransaction({
						company_id: company._id,
						subscription_type: invoice.item.subscription_type,
						subscription_amount: req.body.amount,
						subscription_amount_status: true,
						payment_mode: 'External',
						date: req.body.date,
						txnId: req.body.txnId,
					});
					const genPlan = await createNewPlan.save();
					invoice.item.paymentMode = 'External';
					//company.previous_plans.push(genPlan._id);
				}

				const plan = await Plans.findById(company.plan);
				plan.isExpired = false;
				await plan.save();

				await company.save();
			}

			await invoice.save();

			const addCompanyActivityLog = new CompanyActivityLogs({
				company: company._id,
				heading: 'Subscription',
				message:
					'Bought ' +
					invoice.item.subscription_type +
					' subscription/extra features externally.',
			});

			await addCompanyActivityLog.save();

			return res.json('Invoice marked as paid!');
		} catch (error) {
			res.status(400).json('There was some error!' + error);
		}
	}
);

router.get(
	'/credits',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.query.company_id);
			if (!company) return res.status(400).json('No Company found!');

			return res.json(company.credits);
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/transactions',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const transactions = await CompanyTransaction.find({
				company_id: req.query.company_id,
			}).sort({ createdAt: -1 });
			// const company = await Companies.findOne({
			// 	_id: mongoose.Types.ObjectId(req.query.company_id),
			// })
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
			console.log(error);
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/invoices',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.query.company_id)
				.populate({
					path: 'invoices',
					options: { sort: { createdAt: -1 } },
					populate: { path: 'item' },
				})
				.lean();
			if (!company) return res.status(400).json('Company not found!');
			let newInvoices = [];
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
			for (const rev of company.invoices) {
				if (rev.name === 'Assign Credits') {
					rev.name = `Bought ${rev.item.subscription_credits} Credits`;
					newInvoices.push(rev);
				}
				if (rev.name === 'EXTRA CREDIT') {
					rev.name = `Bought ${rev.item.subscription_credits} Credits`;
					newInvoices.push(rev);
				}
				if (rev.name === 'PAY-AS-YOU-GO') {
					rev.name = `Bought ${rev.item.subscription_credits} Credits`;
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

			return res.json(newInvoices);
		} catch (error) {}
	}
);

router.get(
	'/companyMembers',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.query.company_id)
				.populate('members')
				.populate('invites')
				.lean();
			if (!company) return res.status(400).json('No Company found!');

			const members_array = [];

			for (let i = 0; i < company.members.length; i++) {
				const object = {
					_id: company.members[i]._id,
					name: company.members[i].name,
					email: company.members[i].email,
					login_ip: company.members[i].login_ip,
					location: company.members[i].location,
					browserType: company.members[i].browserType,
					credits: company.members[i].credits,
					last_login: company.members[i].last_login,
					createdAt: company.members[i].createdAt,
					status: true,
					blocked: company.members[i].blocked,
					suspended: company.members[i].suspended,
				};

				members_array.push(object);
			}

			for (let i = 0; i < company.invites.length; i++) {
				const object = {
					_id: company.invites[i]._id,
					name: company.invites[i].name,
					email: company.invites[i].email,
					login_ip: null,
					location: null,
					browserType: null,
					credits: company.invites[i].credits,
					last_login: null,
					createdAt: company.invites[i].createdAt,
					status: false,
					blocked: company.invites[i].blocked,
					suspended: company.invites[i].suspended,
				};

				members_array.push(object);
			}

			return res.json(members_array);
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.post(
	'/invite',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		const { error } = inviteValidation.validate(req.body);
		if (error) return res.status(400).json(error.details[0].message);

		try {
			const email = req.body.email.toLowerCase();
			const company = await Companies.findById(req.query.company_id).populate(
				'plan'
			);
			if (!company) return res.status(400).json('Company not found!');

			if (company.plan == null)
				return res
					.status(400)
					.json('Company currently has no subscription plan');

			const member = await Members.findOne({ email: email });
			if (member) return res.status(400).json('Member already exists');

			const invite = await Invites.findOne({ email: email });
			if (invite) return res.status(400).json('Invite already sent');

			if (company.email === email)
				return res.status(400).json('You cannot add your self as member!');

			const company7 = await Admins.findOne({ email: email });
			if (company7) return res.status(400).json('Email already exists!');

			const firstEmail = company.email.split('@');
			const secondEmail = email.split('@');

			if (firstEmail[1] !== secondEmail[1])
				return res.status(400).json("Member doesn't belong to your company!");

			if (company.credits < req.body.credits)
				return res.status(400).json('Not enough credits');

			if (
				company.members.length + company.invites.length + 1 >=
				company.plan.max_members
			) {
				return res
					.status(200)
					.json('Subscription does not allow more members to add.');
			}
			const createInvoice = new Invoices({
				name: 'Add User',
				company: req.query.company_id,
				from: {
					name: 'EmailAddress.ai',
					address: '447 Broadway, 2nd floor, #713',
					address2: 'NewYork, NY 10013, USA',
					email: 'team@emailaddress.ai',
				},
				status: false,
				item: {
					subscription_type: 'Add User',
					subscription_description: 'temp desc',
					subscription_validity: 0,
					endDate: null,
					billingType: 'One Time',
				},
				amount: company.plan.cost_per_user,
			});

			const invoice = await createInvoice.save();
			company.invoices.push(invoice._id);
			await company.save();

			const activity = await CompanyActivityLogs.create({
				company: company._id,
				heading: 'Unpaid Invoice',
				message: `You have an Unpaid Invoice for adding a new user !`,
			});

			const addInvite = new Invites({
				name: req.body.name,
				email: email,
				company_name: company.company_name,
				credits: req.body.credits,
			});

			const newInvite = await addInvite.save();

			company.invites.push(newInvite._id);

			await company.save();

			const addCompanyActivityLog = new CompanyActivityLogs({
				company: company._id,
				heading: 'Add Member',
				message: 'Invited ' + req.body.name + ' to join your company.',
			});

			await addCompanyActivityLog.save();
			const msg = {
				to: company.email,
				from: 'team@emailaddress.ai',
				subject: `You’ve just invited a team member to EmailAddress.ai`,
				html: `<p>Your team member has been invited to access your EmailAddress.ai account.</p><br />
			<p>If you have not requested one, please contact support via Live chat or send an email to team@emailaddress.ai </p><br/>
			<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
			};
			const msg2 = {
				to: newInvite.email,
				from: 'team@emailaddress.ai',
				subject: `You’ve were invited to EmailAddress.ai`,
				html: `<p>You have been invited by your colleague to access EmailAddress.ai.</p><br />
			<p>Click here to Join ${newInvite.company_name} on EmailAddress.ai platform, <a href=${process.env.FrontendURL}/teamSignup?invite_id=${newInvite._id}">Click Here</a></p><br />
			<p>If you have received this email in error, please contact support via Live chat or send an email to team@emailaddress.ai</p><br/>
			<p>Thanks,</p><p>Team at EmailAddress.ai</p><br /><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
			};

			// sgMail
			// 	.send(msg)
			// 	.then(() => console.log('Invitation Sent!'))
			// 	.catch((err) => console.log(err));

			// sgMail
			// 	.send(msg2)
			// 	.then(() => res.json('Invitation Sent!'))
			// 	.catch((err) => res.status(400).json('Error: ' + err));
			transport.sendMail(msg, (err, info) => {
				if (err) {
					console.log(err);
				} else {
					console.log('Invitation Sent!');
				}
			});
			transport.sendMail(msg2, (err, info) => {
				if (err) {
					res.status(400).json('Error: ' + err);
				} else {
					res.json('Invitation Sent!');
				}
			});
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/showInvites',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.query.company_id).populate(
				'invites'
			);
			if (!company) return res.status(400).json('Company not found!');

			return res.json(company.invites);
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/companyActivityLog',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			var today = new Date();
			var fromDate = today.setDate(today.getDate() - 3);
			var query = { createdAt: { $gte: fromDate } };

			if (req.query.date) {
				var fromDate = new Date(req.query.date);
				var toDate = new Date(req.query.date);
				toDate.setDate(toDate.getDate() + 3);
				query = { createdAt: { $gte: fromDate, $lte: toDate } };
			}

			query['company'] = req.query.company_id;
			const getLogs = await CompanyActivityLogs.find(query)
				.sort({ createdAt: 1 })
				.populate('company');

			// const totalCount = await CompanyActivityLogs.countDocuments({
			// 	company: req.query.company_id,
			// });

			let logs = [];

			for (let i = 0; i < getLogs.length; i++) {
				const log = {
					heading: getLogs[i].heading,
					person: getLogs[i].company.company_name,
					message: getLogs[i].message,
					query: getLogs[i].query,
					createdAt: getLogs[i].createdAt,
				};
				logs.push(log);
			}

			return res.json({ count: 0, logs: logs });
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/memberActivityLogs',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			var today = new Date();
			var fromDate = today.setDate(today.getDate() - 3);
			var query = { createdAt: { $gte: fromDate } };

			if (req.query.date) {
				var fromDate = new Date(req.query.date);
				var toDate = new Date(req.query.date);
				toDate.setDate(toDate.getDate() + 3);
				query = { createdAt: { $gte: fromDate, $lte: toDate } };
			}

			query['member'] = req.query.member_id;

			const getLogs = await MemberActivityLogs.find(query)
				.sort({ createdAt: 1 })
				.populate('member');

			let logs = [];

			for (let i = 0; i < getLogs.length; i++) {
				let log;
				if (getLogs[i].company != null) {
					log = {
						heading: getLogs[i].heading,
						company: getLogs[i].company.company_name,
						message: getLogs[i].message,
						query: getLogs[i].query,
						createdAt: getLogs[i].createdAt,
					};
				} else {
					log = {
						heading: getLogs[i].heading,
						member: getLogs[i].member.name,
						message: getLogs[i].message,
						query: getLogs[i].query,
						createdAt: getLogs[i].createdAt,
					};
				}
				logs.push(log);
			}

			return res.json({ count: 0, logs: logs });
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/companyCreditRequests',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const company = await Companies.findById(req.query.company_id).populate({
				path: 'credit_requests',
				populate: { path: 'member', select: 'name' },
			});
			if (!company) return res.status(404).json('Company not found!');

			return res.json(company.credit_requests);
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/companyCreditHistory',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			var page = req.query.page || 1;
			var limit = req.query.limit || 10;
			const count = await CreditUsage.countDocuments({
				company: req.query.company_id,
				type: 'debit',
			});
			const data = await CreditUsage.find({
				company: req.query.company_id,
				type: 'debit',
			})
				.sort({ updatedAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit);

			return res.json({ data, total: count });
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/memberCreditRequests',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const member = await Members.findById(req.query.member_id).populate(
				'credit_requests'
			);
			if (!member) return res.status(404).json('Member not found!');

			return res.json(member.credit_requests);
		} catch (error) {
			res.status(400).json('There was some error!' + error);
		}
	}
);

router.get('/blockunblock', async (req, res) => {
	try {
		if (req.query.company_id == null)
			return res.status(400).json('Company Id is required!');

		const company = await Companies.findById(req.query.company_id);
		if (!company) return res.status(400).json('Company not found!');

		const firstEmail = company.email.split('@');
		if (company.blocked === false) {
			const blocked_list = await blocked_model.findOne({
				address: firstEmail[1],
			});
			if (!blocked_list) {
				await blocked_model.create({ address: firstEmail[1] });
			}
			company.blocked = true;
		} else {
			company.blocked = false;
			await blocked_model.findOneAndDelete({
				address: firstEmail[1],
			});
		}

		await company.save();

		if (company.blocked) {
			const msg = {
				to: company.email,
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
			return res.json('Company blocked!');
		} else {
			const msg = {
				to: company.email,
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
			return res.json('Company unblocked!');
		}
	} catch (error) {
		res.status(400).json('There was some error!');
	}
});

router.get('/suspendUnsuspend', async (req, res) => {
	try {
		if (req.query.company_id == null)
			return res.status(400).json('Company Id is required!');

		const company = await Companies.findById(req.query.company_id);
		if (!company) return res.status(400).json('Company not found!');

		company.suspended = !company.suspended;

		await company.save();

		if (company.suspended) {
			const msg = {
				to: company.email,
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
			return res.json('Company suspended!');
		} else {
			const msg = {
				to: company.email,
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
			return res.json('Company unsuspended!');
		}
	} catch (error) {
		res.status(400).json('There was some error!');
	}
});

router.delete(
	'/',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			if (req.query.company_id == null)
				return res.status(400).json('Company Id is required!');

			const company = await Companies.findById(req.query.company_id);
			if (!company) return res.status(400).json('Company not found!');

			for (let i = 0; i < company.members.length; i++) {
				await Members.findByIdAndDelete(company.members[i]);
			}

			for (let i = 0; i < company.invites.length; i++) {
				await Invites.findByIdAndDelete(company.invites[i]);
			}

			await Plans.findByIdAndDelete(company.plan);

			for (let i = 0; i < company.previous_plans.length; i++) {
				await Plans.findByIdAndDelete(company.previous_plans[i]);
			}

			for (let i = 0; i < company.invoices.length; i++) {
				await Invoices.findByIdAndDelete(company.invoices[i]);
			}

			for (let i = 0; i < company.folders.length; i++) {
				await Folders.findByIdAndDelete(company.folders[i]);
			}

			for (let i = 0; i < company.credit_requests.length; i++) {
				await CreditRequests.findByIdAndDelete(company.credit_requests[i]);
			}

			for (let i = 0; i < company.downloads.length; i++) {
				await Downloads.findByIdAndDelete(company.downloads[i]);
			}

			for (let i = 0; i < company.search.length; i++) {
				await SaveSearch.findByIdAndDelete(company.search[i]);
			}

			for (let i = 0; i < company.exclusions.length; i++) {
				await Exclusions.findByIdAndDelete(company.exclusions[i]);
			}

			const logs = await CompanyActivityLogs.find({ company: company._id });

			for (let i = 0; i < logs.length; i++) {
				await logs[i].remove();
			}

			await company.remove();

			return res.json('Company deleted!');
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.delete(
	'/deleteInvite',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			if (req.query.company_id == null)
				return res.status(400).json('Company Id is required!');

			const company = await Companies.findById(req.query.company_id);
			if (!company) return res.status(400).json('Company not found!');

			const invite = await Invites.findOne({
				_id: req.query.invite_id,
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
				message: 'Deleted invite for ' + invite.name + ' by admin.',
			});

			await addCompanyActivityLog.save();

			// for (let i = 0; i < company.members.length; i++) {
			// 	await Members.findByIdAndDelete(company.members[i]);
			// }

			// for (let i = 0; i < company.invites.length; i++) {
			// 	await Invites.findByIdAndDelete(company.invites[i]);
			// }

			//await Plans.findByIdAndDelete(company.plan);

			// for (let i = 0; i < company.previous_plans.length; i++) {
			// 	await Plans.findByIdAndDelete(company.previous_plans[i]);
			// }

			// for (let i = 0; i < company.invoices.length; i++) {
			// 	await Invoices.findByIdAndDelete(company.invoices[i]);
			// }

			// for (let i = 0; i < company.folders.length; i++) {
			// 	await Folders.findByIdAndDelete(company.folders[i]);
			// }

			// for (let i = 0; i < company.credit_requests.length; i++) {
			// 	await CreditRequests.findByIdAndDelete(company.credit_requests[i]);
			// }

			// for (let i = 0; i < company.downloads.length; i++) {
			// 	await Downloads.findByIdAndDelete(company.downloads[i]);
			// }

			// for (let i = 0; i < company.search.length; i++) {
			// 	await SaveSearch.findByIdAndDelete(company.search[i]);
			// }

			// for (let i = 0; i < company.exclusions.length; i++) {
			// 	await Exclusions.findByIdAndDelete(company.exclusions[i]);
			// }

			// const logs = await CompanyActivityLogs.find({ company: company._id });

			// for (let i = 0; i < logs.length; i++) {
			// 	await logs[i].remove();
			// }

			// await company.remove();

			return res.json('Member Invite deleted!');
		} catch (error) {
			res.status(400).json('There was some error!');
		}
	}
);

router.get(
	'/extendTrial',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			if (!req.query.company_id || !req.query.date) {
				return res.status(400).json('All fields are required.');
			}
			const company = await Companies.findById(req.query.company_id).populate(
				'plan'
			);
			if (!company) return res.status(400).json('Company not found!');

			if (company?.plan?.subscription_type !== 'Free Trial' && company?.plan) {
				return res.status(400).json('Company have a paid plan.');
			}
			if (new Date(req.query.date) <= new Date()) {
				return res.status(400).json('Select a date greater than today.');
			}
			let plan = await Plans.findById(company.plan._id);
			plan.subscription_end_date = new Date(req.query.date);
			plan.isExpired = false;
			await plan.save();

			return res.json('Extended Successfully');
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.patch(
	'/add_credits',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			if (!req.body.credit_count) {
				res.status(400).json('Please specify credit count ');
			}
			if (!req.body.company_id) {
				res.status(400).json('Please speacify company ID');
			}

			let company = await Companies.findById(req.body.company_id).populate(
				'plan'
			);
			if (!company) {
				res.status(404).json('No company found with this ID');
			}
			// var amt = 0;
			// if (company?.plan?.subscription_type === 'Free Trial') {
			// 	amt = 0;
			// } else {
			// 	const subscription = await Subscriptions.findOne({
			// 		title: company?.plan?.subscription_type,
			// 	});
			// 	if (!subscription) {
			// 		return res.status(400).json('Company does not active monthly plan.');
			// 	}
			// 	amt = subscription.cost_per_credit * req.body.credit_count;
			// }

			company.credits = company.credits + req.body.credit_count;
			company.totalCredits = company.totalCredits + req.body.credit_count;

			// const createInvoice = new Invoices({
			// 	name: 'Assign Credits',
			// 	company: req.body.company_id,
			// 	from: {
			// 		name: 'EmailAddress.ai',
			// 		address: '447 Broadway, 2nd floor, #713',
			// 		address2: 'NewYork, NY 10013, USA',
			// 		email: 'team@emailaddress.ai',
			// 	},
			// 	status: false,
			// 	item: {
			// 		subscription_type: 'Assign Credits',
			// 		subscription_credits: req.body.credit_count,
			// 		subscription_description: 'temp desc',
			// 		subscription_validity: 0,
			// 		subscription_max_members: 0,
			// 		endDate: null,
			// 		billingType: 'One Time',
			// 	},
			// 	amount: amt,
			// });

			// const invoice = await createInvoice.save();
			// company.invoices.push(invoice._id);
			await company.save();
			// const msg = {
			// 	to: company.email,
			// 	from: 'team@emailaddress.ai',
			// 	subject: `Additional credits purchase is complete`,
			// 	html: `<p>Thank you for purchasing additional credits.</p><br />
			// <p>Your Invoice would be available in your profile section and your credits would be added to your account shortly.</p><br />
			// <p>If you have any questions on billing or onboarding, contact us via Live Chat or email us at team@emailaddress.ai</p><br/>
			// <p>We truly appreciate your business.!</p><br />
			// <p>Thanks,</p><p>Teresa M</p><p>Customer Success</p><br /><p>EmailAddress.ai</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
			// };

			// sgMail
			// 	.send(msg)
			// 	.then(() => console.log('Welcome Mail Sent!'))
			// 	.catch((err) => console.log('Error: ' + err));
			// transport.sendMail(msg, (err, info) => {
			// 	if (err) {
			// 		console.log('Error: ' + err);
			// 	} else {
			// 		console.log('Welcome Mail Sent!');
			// 	}
			// });

			// const activity = await CompanyActivityLogs.create({
			// 	company: company._id,
			// 	heading: 'Unpaid Invoice',
			// 	message: `You have an Unpaid Invoice for assigning ${req.body.credit_count} credits !`,
			// });
			res.status(200).json({
				message: `${req.body.credit_count} Credits has been credited to the ${company.name} company`,
				company,
			});
		} catch (err) {
			return res.status(400).json(err.message);
		}
	}
);

router.patch(
	'/add_users',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			if (!req.body.user_count) {
				res.status(400).json('Please specify user count ');
			}
			if (!req.body.company_id) {
				res.status(400).json('Please speacify company ID');
			}

			let company = await Companies.findById(req.body.company_id).populate(
				'plan'
			);
			if (!company) {
				return res.status(404).json('No company found with this ID');
			}
			if (!company.plan) {
				return res.status(404).json('Company have no plan');
			}
			if (company?.plan?.subscription_type === 'Free Trial') {
				return res.status(404).json('Company have free trail');
			}

			// company = await Companies.findByIdAndUpdate(
			// 	req.body.company_id,
			// 	{ credits: company.credits + req.body.credit_count },
			// 	{ new: true }
			// );
			company.plan.extra_members =
				company.plan.extra_members + req.body.user_count;

			if (company) {
				const createInvoice = new Invoices({
					name: 'Assign Users',
					company: req.body.company_id,
					from: {
						name: 'EmailAddress.ai',
						address: '447 Broadway, 2nd floor, #713',
						address2: 'NewYork, NY 10013, USA',
						email: 'team@emailaddress.ai',
					},
					status: false,
					item: {
						subscription_type: 'Assign Users',
						subscription_users: req.body.user_count,
						subscription_description: 'temp desc',
						subscription_validity: 0,
					},
					amount: 0,
				});

				const invoice = await createInvoice.save();
				company.invoices.push(invoice._id);
				await company.save();
				const activity = await CompanyActivityLogs.create({
					company: company._id,
					heading: 'Unpaid Invoice',
					message: `You have an Unpaid Invoice for assigning ${req.body.user_count} users !`,
				});
				res.status(200).json({
					message: `${req.body.user_count} Users has been credited to the ${company.name} company`,
					company,
				});
			}
		} catch (err) {
			return res.status(400).json(err.message);
		}
	}
);

router.patch('/verify_email', [verifyToken, accessAdmin], async (req, res) => {
	try {
		if (req.query.company_id == null)
			return res.status(400).json('Company Id is required!');

		const company = await Companies.findById(req.query.company_id);
		if (company) {
			return res.status(200).json('Email already verified !');
		}

		const temp_company = await TempCompanies.findById(req.query.company_id);
		if (!temp_company)
			return res
				.status(400)
				.json('Registration request not found! Please register again');

		let date = new Date();
		date.setDate(date.getDate() + 6);

		date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		const newPlan = new Plans({
			subscription_end_date: date,
		});

		const genPlan = await newPlan.save();

		const addCompany = new Companies({
			name: temp_company.name,
			email: temp_company.email,
			mobile: temp_company.mobile,
			company_name: temp_company.company_name,
			plan: genPlan,
			password: temp_company.password,
			isEmailVerified: true,
		});

		await temp_company.remove();

		await addCompany.save();

		res.status(200).json('Email verified successfully !');
	} catch (err) {
		res.status(400).json(err);
	}
});

const delSubscription = async (id) => {
	try {
		await stripe.subscriptions.cancel(id);
		return true;
	} catch (err) {
		return false;
	}
};

router.patch(
	'/change_subscription',
	[verifyToken, accessAdmin],
	async (req, res) => {
		try {
			const company = await Companies.findOne({
				_id: req.query.company_id,
			}).populate('plan');
			if (!company) {
				return res.status(400).json('No company with this id exist!');
			}
			if (company.blocked) {
				return res.status(400).json('Company is blocked!');
			}
			if (company.suspended) {
				return res.status(400).json('Company is suspended!');
			}

			if (req.body.subscription_id === '' || req.body.subscription_id == null)
				return res.status(400).json('Subscription Id is required!');
			if (req.body.subscription_id.length < 6)
				return res
					.status(400)
					.json('Subscription Id should be at least 6 characters!');

			const subscription_id = req.body.subscription_id;
			if (!subscription_id) {
				return res.status(400).json('No Subscription Specified!');
			}

			const subscription = await Subscriptions.findById(subscription_id);
			if (!subscription) {
				return res.status(400).json('Subscription not found!');
			}

			if (
				company.members.length + company.invites.length >
				subscription.no_of_user
			)
				return res.status(400).json('Please select a higher plan');

			if (company?.plan?.subscription_type !== 'Free Trial') {
				company.previous_plans.push(company?.plan?._id);
			}

			var validity_days = 30;
			let date = new Date();
			date.setMonth(date.getMonth() + 1);
			var credits = subscription.monthly_credits;
			var amount = subscription.monthly_amount;
			var billingType = 'Monthly';
			if (req.body.isAnnual) {
				validity_days = 365;
				date.setMonth(date.getMonth() - 1);
				date.setFullYear(date.getFullYear() + 1);
				amount = subscription.annually_amount;
				credits = subscription.annually_credits;
				billingType = 'Annually';
			}

			if (company?.plan?.stripe_subscription_id) {
				await delSubscription(company?.plan?.stripe_subscription_id);
			}

			date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

			const createNewPlan = new Plans({
				subscription_type: subscription.title,
				isAnnual: req.body.isAnnual,
				credits: credits,
				subscription_amount: amount,
				validity: validity_days,
				subscription_end_date: date,
				payment_mode: 'Unpaid',
				subscription_amount_status: false,
				stripe_cpc_price_id: subscription.stripe_cpc_price_id,
				cost_per_credit: subscription.cost_per_credit,
				stripe_cpu_price_id: subscription.stripe_cpu_price_id,
				cost_per_user: subscription.cost_per_user,
				max_members: subscription.no_of_user,
			});

			const new_plan = await createNewPlan.save();

			company.planType = 'Monthly';
			company.plan = new_plan;
			company.credits += new_plan.credits;
			company.totalCredits += new_plan.credits;
			company.isCancelled = false;

			const createInvoice = new Invoices({
				name: 'Subscription',
				company: company._id,
				from: {
					name: 'EmailAddress.ai',
					address: '447 Broadway, 2nd floor, #713',
					address2: 'NewYork, NY 10013, USA',
					email: 'team@emailaddress.ai',
				},
				status: false,
				item: {
					subscription_type: subscription.title,
					subscription_credits: credits,
					subscription_description: subscription.desc,
					subscription_validity: validity_days,
					subscription_max_members: subscription.no_of_user,
					endDate: date,
					billingType: billingType,
				},
				amount: amount,
			});
			const msg = {
				to: company.email,
				from: 'team@emailaddress.ai',
				subject: `Your Purchase is complete`,
				html: `<p>Thank you for purchasing a paid plan on EmailAddress.ai.</p><br />
			<p>Your Invoice would be available in your profile section and your plan will be activated shortly.</p><br />
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
					console.log('Welcome Mail Sent!');
				}
			});

			const activity = await CompanyActivityLogs.create({
				company: company._id,
				heading: 'Unpaid Invoice',
				message: `You have an Unpaid Invoice for ${subscription.title} Subscription !`,
			});

			const invoice = await createInvoice.save();

			company.invoices.push(invoice._id);

			await company.save();

			res.status(200).json('Plan added to the Company Successfully !');
		} catch (err) {
			res.status(400).json('Error : ' + err);
		}
	}
);

router.patch(
	'/change_product',
	[verifyToken, accessAdmin],
	async (req, res) => {
		try {
			const company = await Companies.findOne({
				_id: req.query.company_id,
			}).populate('plan');
			if (!company) {
				return res.status(400).json('No company with this id exist!');
			}
			if (company.blocked) {
				return res.status(400).json('Company is blocked!');
			}
			if (company.suspended) {
				return res.status(400).json('Company is suspended!');
			}

			if (req.body.subscription_id === '' || req.body.subscription_id == null)
				return res.status(400).json('Subscription Id is required!');
			if (req.body.subscription_id.length < 6)
				return res
					.status(400)
					.json('Subscription Id should be at least 6 characters!');

			const subscription_id = req.body.subscription_id;
			if (!subscription_id) {
				return res.status(400).json('No Subscription Specified!');
			}

			const subscription = await Product.findById(subscription_id);
			if (!subscription) {
				return res.status(400).json('Product not found!');
			}

			if (company?.plan?.subscription_type !== 'Free Trial') {
				company.previous_plans.push(company?.plan?._id);
			}

			// var validity_days = 30;
			// let date = new Date();
			// date.setMonth(date.getMonth() + 1);
			var credits = subscription.monthly_credits;
			var amount = subscription.monthly_amount;
			//var billingType = 'Monthly';
			// if (req.body.isAnnual) {
			// 	validity_days = 365;
			// 	date.setMonth(date.getMonth() - 1);
			// 	date.setFullYear(date.getFullYear() + 1);
			// 	amount = subscription.annually_amount;
			// 	credits = subscription.annually_credits;
			// 	billingType = 'Annually';
			// }

			if (company?.plan?.stripe_subscription_id) {
				await delSubscription(company?.plan?.stripe_subscription_id);
			}

			//date = new Date(date.getFullYear(), date.getMonth(), date.getDate());

			// const createNewPlan = new Plans({
			// 	subscription_type: subscription.title,
			// 	isAnnual: req.body.isAnnual,
			// 	credits: credits,
			// 	subscription_amount: amount,
			// 	validity: validity_days,
			// 	subscription_end_date: date,
			// 	payment_mode: 'Unpaid',
			// 	subscription_amount_status: false,
			// 	stripe_cpc_price_id: subscription.stripe_cpc_price_id,
			// 	cost_per_credit: subscription.cost_per_credit,
			// 	stripe_cpu_price_id: subscription.stripe_cpu_price_id,
			// 	cost_per_user: subscription.cost_per_user,
			// 	max_members: subscription.no_of_user,
			// });

			//const new_plan = await createNewPlan.save();
			// console.log(new_plan);
			company.planType = 'PYG';
			company.credits += credits;
			company.totalCredits += credits;
			company.isCancelled = false;

			const createInvoice = new Invoices({
				name: 'PAY-AS-YOU-GO',
				company: company._id,
				from: {
					name: 'EmailAddress.ai',
					address: '447 Broadway, 2nd floor, #713',
					address2: 'NewYork, NY 10013, USA',
					email: 'team@emailaddress.ai',
				},
				status: false,
				item: {
					subscription_type: 'PAY-AS-YOU-GO',
					subscription_title: subscription.title,
					subscription_credits: credits,
					subscription_description: subscription.desc,
					// subscription_validity: validity_days,
					//subscription_max_members: subscription.no_of_user,
					//endDate: date,
					//billingType: billingType,
				},
				amount: amount,
			});
			const msg = {
				to: company.email,
				from: 'team@emailaddress.ai',
				subject: `Your Purchase is complete`,
				html: `<p>Thank you for purchasing a paid plan on EmailAddress.ai.</p><br />
			<p>Your Invoice would be available in your profile section and your plan will be activated shortly.</p><br />
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
					console.log('Welcome Mail Sent!');
				}
			});

			const activity = await CompanyActivityLogs.create({
				company: company._id,
				heading: 'Unpaid Invoice',
				message: `You have an Unpaid Invoice for ${subscription.title} PAY-AS-YOU-GO !`,
			});

			const invoice = await createInvoice.save();

			company.invoices.push(invoice._id);

			await company.save();

			res.status(200).json('Plan added to the Company Successfully !');
		} catch (err) {
			res.status(400).json('Error : ' + err);
		}
	}
);

module.exports = router;
