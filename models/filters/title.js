/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TitleSchema = new Schema(
	{
		name: {
			type: String,
		},
		order: { type: Number },
		abb: { type: String },
	},
	{ timestamps: true }
);

const Title = mongoose.model('Title', TitleSchema);

module.exports = Title;
