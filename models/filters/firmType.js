const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FirmTypeSchema = new Schema(
	{
		name: {
			type: String,
		},
	},
	{ timestamps: true }
);

const FirmType = mongoose.model('FirmType', FirmTypeSchema);

module.exports = FirmType;
