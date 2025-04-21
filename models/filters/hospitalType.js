const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HospitalTypeSchema = new Schema(
	{
		name: {
			type: String,
		},
	},
	{ timestamps: true }
);

const HospitalType = mongoose.model('HospitalType', HospitalTypeSchema);

module.exports = HospitalType;
