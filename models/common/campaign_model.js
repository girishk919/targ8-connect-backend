/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const campaignsSchema = new Schema(
	{
		name: { type: String },
		code: { type: String },
		client: { type: String },
		company: { type: mongoose.Schema.Types.ObjectId, ref: 'Companies' },
		member: { type: String },
		memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Members' },
		flightDetails: { type: String },
		leadVolume: { type: String },
		startDate: { type: Date },
		endDate: { type: Date },
		pacing: { type: String },
		deliverySchedule: { type: String },
		deliveryDay: { type: [String] },
		specification: { type: String },
		jobTitle: { type: String },
		jobRole: { type: String },
		geography: { type: String },
		industry: { type: String },
		companySize: { type: String },
		revenueSize: { type: String },
		tactics: { type: String },
		status: { type: String, default: 'Pending' },
		files: [
			{
				path: { type: String },
				specification: { type: String },
				originalName: { type: String },
			},
		],
		delivery: [
			{
				date: { type: String },
				lastUpdate: { type: String },
				leadsVolume: { type: String },
				leadsScore: { type: String },
				leadsUnderAudit: { type: String },
				leadsReadyForDelivery: { type: String },
				delivered: { type: String },
				rejects: { type: String },
				balance: { type: String },
				files: [
					{
						path: { type: String },
						originalName: { type: String },
						specification: { type: String },
						date: { type: String },
					},
				],
			},
		],
	},
	{ timestamps: true }
);

module.exports = campaign_model = mongoose.model('Campaigns', campaignsSchema);
