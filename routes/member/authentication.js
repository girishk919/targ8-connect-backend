const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const router = express.Router();

const Companies = require('../../models/company/company_model');
const Members = require('../../models/member/member_model');
const Invites = require('../../models/company/invite_model');
const CompanyActivityLogs = require('../../models/company/activity_log_model');
const MemberActivities = require('../../models/member/activity_log_model');

const registerValidation = require('../../validations/member/register_validation');

router.post('/register', async (req, res) => {
	const { error } = registerValidation.validate(req.body);
	if (error) return res.status(400).json(error.details[0].message);

	try {
		const invite = await Invites.findById(req.body.invite_id);
		if (!invite) return res.status(400).json('Invite not found!');

		const company = await Companies.findOne({
			company_name: invite.company_name,
		}).populate(['invites', 'plan']);
		if (!company) return res.status(400).json('Company not found!');

		let count = 0;

		company.invites = company.invites.filter((element) => {
			if (element._id.equals(mongoose.Types.ObjectId(invite._id))) {
				count++;
				return false;
			}
			return true;
		});

		if (count == 0) {
			await invite.remove();
			return res.status(400).json('Invite not found!');
		}

		const salt = await bcrypt.genSalt(10);
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		// if (company.credits < req.body.credits) {
		// 	invite.credits = 0;
		// }

		// company.credits -= invite.credits;

		const addMember = new Members({
			name: invite.name,
			email: invite.email,
			company_id: company._id,
			credits: invite.credits,
			totalCredits: invite.credits,
			password: hashPassword,
		});

		await Invites.findByIdAndDelete(invite._id);

		const member = await addMember.save();

		company.members.push(member._id);

		await company.save();

		const addCompanyActivityLog = new CompanyActivityLogs({
			company: company._id,
			heading: 'Invitation Accepted',
			message: invite.name + ' accepted your invitation request.',
		});

		await addCompanyActivityLog.save();

		var today = new Date().toLocaleDateString('en-us', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		await MemberActivities.create({
			member: member._id,
			company: member.company_id._id,
			heading: 'Account Created',
			message: `Account have created at ${today}!`,
		});

		return res.json('Sign Up Successful!');
	} catch (error) {
		res.status(400).json('There was some error!');
	}
});

module.exports = router;
