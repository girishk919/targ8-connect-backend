/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FileVerificationsSchema = new Schema(
	{
		sys_filename: {
			type: String,
		},
		person: { type: String },
		company_id: {
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
		uploadby: { type: String },
		updated_at: {
			type: String,
		},
	},
	{ strict: false },
	{ timestamps: true }
);

module.exports = fileverifications_model = mongoose.model(
	'FileVerifications',
	FileVerificationsSchema
);
