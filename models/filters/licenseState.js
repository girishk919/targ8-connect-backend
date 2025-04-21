const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LicenseStateSchema = new Schema(
	{
		name: {
			type: String,
		},
	},
	{ timestamps: true }
);

const LicenseStates = mongoose.model('LicenseState', LicenseStateSchema);

module.exports = LicenseStates;
