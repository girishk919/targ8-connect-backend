const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OwnershipSchema = new Schema(
	{
		name: {
			type: String,
		},
	},
	{ timestamps: true }
);

const Ownership = mongoose.model('Ownership', OwnershipSchema);

module.exports = Ownership;
