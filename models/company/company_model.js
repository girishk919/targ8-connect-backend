/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const companySchema = new Schema(
	{
		name: {
			type: String,
		},
		email: {
			type: String,
		},
		mobile: {
			type: Number,
		},
		username: { type: String },
		company_name: {
			type: String,
		},
		clientCode: { type: String },
		provider: { type: String, default: 'email' },
		stripeCustomerId: { type: String },
		// credits: {
		// 	type: Number,
		// 	default: 20,
		// },
		// totalCredits: {
		// 	type: Number,
		// 	default: 20,
		// },
		members: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'Members',
		},
		isOnboard: { type: Boolean, default: false },
		// invites: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'Invites',
		// },
		// planType: {
		// 	type: String,
		// 	default: 'PYG',
		// },
		// plan: {
		// 	type: mongoose.Schema.Types.ObjectId,
		// 	ref: 'Plans',
		// },
		// previous_plans: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'Plans',
		// },
		// invoices: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'Invoices',
		// },
		// leads: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'Leads',
		// },
		// folders: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'Folders',
		// },
		// credit_requests: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'RequestCredits',
		// },
		// downloads: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'Downloads',
		// },
		// search: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'SaveSearch',
		// },
		// exclusions: {
		// 	type: [mongoose.Schema.Types.ObjectId],
		// 	ref: 'Exclusions',
		// },
		role: {
			type: String,
			default: 'COMPANY',
			immutable: true,
		},
		// api_key: {
		// 	type: String,
		// },
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
		isCancelled: { type: Boolean, default: false },
		password: {
			type: String,
			min: 6,
		},
		isEmailVerified: {
			type: Boolean,
			default: false,
		},
		isLoggedIn: {
			type: Boolean,
			default: false,
		},
		last_login: String,
		lastSession: String,
		lastSubscriptionCheckedAt: Date,
		profileCheckDate: { type: String },
		profileVisit: { type: Number, default: 10 },
		is_internal_user: { type: Boolean, default: false },
		is_file_enhancer_user: { type: Boolean, default: false },
		upload_limit: { type: Number, default: 5000 },
		trailEmail: { type: Boolean, default: false },
		sevenEmail: { type: Boolean, default: false },
		twoEmail: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

module.exports = company_model = mongoose.model('Companies', companySchema);
