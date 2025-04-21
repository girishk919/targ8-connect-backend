/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const APIHistorySchema = new Schema(
	{
		route: { type: String },
		method: { type: String },
		date: { type: String },
		key: { type: String },
		company: { type: String },
		status: { type: String },
		credits: { type: String },
		ipAddress: { type: String },
	},
	{ timestamps: true }
);

module.exports = api_history_model = mongoose.model(
	'APIHistory',
	APIHistorySchema
);
