/** @format */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const downloadQueuesSchema = new Schema(
	{
		download_name: {
			type: String,
		},
		dataType: { type: String },
		company: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Companies',
		},
		admin: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Admins',
		},
		subadmin: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Sub_Admins',
		},
		member: {
			type: String,
		},
		leads: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'Leads',
		},
		verifyAll: { type: Boolean },
		previousDownload: { type: [Boolean] },
		status: { type: String, default: 'Under Verification' },
		isMailSent: { type: Boolean, default: false },
		mvfileid: { type: String },
	},
	{ timestamps: true }
);

module.exports = download_queue_model = mongoose.model(
	'DownloadQueues',
	downloadQueuesSchema
);
