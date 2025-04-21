/** @format */

const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
//const csvtojson = require('csvtojson');
const multer = require('multer');
var request = require('request');
const papaparse = require('papaparse');
const fs = require('fs');
const jwt = require('jsonwebtoken');
//const sgMail = require('@sendgrid/mail');
//sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

const { dashLogger } = require('../../logger');
const captchaVerifier = require('./captchaVerification');
const authorize = require('../../helpers/authorize');
const Companies = require('../../models/company/company_model');
const Admin = require('../../models/admin/admin_model');
const Subadmin = require('../../models/sub-admin/sub_admin_model');
const Activities = require('../../models/company/activity_log_model');
const Subscription = require('../../models/admin/subscription_model');
const MemberActivities = require('../../models/member/activity_log_model');
const AdminActivities = require('../../models/admin/activity_log_model');
const Members = require('../../models/member/member_model');
const Leads = require('../../models/admin/leads_model');
const DownloadQueues = require('../../models/common/download_queue_model');
const UnverifiedLeads = require('../../models/admin/unverified_leads_model');
const Downloads = require('../../models/common/downloads_model');
const subscription_validater = require('../../helpers/subscription_validator');
const Title = require('../../models/filters/title');
const HospitalType = require('../../models/filters/hospitalType');
const FirmType = require('../../models/filters/firmType');
const Ownership = require('../../models/filters/ownership');
const States = require('../../models/filters/state');
const SpecialityType = require('../../models/filters/specialityType');

const nodemailer = require('nodemailer');
const { checkUnpaidInvoice } = require('../../helpers/authorize');
const CryptoJS = require('crypto-js');

router.post(
	'/getLeads',
	[
		authorize.verifyToken,
		// authorize.accessCompanyAndMember,
		subscription_validater,
	],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id).populate('exclusions')) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
					populate: { path: 'exclusions' },
				}));
			if (!person) return res.status(400).json('Account not found!');

			let totalCount;

			let leads;

			let exclusion_leads_emails = [];

			if (person.role === 'COMPANY') {
				for (let i = 0; i < person.exclusions.length; i++) {
					for (let j = 0; j < person.exclusions[i].leads.length; j++) {
						exclusion_leads_emails.push(
							person.exclusions[i].leads[j].EmailAddress
						);
					}
				}

				totalCount = await Leads.countDocuments({
					_id: { $nin: person.leads },
					EmailAddress: { $nin: exclusion_leads_emails },
				});

				leads = await Leads.find({
					_id: { $nin: person.leads },
					EmailAddress: { $nin: exclusion_leads_emails },
				})
					.skip((req.body.page - 1) * req.body.limits)
					.limit(req.body.limits);
			} else if (person.role === 'MEMBER') {
				for (let i = 0; i < person.company_id.exclusions.length; i++) {
					for (
						let j = 0;
						j < person.company_id.exclusions[i].leads.length;
						j++
					) {
						exclusion_leads_emails.push(
							person.company_id.exclusions[i].leads[j].EmailAddress
						);
					}
				}

				totalCount = await Leads.countDocuments({
					_id: { $nin: person.company_id.leads },
					EmailAddress: { $nin: exclusion_leads_emails },
				});

				leads = await Leads.find({
					_id: { $nin: person.company_id.leads },
					EmailAddress: { $nin: exclusion_leads_emails },
				})
					.skip((req.body.page - 1) * req.body.limits)
					.limit(req.body.limits);
			} else {
				return res.status(400).json('Role not found!');
			}

			return res.json({ count: totalCount, leads: leads });
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			return res.status(400).json({ error: error.message });
		}
	}
);

router.get(
	'/quickSearch',
	[
		authorize.verifyToken,
		// authorize.accessCompanyAndMember,
		subscription_validater,
	],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id).populate('exclusions')) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
					populate: { path: 'exclusions' },
				}));
			if (!person) return res.status(400).json('Account not found!');

			let totalCount;

			let leads;

			let exclusion_leads_emails = [];

			if (person.role === 'COMPANY') {
				for (let i = 0; i < person.exclusions.length; i++) {
					for (let j = 0; j < person.exclusions[i].leads.length; j++) {
						exclusion_leads_emails.push(
							person.exclusions[i].leads[j].EmailAddress
						);
					}
				}

				totalCount = await Leads.countDocuments({
					$and: [
						{ _id: { $nin: person.leads } },
						{ EmailAddress: { $nin: exclusion_leads_emails } },
						{
							$or: [
								// { HospitalName: { $regex: req.query.searchparam, $options: "i" } },
								// { Clinic: { $regex: req.query.searchparam, $options: "i" } },
								{ FirstName: { $regex: req.query.searchparam, $options: 'i' } },
								{ LastName: { $regex: req.query.searchparam, $options: 'i' } },
								{
									MiddleName: { $regex: req.query.searchparam, $options: 'i' },
								},
							],
						},
					],
				});

				leads = await Leads.find({
					$and: [
						{ _id: { $nin: person.leads } },
						{ EmailAddress: { $nin: exclusion_leads_emails } },
						{
							$or: [
								{
									HospitalName: {
										$regex: req.query.searchparam,
										$options: 'i',
									},
								},
								{ Clinic: { $regex: req.query.searchparam, $options: 'i' } },
								{ FirstName: { $regex: req.query.searchparam, $options: 'i' } },
								{ LastName: { $regex: req.query.searchparam, $options: 'i' } },
								{
									MiddleName: { $regex: req.query.searchparam, $options: 'i' },
								},
							],
						},
					],
				})
					.skip((req.query.page - 1) * req.query.limit)
					.limit(req.query.limit);
			} else if (person.role === 'MEMBER') {
				for (let i = 0; i < person.company_id.exclusions.length; i++) {
					for (
						let j = 0;
						j < person.company_id.exclusions[i].leads.length;
						j++
					) {
						exclusion_leads_emails.push(
							person.company_id.exclusions[i].leads[j].EmailAddress
						);
					}
				}

				totalCount = await Leads.countDocuments({
					$and: [
						{ _id: { $nin: person.company_id.leads } },
						{ EmailAddress: { $nin: exclusion_leads_emails } },
						{
							$or: [
								// { HospitalName: { $regex: req.query.searchparam, $options: "i" } },
								// { Clinic: { $regex: req.query.searchparam, $options: "i" } },
								{ FirstName: { $regex: req.query.searchparam, $options: 'i' } },
								{ LastName: { $regex: req.query.searchparam, $options: 'i' } },
								{
									MiddleName: { $regex: req.query.searchparam, $options: 'i' },
								},
							],
						},
					],
				});

				leads = await Leads.find({
					$and: [
						{ _id: { $nin: person.company_id.leads } },
						{ EmailAddress: { $nin: exclusion_leads_emails } },
						{
							$or: [
								// { HospitalName: { $regex: req.query.searchparam, $options: "i" } },
								// { Clinic: { $regex: req.query.searchparam, $options: "i" } },
								{ FirstName: { $regex: req.query.searchparam, $options: 'i' } },
								{ LastName: { $regex: req.query.searchparam, $options: 'i' } },
								{
									MiddleName: { $regex: req.query.searchparam, $options: 'i' },
								},
							],
						},
					],
				})
					.skip((req.query.page - 1) * req.query.limit)
					.limit(req.query.limit);
			} else {
				return res.status(400).json('Role not found!');
			}

			return res.json({ count: totalCount, leads: leads });
		} catch (error) {
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			return res.status(400).json({ error: error.message });
		}
	}
);

router.post(
	'/leadColumnFilterStats',
	[
		authorize.verifyToken,
		// authorize.accessCompanyAndMember,
		authorize.checkUnpaidInvoice,
		subscription_validater,
	],

	async (req, res) => {
		try {
			let query = [];
			console.log('start', new Date().getSeconds());
			const person =
				(await Companies.findById(req.user.id)
					.populate('exclusions')
					.populate('plan')) ||
				(await Members.findById(req.user.id)
					.populate({
						path: 'company_id',
						populate: { path: 'exclusions' },
					})
					.populate({
						path: 'company_id',
						populate: { path: 'plan' },
					})) ||
				(await Admin.findById(req.user.id)) ||
				(await Subadmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			let plan = [];
			if (person.role === 'COMPANY') {
				if (person.plan.subscription_type === 'Free Trial') {
					const findPlan = await Subscription.findOne({
						title: 'Growth',
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				} else {
					const findPlan = await Subscription.findOne({
						title: person.plan.subscription_type,
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				}
			}
			if (person.role === 'MEMBER') {
				if (person.company_id.plan.subscription_type === 'Free Trial') {
					const findPlan = await Subscription.findOne({
						title: 'Growth',
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				} else {
					const findPlan = await Subscription.findOne({
						title: person.company_id.plan.subscription_type,
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				}
			}
			if (person.role === 'ADMIN' || person.role === 'SUB_ADMIN') {
				const findPlan = await Subscription.findOne({
					title: 'Growth',
				}).populate('features');
				if (!findPlan) {
					return res.status(200).json('Buy a plan for using the services');
				}
				for (const rev of findPlan.features) {
					plan.push(rev.description);
				}
			}

			if (req.body.contact_name) {
				query.push({
					$or: [
						{
							FirstName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
						{
							LastName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
						{
							MiddleName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
					],
				});
			}
			if (req.body.title) {
				// let titleRegex = req.body.title.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Title: {
						$in: req.body.title,
					},
				});
			}
			if (req.body.tabletitle) {
				let titleRegex = req.body.tabletitle.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Title: {
						$in: titleRegex,
					},
				});
			}
			if (req.body.levelID) {
				// let levelRegex = req.body.levelID.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					LevelID: {
						$in: req.body.levelID,
					},
				});
			}
			if (req.body.geographic) {
				// let geoRegex = req.body.geographic.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Geographic_Classification: {
						$in: req.body.geographic,
					},
				});
			}
			if (req.body.emailtype) {
				if (req.body.emailtype[0] === 'Personal Email') {
					query.push({
						ISP: 'Yes',
					});
				} else if (req.body.emailtype[0] === 'B2B') {
					query.push({
						ISP: 'No',
					});
				}
			}
			if (req.body.hospitalType) {
				// let hosRegex = req.body.hospitalType.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					HospitalType: {
						$in: req.body.hospitalType,
					},
				});
			}
			if (req.body.tablehospitalType) {
				let hosRegex = req.body.tablehospitalType.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					HospitalType: {
						$in: hosRegex,
					},
				});
			}
			if (req.body.firmType) {
				// let firmRegex = req.body.firmType.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					FirmType: {
						$in: req.body.firmType,
					},
				});
			}
			if (req.body.tablefirmType) {
				let firmRegex = req.body.tablefirmType.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					FirmType: {
						$in: firmRegex,
					},
				});
			}
			if (req.body.ownership) {
				// let ownRegex = req.body.ownership.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Ownership: {
						$in: req.body.ownership,
					},
				});
			}
			if (req.body.tableownership) {
				let ownRegex = req.body.tableownership.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Ownership: {
						$in: ownRegex,
					},
				});
			}
			if (req.body.address) {
				query.push({
					$or: [
						{ Address1: { $regex: req.body.address[0], $options: 'i' } },
						{ Address2: { $regex: req.body.address[0], $options: 'i' } },
					],
				});
			}
			if (req.body.country) {
				// let countryRegex = req.body.country.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Country: {
						$in: req.body.country,
					},
				});
			}
			if (req.body.city) {
				// let cityRegex = req.body.city.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					City: {
						$in: req.body.city,
					},
				});
			}
			if (req.body.tablecity) {
				let cityRegex = req.body.tablecity.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					City: {
						$in: cityRegex,
					},
				});
			}
			if (req.body.zipcode) {
				// let codeRegex = req.body.zipcode.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					ZIPCode: {
						$in: req.body.zipcode,
					},
				});
			}
			if (req.body.state) {
				// let stateRegex = req.body.state.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					State: {
						$in: req.body.state,
					},
				});
			}
			if (req.body.tablestate) {
				let stateRegex = req.body.tablestate.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					State: {
						$in: stateRegex,
					},
				});
			}
			if (req.body.speciality) {
				// let specRegex = req.body.speciality.map(function (e) {
				// 	e = e.split('(');
				// 	return new RegExp(e[0], 'i');
				// });
				query.push({
					Specialty: {
						$in: req.body.speciality,
					},
				});
			}
			if (req.body.tablespeciality) {
				let specRegex = req.body.tablespeciality.map(function (e) {
					e = e.split('(');
					return new RegExp(e[0], 'i');
				});
				query.push({
					Specialty: {
						$in: specRegex,
					},
				});
			}
			if (req.body.specialityType) {
				// let specTypeRegex = req.body.specialityType.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					SpecialtyType: {
						$in: req.body.specialityType,
					},
				});
			}
			if (req.body.tablespecialityType) {
				let specTypeRegex = req.body.tablespecialityType.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					SpecialtyType: {
						$in: specTypeRegex,
					},
				});
			}
			if (req.body.specialityGroup) {
				// let specGroupRegex = req.body.specialityGroup.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					SpecialtyGroup1: {
						$in: req.body.specialityGroup,
					},
				});
			}
			if (req.body.tablespecialityGroup) {
				let specGroupRegex = req.body.tablespecialityGroup.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					SpecialtyGroup1: {
						$in: specGroupRegex,
					},
				});
			}
			if (req.body.licenseState) {
				if (!plan.includes('State License Code')) {
					return res
						.status(400)
						.json('License State Search is not in your plan.');
				}
				// let licRegex = req.body.licenseState.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					LicenseIssueState: {
						$in: req.body.licenseState,
					},
				});
			}
			if (req.body.npi) {
				if (!plan.includes('NPI Number Upload')) {
					return res.status(400).json('NPI Number Upload is not in your plan.');
				}
				// let npiRegex = req.body.npi.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					NPINumber: {
						$in: req.body.npi,
					},
				});
			}
			if (req.body.tablenpi) {
				if (!plan.includes('NPI Number Upload')) {
					return res.status(400).json('NPI Number Upload is not in your plan.');
				}
				let npiRegex = req.body.tablenpi.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					NPINumber: {
						$in: npiRegex,
					},
				});
			}
			if (req.body.department) {
				// let depRegex = req.body.department.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Department: {
						$in: req.body.department,
					},
				});
			}
			if (req.body.tabledepartment) {
				let depRegex = req.body.tabledepartment.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Department: {
						$in: depRegex,
					},
				});
			}
			if (req.body.officetype) {
				if (req.body.officetype[0] === 'Offices') {
					query.push({
						Office_Type: {
							$nin: ['Hospital'],
						},
					});
				} else {
					query.push({
						Office_Type: {
							$in: req.body.officetype,
						},
					});
				}
			}
			if (req.body.tableofficetype) {
				let offRegex = req.body.tableofficetype.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Office_Type: {
						$in: offRegex,
					},
				});
			}

			if (req.body.hospitalName) {
				// let hosdRegex = req.body.hospitalName.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Hospital_Doctor: {
						$in: req.body.hospitalName,
					},
				});
			}
			if (req.body.tablehospitalName) {
				let hosdRegex = req.body.tablehospitalName.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Hospital_Doctor: {
						$in: hosdRegex,
					},
				});
			}
			if (req.body.webaddress) {
				// let webRegex = req.body.webaddress.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					WebAddress: {
						$in: req.body.webaddress,
					},
				});
			}
			if (req.body.tablewebaddress) {
				let webRegex = req.body.tablewebaddress.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					WebAddress: {
						$in: webRegex,
					},
				});
			}
			if (req.body.bedrange) {
				// let bedRegex = req.body.bedrange.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					BedsRange: {
						$in: req.body.bedrange,
					},
				});
			}
			if (req.body.tablebedrange) {
				let bedRegex = req.body.tablebedrange.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					BedsRange: {
						$in: bedRegex,
					},
				});
			}
			if (req.body.degree) {
				// let degRegex = req.body.degree.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					degree: {
						$in: req.body.degree,
					},
				});
			}
			if (req.body.tabledegree) {
				let degRegex = req.body.degree.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					degree: {
						$in: degRegex,
					},
				});
			}
			if (req.body.gender) {
				if (!plan.includes('Gender')) {
					return res.status(400).json('Gender is not in your plan.');
				}
				// let genderRegex = req.body.gender.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Gender: { $in: req.body.gender },
				});
			}
			if (req.body.type) {
				if (req.body.type[0] === '1') {
					if (!plan.includes('Executive & Physician Search')) {
						return res
							.status(400)
							.json('Executive Search is not in your plan.');
					}
				}
				if (req.body.type[0] === '0') {
					if (
						!plan.includes('Executive & Physician Search') &&
						!plan.includes('Physician Search Only')
					) {
						return res
							.status(400)
							.json('Physician Search is not in your plan.');
					}
				}
				query.push({
					Type: req.body.type[0],
				});
			}
			if (req.body.experience) {
				if (!plan.includes('Years of Experience')) {
					return res
						.status(400)
						.json('Years of Experience is not in your plan.');
				}

				var start = new Date();
				start.setFullYear(start.getFullYear() - req.body.experience[0][1]);
				var end = new Date();
				end.setFullYear(end.getFullYear() - req.body.experience[0][0]);
				query.push({ EnumerationDate: { $exists: true, $ne: '' } });
				query.push({
					$expr: {
						$cond: {
							if: {
								$and: [
									{
										$regexMatch: {
											input: '$EnumerationDate',
											regex: /^\d{2}-\d{2}-\d{4}$/, // Regular expression for YYYY-MM-DD format
										},
									},
									{
										$gte: [
											{ $dateFromString: { dateString: '$EnumerationDate' } },
											start,
										],
									},
									{
										$lt: [
											{ $dateFromString: { dateString: '$EnumerationDate' } },
											end,
										],
									},
								],
							},
							then: true, // If the string represents a valid date format, proceed with comparison
							else: false, // Otherwise, skip document
						},
					},
				});
			}

			let totalCount;

			let leads;

			let exclusion_leads_emails = [];

			if (person.role === 'COMPANY') {
				// for (let i = 0; i < person.exclusions.length; i++) {
				// 	for (let j = 0; j < person.exclusions[i].leads.length; j++) {
				// 		exclusion_leads_emails.push(
				// 			person.exclusions[i].leads[j].EmailAddress
				// 		);
				// 	}
				// }

				if (query.length) {
					totalCount = await Leads.countDocuments({
						$and: [
							//{ _id: { $nin: person.leads } },
							//{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
							{
								$and: query,
							},
						],
					}).lean(true);
					const a = await Leads.createIndexes({ type: 1 });
				} else {
					totalCount = await Leads.countDocuments({
						$and: [
							//{ _id: { $nin: person.leads } },
							//{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
						],
					});
				}
			} else if (person.role === 'MEMBER') {
				// for (let i = 0; i < person.company_id.exclusions.length; i++) {
				// 	for (
				// 		let j = 0;
				// 		j < person.company_id.exclusions[i].leads.length;
				// 		j++
				// 	) {
				// 		exclusion_leads_emails.push(
				// 			person.company_id.exclusions[i].leads[j].EmailAddress
				// 		);
				// 	}
				// }

				if (query.length) {
					totalCount = await Leads.countDocuments({
						$and: [
							//{ _id: { $nin: person.company_id.leads } },
							//{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
							{
								$and: query,
							},
						],
					});
				} else {
					totalCount = await Leads.countDocuments({
						$and: [
							//{ _id: { $nin: person.company_id.leads } },
							//{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
						],
					});
				}
			} else if (person.role === 'ADMIN' || person.role === 'SUB_ADMIN') {
				if (query.length) {
					totalCount = await Leads.countDocuments({
						$and: [
							// { _id: { $nin: person.company_id.leads } },
							// { EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
							{
								$and: query,
							},
						],
					});
				} else {
					totalCount = await Leads.countDocuments({
						$and: [
							// { _id: { $nin: person.company_id.leads } },
							// { EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
						],
					});
				}
			} else {
				return res.status(400).json('Role not found!');
			}

			return res.json({ count: totalCount });
		} catch (error) {
			console.log(error);
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			return res.status(400).json({ error: error.message });
		}
	}
);

router.post(
	'/leadColumnAvailableStats',
	[authorize.verifyToken, authorize.checkUnpaidInvoice, subscription_validater],

	async (req, res) => {
		try {
			let query = [];
			const person =
				(await Companies.findById(req.user.id)
					.populate('exclusions')
					.populate('plan')) ||
				(await Members.findById(req.user.id)
					.populate({
						path: 'company_id',
						populate: { path: 'exclusions' },
					})
					.populate({
						path: 'company_id',
						populate: { path: 'plan' },
					})) ||
				(await Admin.findById(req.user.id)) ||
				(await Subadmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			let plan = [];
			if (person.role === 'COMPANY') {
				if (person.plan.subscription_type === 'Free Trial') {
					const findPlan = await Subscription.findOne({
						title: 'Growth',
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				} else {
					const findPlan = await Subscription.findOne({
						title: person.plan.subscription_type,
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				}
			}
			if (person.role === 'MEMBER') {
				if (person.company_id.plan.subscription_type === 'Free Trial') {
					const findPlan = await Subscription.findOne({
						title: 'Growth',
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				} else {
					const findPlan = await Subscription.findOne({
						title: person.company_id.plan.subscription_type,
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				}
			}
			if (person.role === 'ADMIN' || person.role === 'SUB_ADMIN') {
				const findPlan = await Subscription.findOne({
					title: 'Growth',
				}).populate('features');
				if (!findPlan) {
					return res.status(200).json('Buy a plan for using the services');
				}
				for (const rev of findPlan.features) {
					plan.push(rev.description);
				}
			}

			if (req.body.contact_name) {
				query.push({
					$or: [
						{
							FirstName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
						{
							LastName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
						{
							MiddleName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
					],
				});
			}
			if (req.body.title) {
				// let titleRegex = req.body.title.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Title: {
						$in: req.body.title,
					},
				});
			}
			if (req.body.tabletitle) {
				let titleRegex = req.body.tabletitle.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Title: {
						$in: titleRegex,
					},
				});
			}
			if (req.body.levelID) {
				// let levelRegex = req.body.levelID.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					LevelID: {
						$in: req.body.levelID,
					},
				});
			}
			if (req.body.geographic) {
				// let geoRegex = req.body.geographic.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Geographic_Classification: {
						$in: req.body.geographic,
					},
				});
			}
			if (req.body.emailtype) {
				if (req.body.emailtype[0] === 'Personal Email') {
					query.push({
						ISP: 'Yes',
					});
				} else if (req.body.emailtype[0] === 'B2B') {
					query.push({
						ISP: 'No',
					});
				}
			}
			if (req.body.hospitalType) {
				// let hosRegex = req.body.hospitalType.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					HospitalType: {
						$in: req.body.hospitalType,
					},
				});
			}
			if (req.body.tablehospitalType) {
				let hosRegex = req.body.tablehospitalType.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					HospitalType: {
						$in: hosRegex,
					},
				});
			}
			if (req.body.firmType) {
				// let firmRegex = req.body.firmType.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					FirmType: {
						$in: req.body.firmType,
					},
				});
			}
			if (req.body.tablefirmType) {
				let firmRegex = req.body.tablefirmType.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					FirmType: {
						$in: firmRegex,
					},
				});
			}
			if (req.body.ownership) {
				// let ownRegex = req.body.ownership.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Ownership: {
						$in: req.body.ownership,
					},
				});
			}
			if (req.body.tableownership) {
				let ownRegex = req.body.tableownership.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Ownership: {
						$in: ownRegex,
					},
				});
			}
			if (req.body.address) {
				query.push({
					$or: [
						{ Address1: { $regex: req.body.address[0], $options: 'i' } },
						{ Address2: { $regex: req.body.address[0], $options: 'i' } },
					],
				});
			}
			if (req.body.country) {
				// let countryRegex = req.body.country.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Country: {
						$in: req.body.country,
					},
				});
			}
			if (req.body.city) {
				// let cityRegex = req.body.city.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					City: {
						$in: req.body.city,
					},
				});
			}
			if (req.body.tablecity) {
				let cityRegex = req.body.tablecity.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					City: {
						$in: cityRegex,
					},
				});
			}
			if (req.body.zipcode) {
				// let codeRegex = req.body.zipcode.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					ZIPCode: {
						$in: req.body.zipcode,
					},
				});
			}
			if (req.body.state) {
				// let stateRegex = req.body.state.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					State: {
						$in: req.body.state,
					},
				});
			}
			if (req.body.tablestate) {
				let stateRegex = req.body.tablestate.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					State: {
						$in: stateRegex,
					},
				});
			}
			if (req.body.speciality) {
				// let specRegex = req.body.speciality.map(function (e) {
				// 	e = e.split('(');
				// 	return new RegExp(e[0], 'i');
				// });
				query.push({
					Specialty: {
						$in: req.body.speciality,
					},
				});
			}
			if (req.body.tablespeciality) {
				let specRegex = req.body.tablespeciality.map(function (e) {
					e = e.split('(');
					return new RegExp(e[0], 'i');
				});
				query.push({
					Specialty: {
						$in: specRegex,
					},
				});
			}
			if (req.body.specialityType) {
				// let specTypeRegex = req.body.specialityType.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					SpecialtyType: {
						$in: req.body.specialityType,
					},
				});
			}
			if (req.body.tablespecialityType) {
				let specTypeRegex = req.body.tablespecialityType.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					SpecialtyType: {
						$in: specTypeRegex,
					},
				});
			}
			if (req.body.specialityGroup) {
				// let specGroupRegex = req.body.specialityGroup.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					SpecialtyGroup1: {
						$in: req.body.specialityGroup,
					},
				});
			}
			if (req.body.tablespecialityGroup) {
				let specGroupRegex = req.body.tablespecialityGroup.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					SpecialtyGroup1: {
						$in: specGroupRegex,
					},
				});
			}
			if (req.body.licenseState) {
				if (!plan.includes('State License Code')) {
					return res
						.status(400)
						.json('License State Search is not in your plan.');
				}
				// let licRegex = req.body.licenseState.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					LicenseIssueState: {
						$in: req.body.licenseState,
					},
				});
			}
			if (req.body.npi) {
				if (!plan.includes('NPI Number Upload')) {
					return res.status(400).json('NPI Number Upload is not in your plan.');
				}
				// let npiRegex = req.body.npi.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					NPINumber: {
						$in: req.body.npi,
					},
				});
			}
			if (req.body.tablenpi) {
				if (!plan.includes('NPI Number Upload')) {
					return res.status(400).json('NPI Number Upload is not in your plan.');
				}
				let npiRegex = req.body.tablenpi.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					NPINumber: {
						$in: npiRegex,
					},
				});
			}
			if (req.body.department) {
				// let depRegex = req.body.department.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Department: {
						$in: req.body.department,
					},
				});
			}
			if (req.body.tabledepartment) {
				let depRegex = req.body.tabledepartment.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Department: {
						$in: depRegex,
					},
				});
			}
			if (req.body.officetype) {
				if (req.body.officetype[0] === 'Offices') {
					query.push({
						Office_Type: {
							$nin: ['Hospital'],
						},
					});
				} else {
					query.push({
						Office_Type: {
							$in: req.body.officetype,
						},
					});
				}
			}
			if (req.body.tableofficetype) {
				let offRegex = req.body.tableofficetype.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Office_Type: {
						$in: offRegex,
					},
				});
			}
			if (req.body.hospitalName) {
				// let hosdRegex = req.body.hospitalName.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Hospital_Doctor: {
						$in: req.body.hospitalName,
					},
				});
			}
			if (req.body.tablehospitalName) {
				let hosdRegex = req.body.tablehospitalName.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Hospital_Doctor: {
						$in: hosdRegex,
					},
				});
			}
			if (req.body.webaddress) {
				// let webRegex = req.body.webaddress.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					WebAddress: {
						$in: req.body.webaddress,
					},
				});
			}
			if (req.body.tablewebaddress) {
				let webRegex = req.body.tablewebaddress.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					WebAddress: {
						$in: webRegex,
					},
				});
			}
			if (req.body.bedrange) {
				// let bedRegex = req.body.bedrange.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					BedsRange: {
						$in: req.body.bedrange,
					},
				});
			}
			if (req.body.tablebedrange) {
				let bedRegex = req.body.tablebedrange.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					BedsRange: {
						$in: bedRegex,
					},
				});
			}
			if (req.body.degree) {
				// let degRegex = req.body.degree.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					degree: {
						$in: req.body.degree,
					},
				});
			}
			if (req.body.tabledegree) {
				let degRegex = req.body.degree.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					degree: {
						$in: degRegex,
					},
				});
			}
			if (req.body.gender) {
				if (!plan.includes('Gender')) {
					return res.status(400).json('Gender is not in your plan.');
				}
				// let genderRegex = req.body.gender.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Gender: { $in: req.body.gender },
				});
			}
			if (req.body.type) {
				if (req.body.type[0] === '1') {
					if (!plan.includes('Executive & Physician Search')) {
						return res
							.status(400)
							.json('Executive Search is not in your plan.');
					}
				}
				if (req.body.type[0] === '0') {
					if (
						!plan.includes('Executive & Physician Search') &&
						!plan.includes('Physician Search Only')
					) {
						return res
							.status(400)
							.json('Physician Search is not in your plan.');
					}
				}
				query.push({
					Type: req.body.type[0],
				});
			}
			if (req.body.experience) {
				if (!plan.includes('Years of Experience')) {
					return res
						.status(400)
						.json('Years of Experience is not in your plan.');
				}

				var start = new Date();
				start.setFullYear(start.getFullYear() - req.body.experience[0][1]);
				var end = new Date();
				end.setFullYear(end.getFullYear() - req.body.experience[0][0]);
				query.push({ EnumerationDate: { $exists: true, $ne: '' } });
				query.push({
					$expr: {
						$cond: {
							if: {
								$and: [
									{
										$regexMatch: {
											input: '$EnumerationDate',
											regex: /^\d{2}-\d{2}-\d{4}$/, // Regular expression for YYYY-MM-DD format
										},
									},
									{
										$gte: [
											{ $dateFromString: { dateString: '$EnumerationDate' } },
											start,
										],
									},
									{
										$lt: [
											{ $dateFromString: { dateString: '$EnumerationDate' } },
											end,
										],
									},
								],
							},
							then: true, // If the string represents a valid date format, proceed with comparison
							else: false, // Otherwise, skip document
						},
					},
				});
			}

			let totalCount;

			let leads;

			let exclusion_leads_emails = [];

			if (person.role === 'COMPANY') {
				// for (let i = 0; i < person.exclusions.length; i++) {
				// 	for (let j = 0; j < person.exclusions[i].leads.length; j++) {
				// 		exclusion_leads_emails.push(
				// 			person.exclusions[i].leads[j].EmailAddress
				// 		);
				// 	}
				// }

				if (query.length) {
					totalCount = await Leads.countDocuments({
						$and: [
							{ _id: { $nin: person.leads } },
							//{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
							{
								$and: query,
							},
						],
					}).lean(true);
					//const a = await Leads.createIndexes({ type: 1 });
				} else {
					totalCount = await Leads.countDocuments({
						$and: [
							{ _id: { $nin: person.leads } },
							//{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
						],
					});
				}
			} else if (person.role === 'MEMBER') {
				// for (let i = 0; i < person.company_id.exclusions.length; i++) {
				// 	for (
				// 		let j = 0;
				// 		j < person.company_id.exclusions[i].leads.length;
				// 		j++
				// 	) {
				// 		exclusion_leads_emails.push(
				// 			person.company_id.exclusions[i].leads[j].EmailAddress
				// 		);
				// 	}
				// }

				if (query.length) {
					totalCount = await Leads.countDocuments({
						$and: [
							{ _id: { $nin: person.company_id.leads } },
							//{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
							{
								$and: query,
							},
						],
					});
				} else {
					totalCount = await Leads.countDocuments({
						$and: [
							{ _id: { $nin: person.company_id.leads } },
							//{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
						],
					});
				}
			} else if (person.role === 'ADMIN' || person.role === 'SUB_ADMIN') {
				// for (let i = 0; i < person.company_id.exclusions.length; i++) {
				// 	for (
				// 		let j = 0;
				// 		j < person.company_id.exclusions[i].leads.length;
				// 		j++
				// 	) {
				// 		exclusion_leads_emails.push(
				// 			person.company_id.exclusions[i].leads[j].EmailAddress
				// 		);
				// 	}
				// }

				if (query.length) {
					totalCount = await Leads.countDocuments({
						$and: [
							{ _id: { $nin: person.leads } },
							// { EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
							{
								$and: query,
							},
						],
					});
				} else {
					totalCount = await Leads.countDocuments({
						$and: [
							{ _id: { $nin: person.leads } },
							// { EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
						],
					});
				}
			} else {
				return res.status(400).json('Role not found!');
			}

			return res.json({ count: totalCount });
		} catch (error) {
			console.log(error);
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			return res.status(400).json({ error: error.message });
		}
	}
);

router.post(
	'/leadColumnFilter',
	[
		authorize.verifyToken,
		// authorize.accessCompanyAndMember,
		authorize.checkUnpaidInvoice,
		subscription_validater,
	],

	async (req, res) => {
		try {
			let query = [];
			let sorting = { MasterID: -1 };
			console.log('start', new Date().getSeconds());
			const person =
				(await Companies.findById(req.user.id)
					.populate('exclusions')
					.populate('plan')) ||
				(await Members.findById(req.user.id)
					.populate({
						path: 'company_id',
						populate: { path: 'exclusions' },
					})
					.populate({
						path: 'company_id',
						populate: { path: 'plan' },
					})) ||
				(await Admin.findById(req.user.id)) ||
				(await Subadmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			let plan = [];
			if (person.role === 'COMPANY') {
				if (person.plan.subscription_type === 'Free Trial') {
					const findPlan = await Subscription.findOne({
						title: 'Growth',
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				} else {
					const findPlan = await Subscription.findOne({
						title: person.plan.subscription_type,
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				}
			}
			if (person.role === 'MEMBER') {
				if (person.company_id.plan.subscription_type === 'Free Trial') {
					const findPlan = await Subscription.findOne({
						title: 'Growth',
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				} else {
					const findPlan = await Subscription.findOne({
						title: person.company_id.plan.subscription_type,
					}).populate('features');
					if (!findPlan) {
						return res.status(200).json('Buy a plan for using the services');
					}
					for (const rev of findPlan.features) {
						plan.push(rev.description);
					}
				}
			}
			if (person.role === 'ADMIN' || person.role === 'SUB_ADMIN') {
				const findPlan = await Subscription.findOne({
					title: 'Growth',
				}).populate('features');
				if (!findPlan) {
					return res.status(200).json('Buy a plan for using the services');
				}
				for (const rev of findPlan.features) {
					plan.push(rev.description);
				}
			}

			if (req.body.contact_name) {
				query.push({
					$or: [
						{
							FullName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
						{
							FirstName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
						{
							LastName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
						{
							MiddleName: {
								$regex: req.body.contact_name[0],
								$options: 'i',
							},
						},
					],
				});
			}
			if (req.body.contact_name_sort) {
				//sorting['FirstName'] = Number(req.body.contact_name_sort);
				sorting = { FullName: Number(req.body.contact_name_sort) };
			}
			if (req.body.title) {
				// let titleRegex = req.body.title.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Title: {
						$in: req.body.title,
					},
				});
			}
			if (req.body.tabletitle) {
				let titleRegex = req.body.tabletitle.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Title: {
						$in: titleRegex,
					},
				});
			}
			if (req.body.title_sort) {
				//sorting['Title'] = Number(req.body.title_sort);
				sorting = { Title: Number(req.body.title_sort) };
			}
			if (req.body.levelID) {
				// let levelRegex = req.body.levelID.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					LevelID: {
						$in: req.body.levelID,
					},
				});
			}
			if (req.body.levelID_sort) {
				//sorting['LevelID'] = Number(req.body.levelID_sort);
				sorting = { LevelID: Number(req.body.levelID_sort) };
			}
			if (req.body.geographic) {
				// let geoRegex = req.body.geographic.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Geographic_Classification: {
						$in: req.body.geographic,
					},
				});
			}
			if (req.body.geographic_sort) {
				//sorting['Geographic_Classification'] = Number(req.body.geographic_sort);
				sorting = {
					Geographic_Classification: Number(req.body.geographic_sort),
				};
			}
			if (req.body.emailtype) {
				if (req.body.emailtype[0] === 'Personal Email') {
					query.push({
						ISP: 'Yes',
					});
				} else if (req.body.emailtype[0] === 'B2B') {
					query.push({
						ISP: 'No',
					});
				}
			}
			if (req.body.hospitalType) {
				// let hosRegex = req.body.hospitalType.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					HospitalType: {
						$in: req.body.hospitalType,
					},
				});
			}
			if (req.body.tablehospitalType) {
				let hosRegex = req.body.tablehospitalType.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					HospitalType: {
						$in: hosRegex,
					},
				});
			}
			if (req.body.hospitalType_sort) {
				//sorting['HospitalType'] = Number(req.body.hospitalType_sort);
				sorting = { HospitalType: Number(req.body.hospitalType_sort) };
			}
			if (req.body.firmType) {
				// let firmRegex = req.body.firmType.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					FirmType: {
						$in: req.body.firmType,
					},
				});
			}
			if (req.body.tablefirmType) {
				let firmRegex = req.body.tablefirmType.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					FirmType: {
						$in: firmRegex,
					},
				});
			}
			if (req.body.firmType_sort) {
				//sorting['FirmType'] = Number(req.body.firmType_sort);
				sorting = { FirmType: Number(req.body.firmType_sort) };
			}
			if (req.body.ownership) {
				// let ownRegex = req.body.ownership.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Ownership: {
						$in: req.body.ownership,
					},
				});
			}
			if (req.body.tableownership) {
				let ownRegex = req.body.tableownership.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Ownership: {
						$in: ownRegex,
					},
				});
			}
			if (req.body.ownership_sort) {
				//sorting['Ownership'] = Number(req.body.ownership_sort);
				sorting = { Ownership: Number(req.body.ownership_sort) };
			}
			if (req.body.address) {
				query.push({
					$or: [
						{ Address1: { $regex: req.body.address[0], $options: 'i' } },
						{ Address2: { $regex: req.body.address[0], $options: 'i' } },
					],
				});
			}
			if (req.body.address_sort) {
				//sorting['Address1'] = Number(req.body.address_sort);
				sorting = { Address1: Number(req.body.address_sort) };
			}
			if (req.body.country) {
				// let countryRegex = req.body.country.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Country: {
						$in: req.body.country,
					},
				});
			}
			if (req.body.country_sort) {
				//sorting['Country'] = Number(req.body.country_sort);
				sorting = { Country: Number(req.body.country_sort) };
			}
			if (req.body.city) {
				// let cityRegex = req.body.city.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					City: {
						$in: req.body.city,
					},
				});
			}
			if (req.body.tablecity) {
				let cityRegex = req.body.tablecity.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					City: {
						$in: cityRegex,
					},
				});
			}
			if (req.body.city_sort) {
				//sorting['City'] = Number(req.body.city_sort);
				sorting = { City: Number(req.body.city_sort) };
			}
			if (req.body.zipcode) {
				// let codeRegex = req.body.zipcode.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					ZIPCode: {
						$in: req.body.zipcode,
					},
				});
			}
			if (req.body.zipcode_sort) {
				//sorting['ZIPCode'] = Number(req.body.zipcode_sort);
				sorting = { ZIPCode: Number(req.body.zipcode_sort) };
			}
			if (req.body.state) {
				// let stateRegex = req.body.state.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					State: {
						$in: req.body.state,
					},
				});
			}
			if (req.body.tablestate) {
				let stateRegex = req.body.tablestate.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					State: {
						$in: stateRegex,
					},
				});
			}
			if (req.body.state_sort) {
				//sorting['State'] = Number(req.body.state_sort);
				sorting = { State: Number(req.body.state_sort) };
			}
			if (req.body.speciality) {
				// let specRegex = req.body.speciality.map(function (e) {
				// 	e = e.split('(');
				// 	return new RegExp(e[0], 'i');
				// });
				query.push({
					Specialty: {
						$in: req.body.speciality,
					},
				});
			}
			if (req.body.tablespeciality) {
				let specRegex = req.body.tablespeciality.map(function (e) {
					e = e.split('(');
					return new RegExp(e[0], 'i');
				});
				query.push({
					Specialty: {
						$in: specRegex,
					},
				});
			}
			if (req.body.specialty_sort) {
				//sorting['Specialty'] = Number(req.body.specialty_sort);
				sorting = { Specialty: Number(req.body.specialty_sort) };
			}
			if (req.body.specialityType) {
				// let specTypeRegex = req.body.specialityType.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					SpecialtyType: {
						$in: req.body.specialityType,
					},
				});
			}
			if (req.body.tablespecialityType) {
				let specTypeRegex = req.body.tablespecialityType.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					SpecialtyType: {
						$in: specTypeRegex,
					},
				});
			}
			if (req.body.specialityType_sort) {
				//sorting['SpecialtyType'] = Number(req.body.specialityType_sort);
				sorting = { SpecialtyType: Number(req.body.specialityType_sort) };
			}
			if (req.body.specialityGroup) {
				// let specGroupRegex = req.body.specialityGroup.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					SpecialtyGroup1: {
						$in: req.body.specialityGroup,
					},
				});
			}
			if (req.body.tablespecialityGroup) {
				let specGroupRegex = req.body.tablespecialityGroup.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					SpecialtyGroup1: {
						$in: specGroupRegex,
					},
				});
			}
			if (req.body.specialityGroup_sort) {
				//sorting['SpecialtyGroup1'] = Number(req.body.specialityGroup_sort);
				sorting = { SpecialtyGroup1: Number(req.body.specialityGroup_sort) };
			}
			if (req.body.licenseState) {
				if (!plan.includes('State License Code')) {
					return res
						.status(400)
						.json('License State Search is not in your plan.');
				}
				// let licRegex = req.body.licenseState.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					LicenseIssueState: {
						$in: req.body.licenseState,
					},
				});
			}
			if (req.body.licenseState_sort) {
				//sorting['LicenseIssueState'] = Number(req.body.licenseState_sort);
				sorting = { LicenseIssueState: Number(req.body.licenseState_sort) };
			}
			if (req.body.npi) {
				if (!plan.includes('NPI Number Upload')) {
					return res.status(400).json('NPI Number Upload is not in your plan.');
				}
				// let npiRegex = req.body.npi.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					NPINumber: {
						$in: req.body.npi,
					},
				});
			}
			if (req.body.tablenpi) {
				if (!plan.includes('NPI Number Upload')) {
					return res.status(400).json('NPI Number Upload is not in your plan.');
				}
				let npiRegex = req.body.tablenpi.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					NPINumber: {
						$in: npiRegex,
					},
				});
			}
			if (req.body.npi_sort) {
				//sorting['NPINumber'] = Number(req.body.npi_sort);
				sorting = { NPINumber: Number(req.body.npi_sort) };
			}
			if (req.body.department) {
				// let depRegex = req.body.department.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Department: {
						$in: req.body.department,
					},
				});
			}
			if (req.body.tabledepartment) {
				let depRegex = req.body.tabledepartment.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Department: {
						$in: depRegex,
					},
				});
			}
			if (req.body.department_sort) {
				//sorting['Department'] = Number(req.body.department_sort);
				sorting = { Department: Number(req.body.department_sort) };
			}
			if (req.body.officetype) {
				if (req.body.officetype[0] === 'Offices') {
					query.push({
						Office_Type: {
							$nin: ['Hospital'],
						},
					});
				} else {
					query.push({
						Office_Type: {
							$in: req.body.officetype,
						},
					});
				}
			}
			if (req.body.tableofficetype) {
				let offRegex = req.body.tableofficetype.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Office_Type: {
						$in: offRegex,
					},
				});
			}
			if (req.body.officetype_sort) {
				//sorting['Office_Type'] = Number(req.body.officetype_sort);
				sorting = { Office_Type: Number(req.body.officetype_sort) };
			}
			if (req.body.hospitalName) {
				// let hosdRegex = req.body.hospitalName.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Hospital_Doctor: {
						$in: req.body.hospitalName,
					},
				});
			}
			if (req.body.tablehospitalName) {
				let hosdRegex = req.body.tablehospitalName.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					Hospital_Doctor: {
						$in: hosdRegex,
					},
				});
			}
			if (req.body.hospitalName_sort) {
				//sorting['Hospital_Doctor'] = Number(req.body.hospitalName_sort);
				sorting = { Hospital_Doctor: Number(req.body.hospitalName_sort) };
			}
			if (req.body.webaddress) {
				// let webRegex = req.body.webaddress.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					WebAddress: {
						$in: req.body.webaddress,
					},
				});
			}
			if (req.body.tablewebaddress) {
				let webRegex = req.body.tablewebaddress.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					WebAddress: {
						$in: webRegex,
					},
				});
			}
			if (req.body.webaddress_sort) {
				//sorting['WebAddress'] = Number(req.body.webaddress_sort);
				sorting = { WebAddress: Number(req.body.webaddress_sort) };
			}
			if (req.body.bedrange) {
				// let bedRegex = req.body.bedrange.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					BedsRange: {
						$in: req.body.bedrange,
					},
				});
			}
			if (req.body.tablebedrange) {
				let bedRegex = req.body.tablebedrange.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					BedsRange: {
						$in: bedRegex,
					},
				});
			}
			if (req.body.bedrange_sort) {
				//sorting['BedsRange'] = Number(req.body.bedrange_sort);
				sorting = { BedsRange: Number(req.body.bedrange_sort) };
			}
			if (req.body.degree) {
				// let degRegex = req.body.degree.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					degree: {
						$in: req.body.degree,
					},
				});
			}
			if (req.body.tabledegree) {
				let degRegex = req.body.degree.map(function (e) {
					return new RegExp(e, 'i');
				});
				query.push({
					degree: {
						$in: degRegex,
					},
				});
			}
			if (req.body.degree_sort) {
				//sorting['degree'] = Number(req.body.degree_sort);
				sorting = { degree: Number(req.body.degree_sort) };
			}
			if (req.body.gender) {
				if (!plan.includes('Gender')) {
					return res.status(400).json('Gender is not in your plan.');
				}
				// let genderRegex = req.body.gender.map(function (e) {
				// 	return new RegExp(e, 'i');
				// });
				query.push({
					Gender: { $in: req.body.gender },
				});
			}
			if (req.body.gender_sort) {
				//sorting['Gender'] = Number(req.body.gender_sort);
				sorting = { Gender: Number(req.body.gender_sort) };
			}
			if (req.body.type) {
				if (req.body.type[0] === '1') {
					if (!plan.includes('Executive & Physician Search')) {
						return res
							.status(400)
							.json('Executive Search is not in your plan.');
					}
				}
				if (req.body.type[0] === '0') {
					if (
						!plan.includes('Executive & Physician Search') &&
						!plan.includes('Physician Search Only')
					) {
						return res
							.status(400)
							.json('Physician Search is not in your plan.');
					}
				}
				query.push({
					Type: req.body.type[0],
				});
			}
			if (req.body.experience) {
				if (!plan.includes('Years of Experience')) {
					return res
						.status(400)
						.json('Years of Experience is not in your plan.');
				}

				var start = new Date();
				start.setFullYear(start.getFullYear() - req.body.experience[0][1]);
				var end = new Date();
				end.setFullYear(end.getFullYear() - req.body.experience[0][0]);
				query.push({ EnumerationDate: { $exists: true, $ne: '' } });
				query.push({
					$expr: {
						$cond: {
							if: {
								$and: [
									{
										$regexMatch: {
											input: '$EnumerationDate',
											regex: /^\d{2}-\d{2}-\d{4}$/, // Regular expression for YYYY-MM-DD format
										},
									},
									{
										$gte: [
											{ $dateFromString: { dateString: '$EnumerationDate' } },
											start,
										],
									},
									{
										$lt: [
											{ $dateFromString: { dateString: '$EnumerationDate' } },
											end,
										],
									},
								],
							},
							then: true, // If the string represents a valid date format, proceed with comparison
							else: false, // Otherwise, skip document
						},
					},
				});
			}
			if (req.body.experience_sort) {
				//sorting['EnumerationDate'] = Number(req.body.experience_sort);
				sorting = { EnumerationDate: Number(req.body.experience_sort) };
			}
			// const file = req.file;
			// if (file) {
			// 	const JSONArray = await csvtojson().fromString(
			// 		req.file.buffer.toString()
			// 	);
			// 	var npi = [];
			// 	JSONArray.forEach((e) => {
			// 		npi.push(e.npi);
			// 	});

			// }
			//LicenseIssueState
			//NPINumber
			//EnumerationDate

			let totalCount;

			let leads;

			let exclusion_leads_emails = [];

			if (person.role === 'COMPANY') {
				exclusion_leads_emails = person.exclusions.flatMap((exclusion) =>
					exclusion.leads.map((lead) => lead.EmailAddress)
				);

				if (query.length) {
					//const a = await Leads.createIndexes({ type: 1 });
					leads = await Leads.find({
						$and: [
							{ _id: { $nin: person.leads } },
							{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
							{ EmailAddress: { $nin: ['', 'NULL'] } },
							{
								$and: query,
							},
						],
					})
						.sort(sorting)
						.skip((req.body.page - 1) * req.body.limit)
						.limit(req.body.limit)
						.lean();

					if (leads.length < 25) {
						leads = await Leads.find({
							$and: [
								{ _id: { $nin: person.leads } },
								{ EmailAddress: { $nin: exclusion_leads_emails } },
								{ updatestatus: { $ne: 'ascii' } },
								{
									$and: query,
								},
							],
						})
							.sort(sorting)
							.skip((req.body.page - 1) * req.body.limit)
							.limit(req.body.limit)
							.lean();
					}
				} else {
					leads = await Leads.find({
						$and: [
							{ _id: { $nin: person.company_id.leads } },
							{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
						],
					})
						.sort(sorting)
						.skip((req.body.page - 1) * req.body.limit)
						.limit(req.body.limit)
						.lean();
				}
			} else if (person.role === 'MEMBER') {
				for (let i = 0; i < person.company_id.exclusions.length; i++) {
					for (
						let j = 0;
						j < person.company_id.exclusions[i].leads.length;
						j++
					) {
						exclusion_leads_emails.push(
							person.company_id.exclusions[i].leads[j].EmailAddress
						);
					}
				}

				if (query.length) {
					leads = await Leads.find({
						$and: [
							{ _id: { $nin: person.company_id.leads } },
							{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
							{
								$and: query,
							},
						],
					})
						.sort(sorting)
						.skip((req.body.page - 1) * req.body.limit)
						.limit(req.body.limit)
						.lean();
				} else {
					leads = await Leads.find({
						$and: [
							{ _id: { $nin: person.company_id.leads } },
							{ EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
						],
					})
						.sort(sorting)
						.skip((req.body.page - 1) * req.body.limit)
						.limit(req.body.limit)
						.lean();
				}
			} else if (person.role === 'ADMIN' || person.role === 'SUB_ADMIN') {
				// for (let i = 0; i < person.company_id.exclusions.length; i++) {
				// 	for (
				// 		let j = 0;
				// 		j < person.company_id.exclusions[i].leads.length;
				// 		j++
				// 	) {
				// 		exclusion_leads_emails.push(
				// 			person.company_id.exclusions[i].leads[j].EmailAddress
				// 		);
				// 	}
				// }

				if (query.length) {
					leads = await Leads.find({
						$and: [
							//{ _id: { $nin: person.leads } },
							{ EmailAddress: { $nin: ['', 'NULL'] } },
							{ updatestatus: { $ne: 'ascii' } },
							{
								$and: query,
							},
						],
					})
						.sort(sorting)
						.skip((req.body.page - 1) * req.body.limit)
						.limit(req.body.limit)
						.lean();
					if (leads.length < 25) {
						leads = await Leads.find({
							$and: [
								{ updatestatus: { $ne: 'ascii' } },
								{
									$and: query,
								},
							],
						})
							.sort(sorting)
							.skip((req.body.page - 1) * req.body.limit)
							.limit(req.body.limit)
							.lean();
					}
				} else {
					leads = await Leads.find({
						$and: [
							// { _id: { $nin: person.company_id.leads } },
							// { EmailAddress: { $nin: exclusion_leads_emails } },
							{ updatestatus: { $ne: 'ascii' } },
						],
					})
						.sort(sorting)
						.skip((req.body.page - 1) * req.body.limit)
						.limit(req.body.limit)
						.lean();
				}
			} else {
				return res.status(400).json('Role not found!');
			}

			if (person.role === 'COMPANY') {
				await Activities.create({
					company: person._id,
					heading: 'Contact Search',
					message: `You have searched the leads!`,
					query: JSON.stringify(req.body),
				});
			} else if (person.role === 'MEMBER') {
				await MemberActivities.create({
					member: person._id,
					company: person.company_id._id,
					heading: 'Contact Search',
					message: `You have searched the leads!`,
					query: JSON.stringify(req.body),
				});
			} else if (person.role === 'ADMIN') {
				await AdminActivities.create({
					person: person._id,
					role: 'ADMIN',
					heading: 'Contact Search',
					message: `You have searched the leads!`,
					query: JSON.stringify(req.body),
				});
			} else if (person.role === 'SUB_ADMIN') {
				await AdminActivities.create({
					person: person._id,
					role: 'SUB_ADMIN',
					heading: 'Contact Search',
					message: `You have searched the leads!`,
					query: JSON.stringify(req.body),
				});
			}

			const encryptedData = CryptoJS.AES.encrypt(
				JSON.stringify(leads),
				'docdbisky987'
			).toString();

			console.log('end', new Date().getSeconds());
			return res.json({ encryptedData });
		} catch (error) {
			console.log(error);
			dashLogger.error(
				`Error : ${error}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			return res.status(400).json({ error: error.message });
		}
	}
);

router.post('/captcha', captchaVerifier, async (req, res) => {
	try {
		return res.status(200).json({ message: 'Verified' });
	} catch (error) {
		return res.status(400).json({ error: error.message });
	}
});

router.get(
	'/getMyLeads',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id).populate('leads')) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
					populate: { path: 'leads' },
				})) ||
				(await Admin.findById(req.user.id).populate('leads')) ||
				(await Subadmin.findById(req.user.id).populate('leads'));
			if (!person) return res.status(400).json('Account not found!');

			let leads;
			let leads_count;

			if (req.query.type === '0') {
				if (person.role === 'COMPANY') {
					leads = person.leads.filter((e) => e.Type === '0');
					leads_count = leads.length;
				} else if (person.role === 'MEMBER') {
					leads = person.company_id.leads.filter((e) => e.Type === '0');
					leads_count = leads.length;
				} else if (person.role === 'ADMIN') {
					leads = person.leads.filter((e) => e.Type === '0');
					leads_count = leads.length;
				} else if (person.role === 'SUB_ADMIN') {
					leads = person.leads.filter((e) => e.Type === '0');
					leads_count = leads.length;
				} else {
					return res.status(400).json('Role not found!');
				}
			} else {
				if (person.role === 'COMPANY') {
					leads = person.leads.filter((e) => e.Type === '1');
					leads_count = leads.length;
				} else if (person.role === 'MEMBER') {
					leads = person.company_id.leads.filter((e) => e.Type === '1');
					leads_count = leads.length;
				} else if (person.role === 'ADMIN') {
					leads = person.leads.filter((e) => e.Type === '1');
					leads_count = leads.length;
				} else if (person.role === 'SUB_ADMIN') {
					leads = person.leads.filter((e) => e.Type === '1');
					leads_count = leads.length;
				} else {
					return res.status(400).json('Role not found!');
				}
			}

			return res.json(leads);
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			return res.status(400).json({ error: error.message });
		}
	}
);

router.post(
	'/unlock/:type',
	[
		authorize.verifyToken,
		// authorize.accessCompanyAndMember,
		subscription_validater,
		authorize.checkUnpaidInvoice,
	],
	async (req, res) => {
		try {
			const person =
				(await Admin.findById(req.user.id)) ||
				(await Subadmin.findById(req.user.id)) ||
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id'));
			if (!person) return res.status(400).json('Account not found!');

			let leads_ids = req.body.leads_ids;

			let verifyAll = false;
			if (req.params) {
				verifyAll = req.params.type === 'phone' ? false : true;
			}

			let unlocklead = [];
			let leads = [];
			let isContinue = true;

			for (let i = 0; i < leads_ids.length; i++) {
				const isLeadPresent = await Leads.findById(leads_ids[i]);
				if (isLeadPresent) {
					if (isLeadPresent.debounceCode && isLeadPresent.debounceCode !== '') {
						isContinue = false;
						if (
							isLeadPresent.debounceCode === '1' ||
							isLeadPresent.debounceCode === '2'
						) {
							leads.push(isLeadPresent);
						}
						unlocklead.push(isLeadPresent);
					}

					if (isContinue === true) {
						var verifyEmail = isLeadPresent.EmailAddress;
						if (
							verifyEmail !== null &&
							verifyEmail !== '' &&
							verifyEmail !== ' '
						) {
							const response = await axios.get(
								`https://api.millionverifier.com/api/v3/?email=${verifyEmail}&api=${process.env.MV_PRIVATE}&timeout=10`
							);

							if (response.data.error === '') {
								isLeadPresent.debounceStatus = response.data.result;
								isLeadPresent.debounceCode = response.data.resultcode;
								isLeadPresent.debounceTime = new Date().toISOString();
								if (response.data.resultcode === 1) {
									leads.push(isLeadPresent);
								}
								if (response.data.resultcode === 2) {
									leads.push(isLeadPresent);
								}
								unlocklead.push(isLeadPresent);
							} else {
								return res.status(400).json('Please try again later.');
							}
							isLeadPresent.save();
						}
					}
				}
			}

			if (person.role === 'ADMIN' || person.role === 'SUB_ADMIN') {
				for (let i = 0; i < leads_ids.length; i++) {
					if (!person.leads.includes(leads_ids[i])) {
						person.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
					}
				}
			} else {
				if (leads.length === 0 && req.params.type === 'email') {
					if (person.role === 'COMPANY') {
						for (let i = 0; i < leads_ids.length; i++) {
							if (!person.leads.includes(leads_ids[i])) {
								person.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
							}
						}
						await person.save();
					} else if (person.role === 'MEMBER') {
						let memberCompany = await Companies.findById(person.company_id);
						for (let i = 0; i < leads_ids.length; i++) {
							if (!memberCompany.leads.includes(leads_ids[i])) {
								memberCompany.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
							}
						}
						await memberCompany.save();
					}

					return res.status(200).json({
						message: 'Email verification failed, your credits are safe !',
						leads: unlocklead,
						extra: leads,
					});
				}

				if (leads.length > person.credits)
					return res.status(400).json('Not Enough Credits');

				if (person.role === 'COMPANY') {
					for (let i = 0; i < leads_ids.length; i++) {
						if (!person.leads.includes(leads_ids[i])) {
							person.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
						}
					}
				} else if (person.role === 'MEMBER') {
					let memberCompany = await Companies.findById(person.company_id);
					for (let i = 0; i < leads_ids.length; i++) {
						if (!memberCompany.leads.includes(leads_ids[i])) {
							memberCompany.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
						}
					}
					await memberCompany.save();
				}

				person.credits -= leads.length;
			}
			await person.save();

			if (person.role === 'COMPANY') {
				await Activities.create({
					company: person._id,
					heading: 'Leads Unlocked',
					message: `You have unlocked the leads!`,
				});
			}
			if (person.role === 'MEMBER') {
				await MemberActivities.create({
					member: person._id,
					company: person.company_id._id,
					heading: 'Leads Unlocked',
					message: `You have unlocked the leads!`,
				});
			}
			if (person.role === 'ADMIN') {
				await AdminActivities.create({
					person: person._id,
					role: 'ADMIN',
					heading: 'Leads Unlocked',
					message: `You have unlocked the leads!`,
				});
			}

			return res.json({ message: 'Leads Unlocked', leads: unlocklead });
		} catch (error) {
			console.log(error);
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			return res.status(400).json({ error: error.message });
		}
	}
);

router.post(
	'/download',
	[
		authorize.verifyToken,
		// authorize.accessCompanyAndMember,
		subscription_validater,
		authorize.checkUnpaidInvoice,
	],
	async (req, res) => {
		try {
			const person =
				(await Admin.findById(req.user.id)) ||
				(await Subadmin.findById(req.user.id)) ||
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id'));
			if (!person) return res.status(400).json('Account not found!');

			let leads_ids = req.body.leads_ids;
			let leads = [];
			let filter_ids = [];
			let isContinue = true;

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				if (leads_ids.length > person.credits)
					return res.status(400).json('Not Enough Credits');

				person.credits -= leads_ids.length;
				await person.save();
			}
			if (
				person.role === 'ADMIN' ||
				person.role === 'SUB_ADMIN' ||
				person.role === 'COMPANY'
			) {
				for (let i = 0; i < leads_ids.length; i++) {
					if (person.leads.includes(leads_ids[i])) {
						filter_ids.push(leads_ids[i]);
					}
				}
			} else if (person.role === 'MEMBER') {
				for (let i = 0; i < leads_ids.length; i++) {
					if (person.company_id.leads.includes(leads_ids[i])) {
						filter_ids.push(leads_ids[i]);
					}
				}
			}

			if (
				person.role === 'ADMIN' ||
				person.role === 'SUB_ADMIN' ||
				person.role === 'COMPANY'
			) {
				for (let i = 0; i < leads_ids.length; i++) {
					if (!person.leads.includes(leads_ids[i])) {
						person.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
					}
				}
				await person.save();
			} else if (person.role === 'MEMBER') {
				let memberCompany = await Companies.findById(person.company_id);
				for (let i = 0; i < leads_ids.length; i++) {
					if (!memberCompany.leads.includes(leads_ids[i])) {
						memberCompany.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
					}
				}
				await memberCompany.save();
			}

			var valid = [];
			let failedCount = 0;
			let five = 0;
			let four = 0;
			let doVerification = true;
			if (person.role === 'AMDIN' || person.role === 'SUB_ADMIN') {
				if (req.body.isVerify === false) {
					doVerification = false;
				}
			}
			if (doVerification === true) {
				if (leads_ids.length > 10) {
					var allLeads = await Leads.find({ _id: { $in: leads_ids } }).select(
						'EmailAddress debounceCode _id'
					);

					var JSONArray = allLeads.filter((obj) => {
						if (obj.EmailAddress !== null && obj.EmailAddress.trim() !== '') {
							const trimmedEmail = obj.EmailAddress.trim().toLowerCase();

							obj.EmailAddress = trimmedEmail;
							return true;
						}
						return false;
					});

					if (JSONArray.length === 0) {
						if (person.role === 'COMPANY' || person.role === 'MEMBER') {
							person.credits += leads_ids.length;
							await person.save();
						}
						return res
							.status(400)
							.json('Have no valid emails, your credits are safe.');
					}

					const emailAddresses = JSONArray.filter(
						(obj) =>
							obj.debounceCode === '' ||
							obj.debounceCode === null ||
							obj.debounceCode === undefined
					).map((obj) => obj.EmailAddress);

					var makeObj;

					if (person.role === 'COMPANY' || person.role === 'MEMBER') {
						let company_id = '';

						if (person.role === 'COMPANY') {
							company_id = person._id;
						} else if (person.role === 'MEMBER') {
							company_id = person.company_id._id;
						}

						var prevDown = JSONArray.map((rev) => {
							const isMatch = filter_ids.includes(rev._id);

							return isMatch ? true : false;
						});

						makeObj = await DownloadQueues.create({
							company: company_id,
							member: company_id,
							leads: leads_ids,
							previousDownload: prevDown,
							verifyAll: req.body.verifyAll,
							download_name: req.body.downloadName,
							dataType: req.body.dataType,
						});
					} else if (person.role === 'ADMIN') {
						makeObj = await DownloadQueues.create({
							admin: person._id,
							leads: leads_ids,
							verifyAll: req.body.verifyAll,
							download_name: req.body.downloadName,
							dataType: req.body.dataType,
						});
					} else if (person.role === 'SUB_ADMIN') {
						makeObj = await DownloadQueues.create({
							subadmin: person._id,
							leads: leads_ids,
							verifyAll: req.body.verifyAll,
							download_name: req.body.downloadName,
							dataType: req.body.dataType,
						});
					}

					const csvData = papaparse.unparse({
						fields: ['email'],
						data: emailAddresses.map((email) => [email]),
					});

					const bufferData = Buffer.from(csvData);
					const tempFilePath = `${req.body.downloadName}.csv`;
					fs.writeFileSync(tempFilePath, bufferData);

					var options = {
						method: 'POST',
						url: `https://bulkapi.millionverifier.com/bulkapi/v2/upload?key=${process.env.MV_PRIVATE}`,
						headers: {},
						formData: {
							file_contents: {
								value: fs.createReadStream(`${req.body.downloadName}.csv`),
								options: {
									filename: `${req.body.downloadName}.csv`,
									contentType: null,
								},
							},
						},
					};
					request(options, async function (error, response) {
						if (error) throw new Error(error);

						var responseData = JSON.parse(response.body);

						fs.unlink(`${req.body.downloadName}.csv`, (err) => {
							if (err) {
								console.error('Error deleting file:', err);
							} else {
								console.log('File deleted successfully.');
							}
						});

						await DownloadQueues.findByIdAndUpdate(makeObj._id, {
							$set: { mvfileid: responseData.file_id },
						});
					});

					return res
						.status(400)
						.json('You will recieve email once download completed');
				} else {
					for (let i = 0; i < leads_ids.length; i++) {
						const isLeadPresent = await Leads.findById(leads_ids[i]);
						if (isLeadPresent) {
							if (req.body.verifyAll) {
								if (
									isLeadPresent.debounceCode &&
									isLeadPresent.debounceCode !== ''
								) {
									isContinue = false;
									if (isLeadPresent.debounceCode === '1') {
										leads.push(isLeadPresent);
										valid.push(true);
										five++;
									} else {
										valid.push(false);
									}
								}

								if (isContinue === true) {
									var verifyEmail = isLeadPresent.EmailAddress;
									if (
										verifyEmail !== null &&
										verifyEmail !== '' &&
										verifyEmail !== ' '
									) {
										const response = await axios.get(
											`https://api.millionverifier.com/api/v3/?email=${verifyEmail}&api=${process.env.MV_PRIVATE}&timeout=10`
										);

										if (response.data.error === '') {
											if (response.data.resultcode === 1) {
												leads.push(isLeadPresent);
												valid.push(true);
												five++;
											} else {
												valid.push(false);
											}
											isLeadPresent.debounceStatus = response.data.result;
											isLeadPresent.debounceCode = response.data.resultcode;
											isLeadPresent.debounceTime = new Date().toISOString();
										} else {
											valid.push(false);
											failedCount++;
										}
									} else {
										valid.push(false);
									}
								}
							} else {
								if (
									isLeadPresent.debounceCode &&
									isLeadPresent.debounceCode !== ''
								) {
									isContinue = false;
									if (isLeadPresent.debounceCode === '2') {
										leads.push(isLeadPresent);
										valid.push(true);
										four++;
									} else if (isLeadPresent.debounceCode === '1') {
										leads.push(isLeadPresent);
										valid.push(true);
										five++;
									} else {
										valid.push(false);
									}
								}

								if (isContinue === true) {
									var verifyEmail = isLeadPresent.EmailAddress;
									if (
										verifyEmail !== null &&
										verifyEmail !== '' &&
										verifyEmail !== ' '
									) {
										const response = await axios.get(
											`https://api.millionverifier.com/api/v3/?email=${verifyEmail}&api=${process.env.MV_PRIVATE}&timeout=10`
										);

										if (response.data.error === '') {
											if (response.data.resultcode === 2) {
												leads.push(isLeadPresent);
												valid.push(true);
												four++;
											} else if (response.data.resultcode === 1) {
												leads.push(isLeadPresent);
												valid.push(true);
												five++;
											} else {
												valid.push(false);
											}
											isLeadPresent.debounceStatus = response.data.result;
											isLeadPresent.debounceCode = response.data.resultcode;
											isLeadPresent.debounceTime = new Date().toISOString();
										} else {
											valid.push(false);
											failedCount++;
										}
									} else {
										valid.push(false);
									}
								}
							}
							isLeadPresent.save();
						}
					}
				}
			}

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				let finalLeads = [];
				leads.map((rev) => {
					if (!filter_ids.includes(rev._id)) {
						finalLeads.push(rev);
					}
				});

				var addCredits = leads_ids.length - finalLeads.length;
				person.credits += addCredits;
			}

			await person.save();

			const data = {
				message: 'Successful!',
				leads: leads,
				valid: valid,
				total: leads_ids.length,
				validOnly: five,
				acceptAll: four,
				rest: leads_ids.length - five - four,
			};

			if (person.role === 'ADMIN') {
				const addDownload = new Downloads({
					download_name: 'Download List - ' + Date.now(),
					Admin: person._id,
					leads: leads,
					dataType: req.body.dataType,
					verifyAll: req.body.verifyAll,
				});

				const genDownload = await addDownload.save();

				person.downloads.push(genDownload._id);

				await person.save();

				await AdminActivities.create({
					person: person._id,
					role: 'ADMIN',
					heading: 'Leads Downloaded',
					message: `You have downloaded the leads!`,
				});
			} else if (person.role === 'SUB_ADMIN') {
				const addDownload = new Downloads({
					download_name: data.download_name,
					subadmin: person._id,
					leads: downloadLead,
					verifyAll: data.verifyAll,
					dataType: data.dataType,
				});

				const genDownload = await addDownload.save();

				person.downloads.push(genDownload._id);

				await person.save();

				await AdminActivities.create({
					person: person._id,
					role: 'SUB_ADMIN',
					heading: 'Leads Downloaded',
					message: `You have downloaded the leads!`,
				});
			} else if (person.role === 'COMPANY') {
				const addDownload = new Downloads({
					download_name: req.body.downloadName,
					company: person._id,
					leads: leads,
					dataType: req.body.dataType,
					verifyAll: req.body.verifyAll,
				});

				const genDownload = await addDownload.save();

				person.downloads.push(genDownload._id);

				await person.save();

				await Activities.create({
					company: person._id,
					heading: 'Leads Downloaded',
					message: `You have downloaded the leads!`,
				});
			} else if (person.role === 'MEMBER') {
				const addDownload = new Downloads({
					download_name: req.body.downloadName,
					company: person.company_id._id,
					member: person._id,
					leads: leads,
					verifyAll: req.body.verifyAll,
				});

				const genDownload = await addDownload.save();

				person.company_id.downloads.push(genDownload._id);

				await person.company_id.save();
				await MemberActivities.create({
					member: person._id,
					company: person.company_id._id,
					heading: 'Leads Downloaded',
					message: `You have downloaded the leads!`,
				});
			} else {
				return res.status(400).json('Role not found!');
			}
			const msg2 = {
				to: person.email,
				from: 'team@healthdbi.com',
				subject: `Your Healthdbi download data is ready.`,
				html: `<p>File processing complete and ready to download. Please find it in your MY LIST section.</p><br />
				<p>You have requested to download ${data.total} contacts, which have ${data.validOnly} valid only emails and ${data.acceptAll} accept all emails.</p>
			<p>If you have not requested one, please contact support via Live chat or send an email to team@healthdbi.com</p><br/>
			<p>Thanks,</p><p>Team HealthDBi</p><br /><p>HealthDBi</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
			};
			let transport = nodemailer.createTransport({
				pool: true,
				host: 'smtp.hostinger.com',
				port: 465,
				secure: true,
				auth: {
					user: process.env.EMAIL_USERNAME,
					pass: process.env.EMAIL_PASSWORD,
				},
			});

			// sgMail
			// 	.send(msg2)
			// 	.then(() => console.log('Invitation Sent!'))
			// 	.catch((err) => console.log(err));
			await transport.sendMail(msg2);

			return res.json(data);
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			return res.status(400).json({ error: error.message });
		}
	}
);

router.post('/enumeration_date', async (req, res) => {
	try {
		var leads = await Leads.find({
			EnumerationDate: { $exists: true, $ne: '' },
		})
			.select('EnumerationDate')
			.limit(1000);
		res.json({ count: leads.length, data: leads });
	} catch (err) {
		return res.json(err);
	}
});

module.exports = router;
