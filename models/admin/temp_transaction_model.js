const { default: mongoose } = require('mongoose');

const tempTransactionsSchema = new mongoose.Schema(
	{
		payment_intent_id: { type: String },
		type: { type: String },
		credit_count: { type: Number },
		user_count: { type: Number },
		company_id: { type: mongoose.SchemaTypes.ObjectId, ref: 'Companies' },
		expiresAt: {
			type: Date,
			index: { expires: '60m' },
		},
		amount: { type: Number },
		payment_mode: { type: String },
		card_info: { type: Number },
		subscription: { type: String },
	},
	{ timestamps: { createdAt: 'expiresAt' } }
);
const tempTransactions = mongoose.model(
	'tempTransactions',
	tempTransactionsSchema
);
module.exports = tempTransactions;
