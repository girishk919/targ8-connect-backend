const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CountrySchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

const Country = mongoose.model('Country', CountrySchema);

module.exports = Country;
