/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const exclusionSchema = new Schema(
	{
		list_name: {
			type: String,
			required: true,
		},
		company: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Companies',
		},
		admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admins' },
		subadmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Sub_Admins' },
		leads: {
			type: [Object],
		},
	},
	{ timestamps: true }
);

module.exports = exclusion_model = mongoose.model(
	'Exclusions',
	exclusionSchema
);
