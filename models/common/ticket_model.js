/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ticketSchema = new Schema(
	{
		code: { type: String },
		company: { type: mongoose.Schema.Types.ObjectId, ref: 'Companies' },
		memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Members' },
		subject: { type: String },
		message: { type: String },
		campaign: { type: String },
		priority: { type: String, default: 'High' },
		status: { type: String, default: 'Open' },
		response: { type: String },
		files: [
			{
				path: { type: String },
				originalName: { type: String },
			},
		],
	},
	{ timestamps: true }
);

module.exports = ticket_model = mongoose.model('Tickets', ticketSchema);
