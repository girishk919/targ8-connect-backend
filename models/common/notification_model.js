const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const companyNotificationSchema = new Schema(
	{
		company: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Companies',
		},
		member: { type: mongoose.Schema.Types.ObjectId, ref: 'Members' },
		person: { type: mongoose.Schema.Types.ObjectId, ref: 'Admins' },
		heading: {
			type: String,
			required: true,
		},
		message: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

module.exports = notification_model = mongoose.model(
	'CompanyNotification',
	companyNotificationSchema
);
