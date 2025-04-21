/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EnhancerFilesSchema = new Schema(
	{
		sys_filename: {
			type: String,
		},
		company_id: {
			type: String,
		},
		mainadmin_id: {
			type: String,
		},
		mainsubadmin: {
			type: String,
		},
		filename: {
			type: String,
		},
		status: {
			type: String,
		},
	},
	{ strict: false },
	{ timestamps: true }
);

module.exports = enhancerfiles_model = mongoose.model(
	'EnhancerFiles',
	EnhancerFilesSchema
);
