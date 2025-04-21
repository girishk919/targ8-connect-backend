/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		min: 6,
	},
	department: {
		type: String,
	},
	isOnboard: { type: Boolean, default: false },
	role: {
		type: String,
		default: 'ADMIN',
		immutable: true,
	},
	login_ip: {
		type: String,
	},
	browserType: {
		type: String,
	},
	location: {
		type: String,
	},
	password: {
		type: String,
		required: true,
		min: 6,
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
	isLoggedIn: {
		type: Boolean,
		default: false,
	},
});

module.exports = admin_model = mongoose.model('Admins', adminSchema);
