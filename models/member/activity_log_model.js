/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const memberActivityLogSchema = new Schema(
	{
		member: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Members',
		},
		company: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Companies',
		},
		heading: {
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
	'MemberActivityLog',
	memberActivityLogSchema
);
