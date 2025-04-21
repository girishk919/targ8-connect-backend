/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const downloadSchema = new Schema(
	{
		download_name: {
			type: String,
			required: true,
		},
		dataType: { type: String },
		company: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Companies',
		},
		admin: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Admins',
		},
		subadmin: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Sub_Admins',
		},
		member: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Members',
		},
		leads: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'Leads',
		},
		verifyAll: { type: Boolean },
	},
	{ timestamps: true }
);

module.exports = downloads_model = mongoose.model('Downloads', downloadSchema);
