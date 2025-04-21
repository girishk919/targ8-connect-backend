/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const creditUsageSchema = new Schema(
	{
		company: {
			type: String,
		},
		member: { type: String },
		admin: { type: String },
		subadmin: { type: String },
		type: { type: String },
		credits: { type: String },
		product: { type: String },
		isBulk: { type: Boolean, default: false },
		email: { type: String },
		filename: { type: String },
		fileId: { type: String },
	},
	{ timestamps: true }
);

module.exports = credit_usage = mongoose.model(
	'CreditUsage',
	creditUsageSchema
);
