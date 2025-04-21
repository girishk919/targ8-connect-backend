/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const creditUsageDataSchema = new Schema(
	{
		company: {
			type: String,
		},
		member: { type: String },
		admin: { type: String },
		subadmin: { type: String },
		date: { type: String },
		credits: { type: Number },
	},
	{ timestamps: true }
);

module.exports = credit_usage_data = mongoose.model(
	'CreditUsageData',
	creditUsageDataSchema
);
