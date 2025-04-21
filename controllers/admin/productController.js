/** @format */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const Product = require('../../models/admin/product_model');
const ActivityLog = require('../../models/admin/activity_log_model');

const subscriptionValidation = require('../../validations/admin/subscription_validation');
const Companies = require('../../models/company/company_model');
const { default: mongoose } = require('mongoose');

const createProduct = async (req, res) => {
	// const { error } = subscriptionValidation.validate(req.body);
	// if (error) return res.status(400).json(error.details[0].message);
	try {
		if (
			(req.body.type === 'INDIVIDUAL' && !req.body.company_id) ||
			(req.body.company_id && !req.body.type === 'INDIVIDUAL')
		) {
			return res
				.status(400)
				.json(
					'Only Individual Product must specify the company ID to which the subscription will be available.'
				);
		}

		let subscription, company;

		if (req.body.type === 'COMMON') {
			subscription = await Product.findOne({ title: req.body.title });
			if (subscription)
				return res.status(400).json('SUBSCRIPTION ALREADY EXISTS!');
		} else {
			company = await Companies.findById(req.body.company_id);
			if (!company) {
				return res.status(400).json('No Compnay exists with this ID');
			}
			subscription = await Product.findOne({
				type: 'INDIVIDUAL',
				title: req.body.title,
				avail_company: req.body.company_id,
			});
			if (subscription)
				return res.status(400).json('SUBSCRIPTION ALREADY EXISTS!');
		}

		const product = await stripe.products.create({
			name: req.body.title,
			description: req.body.desc,
		});

		const price = await stripe.prices.create({
			unit_amount: req.body.monthly_amount * 100,
			currency: 'usd',
			product: product.id,
		});

		// const annualprice = await stripe.prices.create({
		// 	unit_amount: req.body.annually_amount * 100,
		// 	currency: 'usd',
		// 	product: product.id,
		// 	recurring: {
		// 		interval: 'year',
		// 	},
		// });

		// const cpc_product = await stripe.products.create({
		// 	name: 'Extra Credit',
		// 	description: `Extra Credits under ${req.body.title}`,
		// });

		// const cpc_price = await stripe.prices.create({
		// 	unit_amount: Math.round(req.body.cost_per_credit * 100),
		// 	currency: 'usd',
		// 	product: cpc_product.id,
		// });

		// const cpu_product = await stripe.products.create({
		// 	name: 'Extra User',
		// 	description: `Extra Users under ${req.body.title}`,
		// });

		// const cpu_price = await stripe.prices.create({
		// 	unit_amount: Math.round(req.body.cost_per_user * 100),
		// 	currency: 'usd',
		// 	product: cpu_product.id,
		// });

		const newSubscription = await Product.create({
			title: req.body.title,
			desc: req.body.desc,
			features: req.body.features,
			monthly_amount: req.body.monthly_amount,
			//annually_amount: req.body.annually_amount,
			stripe_product_id: product.id,
			stripe_month_price_id: price.id,
			//stripe_annual_price_id: annualprice.id,
			type: req.body.type,
			avail_company:
				req.body.type === 'INDIVIDUAL' ? req.body.company_id : undefined,
			// stripe_cpc_product_id: cpc_product.id,
			// stripe_cpc_price_id: cpc_price.id,
			// stripe_cpu_product_id: cpu_product.id,
			// stripe_cpu_price_id: cpu_price.id,
			//cost_per_credit: req.body.cost_per_credit,
			//cost_per_user: req.body.cost_per_user,
			credits: req.body.monthly_credits,
			monthly_credits: req.body.monthly_credits,
			//annually_credits: req.body.annually_credits,
			//no_of_user: req.body.no_of_user,
		});

		if (newSubscription) {
			const addActivityLog = new ActivityLog({
				person: req.user.id,
				role: req.user.role,
				heading: `${req.body.type} Product Added ${
					req.body.type === 'COMMON' ? '' : company.company_name
				}`,
				message: 'Added a new product: ' + newSubscription.title + '.',
			});

			await addActivityLog.save();

			return res.status(200).json({
				data: newSubscription,
				message: 'PRODUCT CREATED SUCCESSFULLY',
			});
		}
		return res.status(500).json({
			message: 'INTERNAL SERVER ERROR!',
		});
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const updateProduct = async (req, res) => {
	// const { error } = subscriptionValidation.validate(req.body);
	// if (error) return res.status(400).json(error.details[0].message);
	try {
		const subscription = await Product.findById(req.params.id);
		if (!subscription) return res.status(400).json('Product not found!');

		const product = await stripe.products.update(
			subscription.stripe_product_id,
			{
				name: req.body.title,
				description: req.body.desc,
			}
		);

		const price = await stripe.prices.create({
			unit_amount: req.body.monthly_amount * 100,
			currency: 'usd',
			product: product.id,
		});
		// const annualprice = await stripe.prices.create({
		// 	unit_amount: req.body.annually_amount * 100,
		// 	currency: 'usd',
		// 	product: product.id,
		// 	recurring: {
		// 		interval: 'year',
		// 	},
		// });

		// const cpc_product = await stripe.products.update(
		// 	subscription.stripe_cpc_product_id,
		// 	{
		// 		name: 'Extra Credit',
		// 		description: `Extra Credits under ${req.body.title}`,
		// 	}
		// );

		// const cpc_price = await stripe.prices.create({
		// 	unit_amount: Math.round(req.body.cost_per_credit * 100),
		// 	currency: 'usd',
		// 	product: cpc_product.id,
		// });

		// const cpu_product = await stripe.products.update(
		// 	subscription.stripe_cpu_product_id,
		// 	{
		// 		name: 'Extra User',
		// 		description: `Extra Users under ${req.body.title}`,
		// 	}
		// );

		// const cpu_price = await stripe.prices.create({
		// 	unit_amount: Math.round(req.body.cost_per_user * 100),
		// 	currency: 'usd',
		// 	product: cpu_product.id,
		// });

		// const previousprice = await stripe.prices.update(
		// 	subscription.stripe_month_price_id,
		// 	{
		// 		active: false,
		// 	}
		// );

		// const previous_cpc_price = await stripe.prices.update(subscription.stripe_cpc_price_id, {
		//     active: false,
		// })

		subscription.title = req.body.title;
		subscription.desc = req.body.desc;
		subscription.features = req.body.features;
		subscription.monthly_amount = req.body.monthly_amount;
		//subscription.annually_amount = req.body.annually_amount;
		subscription.stripe_product_id = product.id;
		subscription.stripe_month_price_id = price.id;
		//subscription.stripe_annual_price_id = annualprice.id;
		subscription.type = req.body.type;
		subscription.avail_company =
			req.body.type === 'INDIVIDUAL' ? req.body.company_id : undefined;
		// subscription.stripe_cpc_product_id = cpc_product.id;
		// subscription.stripe_cpc_price_id = cpc_price.id;
		// subscription.stripe_cpu_product_id = cpu_product.id;
		// subscription.stripe_cpu_price_id = cpu_price.id;
		// subscription.cost_per_credit = req.body.cost_per_credit;
		// subscription.cost_per_user = req.body.cost_per_user;
		subscription.monthly_credits = req.body.monthly_credits;
		subscription.credits = req.body.monthly_credits;
		//subscription.annually_credits = req.body.annually_credits;
		//subscription.no_of_user = req.body.no_of_user;
		subscription.homepage = req.body.homepage;

		const newSubscription = await subscription.save();

		const addActivityLog = new ActivityLog({
			person: req.user.id,
			role: req.user.role,
			heading: 'Product Updated',
			message: 'Updated a subscription: ' + newSubscription.title + '.',
		});

		await addActivityLog.save();

		return res.json({
			data: newSubscription,
			message: 'PRODUCT UPDATED SUCCESSFULLY',
		});
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const getProductById = async (req, res) => {
	let subscription = await Product.findById(req.params.id).populate('features');
	if (!subscription) return res.status(400).json('PRODUCT NOT FOUND');
	res.status(200).json({
		status: 'SUCCESS',
		data: subscription,
		message: 'SUBSCRIPTION FETCHED SUCCESSFULLY',
	});
};

const getAllProduct = async (req, res) => {
	let subscription;
	// console.log(req.user.role , req.user.id)
	if (req.user.role === 'ADMIN' || req.user.role == 'SUB_ADMIN') {
		if (req.query.company_id) {
			const company = await Companies.findOne({
				_id: mongoose.Types.ObjectId(req.query.company_id),
			}).populate('plan');
			if (!company) {
				return res.status(404).json('No Company with this id exists !');
			}
			subscription = await Product.find({
				$or: [
					{ type: 'COMMON' },
					{ avail_company: mongoose.Types.ObjectId(req.query.company_id) },
				],
				disabled: false,
			}).populate('features');
			// subscription.map((sub, id) => {
			// 	if (company.plan.subscription_type === sub.title) {
			// 		subscription[id].isCurrentSubscription = true;
			// 	} else {
			// 		subscription[id].isCurrentSubscription = false;
			// 	}
			// });
		} else
			subscription = await Product.find({ disabled: false }).populate(
				'features'
			);
	} else if (req.user.role === 'COMPANY') {
		const company = await Companies.findOne({
			_id: req.user.id,
		}).populate('plan');
		if (!company) {
			return res.status(400).json('User not exists !');
		}
		if (company.planType === 'PYG') {
			subscription = await Product.find({
				$or: [
					{ type: 'COMMON' },
					{ avail_company: mongoose.Types.ObjectId(req.user.id) },
				],
				disabled: false,
			}).populate('features');
		} else {
			// var findSubscription = await Product.findOne({
			// 	title: company.plan.subscription_type,
			// 	disabled: false,
			// });
			subscription = await Product.find({
				$or: [
					{ type: 'COMMON' },
					{ avail_company: mongoose.Types.ObjectId(req.user.id) },
				],
				disabled: false,
			}).populate('features');
			// if (findSubscription) {
			// 	var planAmount = findSubscription.monthly_amount;
			// 	subscription = subscription.filter(
			// 		(e) => e.monthly_amount >= planAmount
			// 	);
			// }
		}
	} else return res.status(400).json('Access not granted for this role !');

	if (!subscription) return res.status(400).json('SUBSCRIPTION NOT FOUND');
	res.status(200).json({
		status: 'SUCCESS',
		data: subscription,
		message: 'ALL PRODUCTS FETCHED SUCCESSFULLY',
	});
};

const getAll = async (req, res) => {
	let subscription = await Product.find({ disabled: false }).populate(
		'features'
	);

	if (!subscription) return res.status(400).json('PRODUCT NOT FOUND');
	res.status(200).json({
		status: 'SUCCESS',
		data: subscription,
		message: 'ALL PRODUCTS FETCHED SUCCESSFULLY',
	});
};

const deleteProduct = async (req, res) => {
	try {
		let subscription = await Product.findById(req.params.id);
		if (!subscription) return res.status(400).json('PRODUCT NOT FOUND');
		await Product.findByIdAndUpdate(req.params.id, {
			$set: { disabled: true },
		});

		const addActivityLog = new ActivityLog({
			person: req.user.id,
			role: req.user.role,
			heading: 'Product Deleted',
			message: 'Deleted a product: ' + subscription.title + '.',
		});

		await addActivityLog.save();

		return res.status(200).json({
			status: 'SUCCESS',
			data: subscription,
			message: 'PRODUCT DELETED SUCCESSFULLY',
		});
	} catch (err) {
		return res.status(400).json({ status: 'UNSUCCESS', message: err?.message });
	}
};

const createTestSubscription = async (req, res) => {
	// const { error } = subscriptionValidation.validate(req.body);
	// if (error) return res.status(400).json(error.details[0].message);
	try {
		if (
			(req.body.type === 'INDIVIDUAL' && !req.body.company_id) ||
			(req.body.company_id && !req.body.type === 'INDIVIDUAL')
		) {
			return res
				.status(400)
				.json(
					'Only Individual Product must specify the company ID to which the subscription will be available.'
				);
		}

		let subscription, company;

		if (req.body.type === 'COMMON') {
			subscription = await Product.findOne({ title: req.body.title });
			if (subscription)
				return res.status(400).json('SUBSCRIPTION ALREADY EXISTS!');
		} else {
			company = await Companies.findById(req.body.company_id);
			if (!company) {
				return res.status(400).json('No Compnay exists with this ID');
			}
			subscription = await Product.findOne({
				type: 'INDIVIDUAL',
				title: req.body.title,
				avail_company: req.body.company_id,
			});
			if (subscription)
				return res.status(400).json('SUBSCRIPTION ALREADY EXISTS!');
		}

		const product = await stripe.products.create({
			name: req.body.title,
			description: req.body.desc,
		});

		const price = await stripe.prices.create({
			unit_amount: req.body.monthly_amount * 100,
			currency: 'usd',
			product: product.id,
			recurring: {
				interval: 'day',
			},
		});

		const annualprice = await stripe.prices.create({
			unit_amount: req.body.annually_amount * 100,
			currency: 'usd',
			product: product.id,
			recurring: {
				interval: 'week',
			},
		});

		const cpc_product = await stripe.products.create({
			name: 'Extra Credit',
			description: `Extra Credits under ${req.body.title}`,
		});

		const cpc_price = await stripe.prices.create({
			unit_amount: req.body.cost_per_credit * 100,
			currency: 'usd',
			product: cpc_product.id,
		});

		const cpu_product = await stripe.products.create({
			name: 'Extra User',
			description: `Extra Users under ${req.body.title}`,
		});

		const cpu_price = await stripe.prices.create({
			unit_amount: req.body.cost_per_user * 100,
			currency: 'usd',
			product: cpu_product.id,
		});

		const newSubscription = await Product.create({
			title: req.body.title,
			desc: req.body.desc,
			features: req.body.features,
			monthly_amount: req.body.monthly_amount,
			annually_amount: req.body.annually_amount,
			stripe_product_id: product.id,
			stripe_month_price_id: price.id,
			stripe_annual_price_id: annualprice.id,
			type: req.body.type,
			avail_company:
				req.body.type === 'INDIVIDUAL' ? req.body.company_id : undefined,
			stripe_cpc_product_id: cpc_product.id,
			stripe_cpc_price_id: cpc_price.id,
			stripe_cpu_product_id: cpu_product.id,
			stripe_cpu_price_id: cpu_price.id,
			cost_per_credit: req.body.cost_per_credit,
			cost_per_user: req.body.cost_per_user,
			monthly_credits: req.body.monthly_credits,
			annually_credits: req.body.annually_credits,
			no_of_user: req.body.no_of_user,
		});

		if (newSubscription) {
			// const addActivityLog = new ActivityLog({
			// 	person: req.user.id,
			// 	role: req.user.role,
			// 	heading: `${req.body.type} Product Added ${
			// 		req.body.type === 'COMMON' ? '' : company.company_name
			// 	}`,
			// 	message: 'Added a new subscription: ' + newSubscription.title + '.',
			// });

			//await addActivityLog.save();

			return res.status(200).json({
				data: newSubscription,
				message: 'SUBSCRIPTION CREATED SUCCESSFULLY',
			});
		}
		return res.status(500).json({
			message: 'INTERNAL SERVER ERROR!',
		});
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

module.exports = {
	createProduct,
	updateProduct,
	getProductById,
	getAll,
	getAllProduct,
	deleteProduct,
	createTestSubscription,
};
