/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IntegrateKeySchema = new Schema(
	{
		apiKey: { type: String },
		comments: { type: String },
		title: { type: String },
		date: { type: String },
		company: { type: String },
	},
	{ timestamps: true }
);

module.exports = integrate_key_model = mongoose.model(
	'IntegrateKey',
	IntegrateKeySchema
);
