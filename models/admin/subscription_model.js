/** @format */

const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
		},
		desc: {
			type: String,
			required: true,
		},
		type: {
			type: String,
		},
		avail_company: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'Companies',
		},
		features: {
			type: [mongoose.Schema.Types.ObjectId],

			ref: 'features',
		},
		monthly_amount: {
			type: Number,
			required: true,
		},
		annually_amount: {
			type: Number,
		},
		stripe_product_id: {
			type: String,
			required: true,
		},
		cost_per_credit: {
			type: Number,
		},
		cost_per_user: {
			type: Number,
		},
		stripe_cpc_price_id: {
			type: String,
			required: true,
		},
		stripe_cpc_product_id: {
			type: String,
			required: true,
		},
		stripe_cpu_price_id: {
			type: String,
			required: true,
		},
		stripe_cpu_product_id: {
			type: String,
			required: true,
		},
		stripe_month_price_id: {
			type: String,
			required: true,
		},
		stripe_annual_price_id: {
			type: String,
		},
		credits: {
			type: Number,
			default: 0,
		},
		monthly_credits: {
			type: Number,
			default: 0,
		},
		annually_credits: {
			type: Number,
			default: 0,
		},
		validity_days: {
			type: Number,
		},
		no_of_user: {
			type: Number,
			required: true,
		},
		homepage: { type: Boolean, default: false },
		disabled: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

module.exports = Subscription;
