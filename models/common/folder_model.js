/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const folderSchema = new Schema(
	{
		folder_name: {
			type: String,
			required: true,
		},
		dataType: { type: String },
		company_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Companies',
		},
		admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admins' },
		subadmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Sub_Admins' },
		leads: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'Leads',
		},
	},
	{ timestamps: true }
);

module.exports = folder_model = mongoose.model('Folders', folderSchema);
