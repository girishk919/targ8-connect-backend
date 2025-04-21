const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UnverifiedLeadsSchema = new Schema(
	{
		category: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
		},
	},
	{ strict: false },
	{ timestamps: true }
);

const UnverifiedLeads = mongoose.model(
	'UnverifiedLeads',
	UnverifiedLeadsSchema
);

module.exports = UnverifiedLeads;
