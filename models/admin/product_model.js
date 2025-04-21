/** @format */

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
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

		stripe_product_id: {
			type: String,
			required: true,
		},
		stripe_month_price_id: {
			type: String,
			required: true,
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
		homepage: { type: Boolean, default: false },
		disabled: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;
