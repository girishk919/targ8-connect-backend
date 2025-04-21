/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subadminSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
			min: 6,
		},
		isOnboard: { type: Boolean, default: false },
		department: {
			type: String,
		},
		role: {
			type: String,
			default: 'SUB_ADMIN',
			immutable: true,
		},
		login_ip: {
			type: String,
		},
		password: {
			type: String,
			required: true,
			min: 6,
		},
		isLoggedIn: {
			type: Boolean,
			default: false,
		},
		leads: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'Leads',
		},
		downloads: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'Downloads',
		},
		search: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'SaveSearch',
		},
		folders: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'Folders',
		},
		exclusions: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'Exclusions',
		},
		last_login: String,
		lastSession: String,
		access_tabs: { type: [String] },
	},
	{ timestamps: true }
);

module.exports = subadmin_model = mongoose.model('Sub_Admins', subadminSchema);
