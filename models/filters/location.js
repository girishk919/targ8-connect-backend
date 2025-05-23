const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LocationSchema = new Schema(
	{
		Country: {
			type: String,
		},
		State: {
			type: String,
			required: true,
		},
		StateAbb: {
			type: String,
			required: true,
		},
		City: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

const Location = mongoose.model('Location', LocationSchema);

module.exports = Location;
