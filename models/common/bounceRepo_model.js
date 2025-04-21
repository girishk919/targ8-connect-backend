/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BounceReposSchema = new Schema(
	{
		email: {
			type: String,
		},
		filename: { type: String },
		sys_filename: { type: String },
		verification_date: { type: String },
		company: {
			type: String,
		},
		admin: {
			type: String,
		},
		subadmin: {
			type: String,
		},
		status: {
			type: String,
		},
	},
	{ strict: false },
	{ timestamps: true }
);

module.exports = bouncerepos_model = mongoose.model(
	'BounceRepos',
	BounceReposSchema
);
