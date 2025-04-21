/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LeadsSchema = new Schema(
	{
		category: {
			type: mongoose.Schema.Types.ObjectId,
			//required: true,
		},
		updatestatus: { type: String, default: '' },
		Office_Type: { type: String },
		emailValid: { type: Boolean },
		debounceStatus: { type: String },
		debounceTime: { type: String },
		debounceCode: { type: String },
	},
	{ strict: false },
	{ timestamps: true }
);

const Leads = mongoose.model('Leads', LeadsSchema);

module.exports = Leads;
