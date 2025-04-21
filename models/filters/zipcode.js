const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ZipcodeSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

const Zipcode = mongoose.model('Zipcode', ZipcodeSchema);

module.exports = Zipcode;
