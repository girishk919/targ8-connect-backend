/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const planSchema = new Schema(
	{
		subscription_type: {
			type: String,
			default: 'Free Trial',
		},
		paymentIntent: String,
		isAnnual: { type: Boolean, default: false },
		stripe_invoice_id: { type: String },
		credits: {
			type: Number,
			default: 5.0,
		},
		validity: { type: Number },
		subscription_amount: {
			type: Number,
			default: 0.0,
		},
		subscription_end_date: {
			type: Date,
		},
		subscription_amount_status: {
			type: Boolean,
			default: false,
		},
		stripe_cpc_price_id: {
			type: String,
		},
		stripe_cpu_price_id: {
			type: String,
		},
		stripe_subscription_id: {
			type: String,
		},
		payment_mode: {
			type: String,
		},
		cost_per_credit: {
			type: Number,
		},
		max_members: {
			type: Number,
			default: 1,
		},
		cost_per_user: {
			type: Number,
		},
		extra_members: {
			type: Number,
			default: 0,
		},
		txnId: String,
		date: Date,
		isExpired: { type: Boolean, default: false },
		isCancelled: { type: Boolean, default: false },
		cancelDate: { type: Date },
		card_info: { type: String },
	},
	{ timestamps: true }
);

// planSchema.index(
//   { createdAt: 1 },
//   { expireAfterSeconds: 6 * 24 * 60 * 60, partialFilterExpression: { subscription_amount_status: false } }
// );

module.exports = plans_model = mongoose.model('Plans', planSchema);
