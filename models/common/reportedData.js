/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReportedDataSchema = new Schema(
	{
		person: { type: String },
		email: { type: String },
		product: { type: String },
		isProfile: { type: Boolean, default: true },
	},
	{ strict: false },
	{ timestamps: true }
);

module.exports = reportedData = mongoose.model(
	'ReportedData',
	ReportedDataSchema
);
