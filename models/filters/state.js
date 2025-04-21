const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StateSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

const States = mongoose.model('State', StateSchema);

module.exports = States;
