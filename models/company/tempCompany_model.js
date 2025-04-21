/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tempCompanySchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
			min: 6,
		},
		mobile: {
			type: Number,
		},
		company_name: {
			type: String,
			required: true,
		},
		password: {
			type: String,
			required: true,
			min: 6,
		},
		fpr: { type: String },
		planId: { type: String },
		planType: { type: String },
		isAnnual: { type: Boolean },
		// expireAt: {
		//   type: Date,
		//   default: Date.now,
		//   index: { expires: "30m" },
		// },
		isEmailVerified: {
			type: Boolean,
			default: false,
			required: true,
		},
	},
	{ timestamps: true }
);

module.exports = tempCompany_model = mongoose.model(
	'TempCompanies',
	tempCompanySchema
);
