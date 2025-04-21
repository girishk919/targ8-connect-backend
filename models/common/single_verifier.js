/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SingleVerificationsSchema = new Schema(
	{
		sys_filename: {
			type: String,
		},
		person: {
			type: String,
		},
		company: {
			type: String,
		},
		admin: {
			type: String,
		},
		subadmin: {
			type: String,
		},
		filename: {
			type: String,
		},
		status: {
			type: String,
		},
		email: { type: String },
		title: {
			type: String,
		},
		fullname: {
			type: String,
		},
		profile_data: { type: Object },
		uploadby: { type: String },
		updated_at: {
			type: String,
		},
	},
	{ strict: false },
	{ timestamps: true }
);

module.exports = singleverification_model = mongoose.model(
	'SingleVerifications',
	SingleVerificationsSchema
);
