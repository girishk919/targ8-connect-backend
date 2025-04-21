/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DupLeadsSchema = new Schema(
	{
		Office_Type: { type: String },
		EmailAddress: { type: String },
		isDone: { type: Boolean, default: false },
	},
	{ strict: false },
	{ timestamps: true }
);

const DupLeads = mongoose.model('DupLeads', DupLeadsSchema);

module.exports = DupLeads;
