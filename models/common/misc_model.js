/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MiscSchema = new Schema({
	days: {
		type: Number,
	},
});

module.exports = misc_model = mongoose.model('Misc', MiscSchema);
