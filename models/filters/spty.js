const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SptySchema = new Schema(
	{
		SpecialtyGroup1: {
			type: String,
		},
		Specialty: {
			type: String,
			required: true,
		},
		SpecialtyGroup_ID: { type: String, required: true },
	},
	{ timestamps: true }
);

const Spty = mongoose.model('Spty', SptySchema);

module.exports = Spty;
