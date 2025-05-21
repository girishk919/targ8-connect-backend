/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const rfpSchema = new Schema(
	{
		name: { type: String },
		code: { type: String },
		client: { type: String },
		company: { type: mongoose.Schema.Types.ObjectId, ref: 'Companies' },
		member: { type: String },
		memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Members' },
		startDate: { type: Date },
		endDate: { type: Date },
		specification: { type: String },
		targetCPL: { type: String },
		cplCurrency: { type: String, default: 'USD' },
		status: { type: String, default: 'Open' },
		files: [
			{
				path: { type: String },
				specification: { type: String },
				originalName: { type: String },
			},
		],
		comments: [
			{
				date: { type: String },
				isAdmin: { type: Boolean, default: false },
				message: { type: String },
			},
		],
	},
	{ timestamps: true }
);

module.exports = rfp_model = mongoose.model('RFP', rfpSchema);
