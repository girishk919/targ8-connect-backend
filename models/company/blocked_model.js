const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BlockSchema = new Schema(
	{
		address: { type: String },
	},
	{ timestamps: true }
);

// planSchema.index(
//   { createdAt: 1 },
//   { expireAfterSeconds: 6 * 24 * 60 * 60, partialFilterExpression: { subscription_amount_status: false } }
// );

module.exports = block_model = mongoose.model('Block', BlockSchema);
