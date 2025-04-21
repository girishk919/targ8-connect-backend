const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SpecialityGroupSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

const SpecialityGroup = mongoose.model(
	'SpecialityGroup',
	SpecialityGroupSchema
);

module.exports = SpecialityGroup;
