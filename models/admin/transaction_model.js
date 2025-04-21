const { default: mongoose } = require('mongoose');

const transactionSchema = new mongoose.Schema(
	{
		payment_intent_id: { type: String },
		type: { type: String },
		credit_count: { type: Number },
		user_count: { type: Number },
		company_id: { type: mongoose.SchemaTypes.ObjectId, ref: 'Companies' },
		expiresAt: { type: Date },
		amount: { type: Number },
		payment_mode: { type: String },
		card_info: { type: Number },
		subscription: { type: String },
	},
	{ timestamps: { expiredAt: true } }
);
const Transaction = mongoose.model('Transactions', transactionSchema);
module.exports = { Transaction };
