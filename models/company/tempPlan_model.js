const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tempPlanSchema = new Schema({
	company_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Companies',
	},
	paymentIntent: String,
	mode: String,
	subscription_type: {
		type: String,
		required: true,
	},
	isAnnual: {
		type: Boolean,
	},
	credits: {
		type: Number,
		default: 5.0,
	},
	cost_per_credit: {
		type: Number,
	},
	stripe_cpc_price_id: {
		type: String,
	},
	cost_per_user: {
		type: Number,
	},
	stripe_cpu_price_id: {
		type: String,
	},
	validity: {
		type: Number,
		default: 6,
	},
	subscription_amount: {
		type: Number,
		default: 0.0,
	},
	max_members: {
		type: Number,
		default: 1,
	},
	card_info: { type: String },
	expireAt: {
		type: Date,
		default: Date.now,
		index: { expires: '60m' },
	},
});

module.exports = tempPlan_model = mongoose.model('TempPlan', tempPlanSchema);
