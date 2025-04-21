/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SingleFinderSchema = new Schema(
	{
		person: { type: String },
		company_id: {
			type: String,
		},
		mainadmin_id: {
			type: String,
		},
		mainsubadmin: {
			type: String,
		},
	},
	{ strict: false },
	{ timestamps: true }
);

module.exports = singlefinder = mongoose.model(
	'SingleFinder',
	SingleFinderSchema
);
