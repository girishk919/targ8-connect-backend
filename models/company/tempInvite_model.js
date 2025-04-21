const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tempInviteSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
		},
		company_name: {
			type: String,
			required: true,
		},
		credits: {
			type: Number,
			default: 0,
		},
		expireAt: {
			type: Date,
			default: Date.now,
			index: { expires: '60m' },
		},
	},
	{ timestamps: true }
);

module.exports = tempInvite_model = mongoose.model(
	'tempInvite',
	tempInviteSchema
);
