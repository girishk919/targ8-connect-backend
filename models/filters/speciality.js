const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SpecialitySchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

const Speciality = mongoose.model('Speciality', SpecialitySchema);

module.exports = Speciality;
