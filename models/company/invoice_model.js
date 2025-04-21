/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invoiceSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		company: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Companies',
			required: true,
		},
		from: {
			type: Object,
			required: true,
		},
		item: {
			type: Object,
			required: true,
		},
		status: {
			type: Boolean,
			required: true,
		},
		stripe_invoice_id: { type: String },
		amount: {
			type: Number,
			required: true,
		},
		card_info: {
			type: String,
		},
	},
	{ timestamps: true }
);

module.exports = invoice_model = mongoose.model('Invoices', invoiceSchema);
