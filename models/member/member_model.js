/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const memberSchema = new Schema(
	{
		name: {
			type: String,
		},
		username: { type: String },
		email: {
			type: String,
		},
		clientCode: { type: String },
		isOnboard: { type: Boolean, default: false },
		company_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Companies',
		},
		// credit_requests: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'RequestCredits',
		// },
		department: {
			type: String,
			default: '',
		},
		// search: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'SaveSearch',
		// },
		role: {
			type: String,
			default: 'MEMBER',
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
		blocked: {
			type: Boolean,
			default: false,
		},
		suspended: {
			type: Boolean,
			default: false,
		},
		password: {
			type: String,
			required: true,
		},
		isLoggedIn: {
			type: Boolean,
			default: false,
		},
		last_login: String,
		lastSession: String,
		profileCheckDate: { type: String },
		profileVisit: { type: Number, default: 10 },
	},
	{ timestamps: true }
);

module.exports = member_model = mongoose.model('Members', memberSchema);
