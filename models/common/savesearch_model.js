/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const saveSearchSchema = new Schema(
	{
		search_name: {
			type: String,
			required: true,
		},
		person: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
		},
		admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admins' },
		subadmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Sub_Admins' },
		type: { type: String },
		search_params: {
			type: Object,
			required: true,
		},
	},
	{ timestamps: true }
);

module.exports = savesearch_model = mongoose.model(
	'SaveSearch',
	saveSearchSchema
);
