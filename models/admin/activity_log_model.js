/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminActivityLogSchema = new Schema(
	{
		person: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Admins',
		},
		heading: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			required: true,
		},
		message: {
			type: String,
			required: true,
		},
		query: { type: String },
	},
	{ timestamps: true }
);

module.exports = activity_log_model = mongoose.model(
	'adminactivitylogs',
	adminActivityLogSchema
);
