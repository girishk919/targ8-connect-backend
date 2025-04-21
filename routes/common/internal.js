/** @format */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const nodemailer = require('nodemailer');
const multer = require('multer');
const csvtojson = require('csvtojson');
const xlsx = require('xlsx');
const path = require('path');
const fastcsv = require('fast-csv');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

async function csvToJson(filePath) {
	return new Promise((resolve, reject) => {
		const jsonArray = [];
		const stream = fs.createReadStream(filePath);

		stream
			.pipe(fastcsv.parse({ headers: true, ignoreEmpty: true, trim: true }))
			.on('data', (row) => jsonArray.push(row))
			.on('end', () => {
				fs.unlink(filePath, (err) => {
					if (err) {
						console.error('Error deleting file:', err);
					} else {
						console.log('File deleted:', filePath);
					}
				});
				resolve(jsonArray);
			})
			.on('error', (error) => {
				fs.unlink(filePath, (err) => {
					if (err) {
						console.error('Error deleting file:', err);
					} else {
						console.log('File deleted due to error:', filePath);
					}
				});
				reject(error);
			});
	});
}

const authorize = require('../../helpers/authorize');
const axios = require('axios');
const FormData = require('form-data');

var request = require('request');
const papaparse = require('papaparse');

const Misc = require('../../models/common/misc_model');
const Admins = require('../../models/admin/admin_model');
const Companies = require('../../models/company/company_model');
const Members = require('../../models/member/member_model');
const SubAdmins = require('../../models/sub-admin/sub_admin_model');
const SingleVerifier = require('../../models/common/single_verifier');
const SingleEmailFinder = require('../../models/common/singlefinder');
const FileVerifications = require('../../models/common/fileVerification_model');
const BounceRepos = require('../../models/common/bounceRepo_model');
const CompanyFiles = require('../../models/common/companyfiles_model');
const ProjectFiles = require('../../models/common/projectfiles_model');
const EnhancerFiles = require('../../models/common/enhancerfiles_model');
const CreditUsage = require('../../models/common/credit_usage');
const CreditUsageData = require('../../models/common/credit_usage_data');
const reportedData = require('../../models/common/reportedData');
const integrate_key_model = require('../../models/company/integrate_key_model');

router.post(
	'/createDays',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			await Misc.create({ days: 45 });

			return res.json('Added Successfully');
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.post(
	'/updateDays',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			await Misc.updateMany({}, { $set: { days: req.body.days } });

			return res.json('Updated Successfully');
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/getDays',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			// let data = await sequelize.query(`Select * from GlobalDbi_Misc`);
			let data = await Misc.find();

			return res.json({ data: [data] });
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.post(
	'/singleVerify',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res
					.status(400)
					.json({ success: false, msg: 'Account not found!' });

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				if (person.credits < 1) {
					return res
						.status(400)
						.json({ success: false, msg: 'Not enough credits.' });
				}
			}

			const response = await axios.get(
				`https://api.bounceban.com/v1/verify/single?email=${req.body.email}`,
				{
					headers: {
						Authorization: process.env.BOUNCEBAN_KEY,
					},
				}
			);

			if (response?.data) {
				const { credits_remaining, ...filteredData } = response.data;
				const data = await SingleVerifier.create({
					person: req.person._id,
					...(req.person.role === 'COMPANY' || req.person.role === 'MEMBER'
						? { company: req.person._id }
						: {}),
					...(req.person.role === 'ADMIN' ? { admin: req.person._id } : {}),
					...(req.person.role === 'SUB_ADMIN'
						? { subadmin: req.person._id }
						: {}),
					...filteredData,
				});

				if (person.role === 'COMPANY' || person.role === 'MEMBER') {
					let person2 =
						(await Companies.findById(req.person._id)) ||
						(await Members.findById(req.person._id).populate('company_id'));

					person2.credits--;
					await person2.save();

					if (person.role === 'COMPANY') {
						await CreditUsage.create({
							company: person._id,
							type: 'debit',
							product: 'Verifier',
							credits: 1,
							isBulk: false,
							email: req.body.email,
						});
						const today = new Date().toISOString().split('T')[0];
						let entry = await CreditUsageData.findOne({
							company: person._id,
							date: today,
						});
						if (entry) {
							entry.credits++;
							await entry.save();
						} else {
							await CreditUsageData.create({
								company: person._id,
								date: today,
								credits: 1,
							});
						}
					} else {
						await CreditUsage.create({
							company: person.company_id._id,
							member: person._id,
							type: 'debit',
							product: 'Verifier',
							credits: 1,
							isBulk: false,
							email: req.body.email,
						});
						const today = new Date().toISOString().split('T')[0];
						let entry = await CreditUsageData.findOne({
							member: person._id,
							date: today,
						});
						if (entry) {
							entry.credits++;
							await entry.save();
						} else {
							await CreditUsageData.create({
								company: person.company_id._id,
								member: person._id,
								date: today,
								credits: 1,
							});
						}
					}
				} else if (person.role === 'ADMIN') {
					await CreditUsage.create({
						admin: person._id,
						type: 'debit',
						product: 'Verifier',
						credits: 1,
						isBulk: false,
						email: req.body.email,
					});
					const today = new Date().toISOString().split('T')[0];
					let entry = await CreditUsageData.findOne({
						admin: person._id,
						date: today,
					});
					if (entry) {
						entry.credits++;
						await entry.save();
					} else {
						await CreditUsageData.create({
							admin: person._id,
							date: today,
							credits: 1,
						});
					}
				} else if (person.role === 'SUB_ADMIN') {
					await CreditUsage.create({
						subadmin: person._id,
						type: 'debit',
						product: 'Verifier',
						credits: 1,
						isBulk: false,
						email: req.body.email,
					});
					const today = new Date().toISOString().split('T')[0];
					let entry = await CreditUsageData.findOne({
						subadmin: person._id,
						date: today,
					});
					if (entry) {
						entry.credits++;
						await entry.save();
					} else {
						await CreditUsageData.create({
							subadmin: person._id,
							date: today,
							credits: 1,
						});
					}
				}

				if (filteredData?.result === 'deliverable' && req.body.findProfile) {
					try {
						const enrichmentRes = await axios.get(
							`https://api.enrichmentapi.io/reverse_email?api_key=${process.env.ENRICHMENT_KEY}&email=${req.body.email}`
						);
						console.log(enrichmentRes?.data);
						if (enrichmentRes?.data?.status === 200) {
							const { person_data, company_data } = enrichmentRes?.data;

							await SingleVerifier.findByIdAndUpdate(data._id, {
								profile_data: person_data,
								company_data: company_data,
							});
						}
					} catch (err) {
						console.log(err);
						const result = await SingleVerifier.findById(data._id).select(
							'company person admin subadmin profile_data company_data result smtp_provider mx_records score email _id status verify_at'
						);

						return res.status(200).json({ success: true, data: result });
					}
				}

				const result = await SingleVerifier.findById(data._id).select(
					'company person admin subadmin profile_data company_data result smtp_provider mx_records score email _id status verify_at'
				);

				return res.status(200).json({ success: true, data: result });
			}
			return res
				.status(400)
				.json({ success: false, msg: 'Please try again later' });
		} catch (error) {
			res.status(500).json({ success: false, error });
		}
	}
);

router.get('/singleVerifies', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person)
			return res.status(400).json(errormessage('Account not found!'));

		var page = req.query.page || 1;
		var limit = req.query.limit || 10;

		const totalCount = await SingleVerifier.countDocuments({
			person: req.person._id,
		});
		const data = await SingleVerifier.find({ person: req.person._id })
			.select(
				'company person admin subadmin profile_data company_data result smtp_provider mx_records score email _id status verify_at'
			)
			.sort({ verify_at: -1 })
			.skip((page - 1) * limit)
			.limit(limit);

		let result = [];
		for (const rev of data) {
			result.push({ ...rev._doc, search_by: req.person?.name });
		}

		return res.json({ data: { totalCount, data: result } });
	} catch (error) {
		res.status(400).json(error);
	}
});

router.get(
	'/singleVerifiesDownload',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res.status(400).json(errormessage('Account not found!'));

			const data = await SingleVerifier.find({ person: req.person._id })
				.select(
					'profile_data company_data result smtp_provider mx_records score email _id status verify_at'
				)
				.sort({ verify_at: -1 });

			return res.json({ data });
		} catch (error) {
			res.status(400).json(error);
		}
	}
);

router.post(
	'/uploadFileVerification',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	upload.single('file'),
	async (req, res) => {
		try {
			console.log('Ok1', new Date().toISOString());
			const person = req.person;
			const maxSize = 10 * 1024 * 1024;
			if (!person)
				return res
					.status(400)
					.json({ success: false, msg: 'Account not found!' });

			const file = req.file;
			if (!file)
				return res
					.status(400)
					.json({ success: false, msg: 'File is required' });

			if (!req.body.filename) {
				return res
					.status(400)
					.json({ success: false, msg: 'File name is required.' });
			}

			const findFile = await FileVerifications.findOne({
				filename: req.body.filename,
				person: person._id,
			});
			if (findFile) {
				return res
					.status(400)
					.json({ success: false, msg: 'File with same name already exists' });
			}

			req.body.findProfile = false;
			req.body.vendor = req.body.vendor || 'EmailAddress.ai';
			const company_id =
				person.role === 'COMPANY' ? person._id : person.company_id || 0;
			const commonGUID = uuidv4();

			const fileExtension = file.originalname.split('.').pop().toLowerCase();
			console.log('Ok2', fileExtension);

			let JSONArray = [];
			if (fileExtension === 'csv') {
				if (file.size > maxSize) {
					if (person.role === 'COMPANY' || person.role === 'MEMBER') {
						var insertObj = {
							company_id: company_id,
							person: person._id,
							filename: req.body.filename,
							filePath: file.path,
							data: req.body.data,
							sys_filename: commonGUID,
							uploadby: person.name,
							vendor: req.body.vendor,
							progress_status: 'Uploading',
							e_status: 'In-Progress',
							uploaded: false,
							emailsent: false,
							is_enrichment: false,
							total_count: null,
							findProfile: Boolean(req.body.findProfile),
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						};

						await FileVerifications.create(insertObj);
					} else if (person.role === 'ADMIN') {
						var insertObj = {
							admin: person._id,
							person: person._id,
							filename: req.body.filename,
							data: req.body.data,
							filePath: file.path,
							sys_filename: commonGUID,
							uploadby: person.name,
							vendor: req.body.vendor,
							progress_status: 'Uploading',
							e_status: 'In-Progress',
							uploaded: false,
							emailsent: false,
							is_enrichment: false,
							total_count: null,
							findProfile: Boolean(req.body.findProfile),
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						};

						await FileVerifications.create(insertObj);
					} else if (person.role === 'SUB_ADMIN') {
						var insertObj = {
							subadmin: person._id,
							person: person._id,
							filename: req.body.filename,
							data: req.body.data,
							filePath: file.path,
							sys_filename: commonGUID,
							uploadby: person.name,
							vendor: req.body.vendor,
							progress_status: 'Uploading',
							e_status: 'In-Progress',
							uploaded: false,
							emailsent: false,
							is_enrichment: false,
							total_count: null,
							findProfile: Boolean(req.body.findProfile),
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						};

						await FileVerifications.create(insertObj);
					}

					return res.json({
						success: true,
						msg: 'Uploaded Successfully',
						data: commonGUID,
					});
				} else {
					JSONArray = await csvToJson(file.path);
				}
				console.log('Ok3', new Date().toISOString());
			} else {
				const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

				const sheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[sheetName];

				JSONArray = xlsx.utils.sheet_to_json(worksheet);
			}

			function replaceKeys(obj, dataObj) {
				const newObj = { ...obj };
				for (const key in dataObj) {
					const value = dataObj[key];
					if (value in obj) {
						newObj[key] = obj[value];
						if (key !== value) {
							delete newObj[value];
						}
					}
				}
				return newObj;
			}

			if (JSONArray.length > 1000001) {
				return res.status(400).json({
					success: false,
					msg: 'The file limit has exceeded 1,000,000 records.',
				});
			}

			const dataMap = JSON.parse(req.body.data);
			const uniqueEmails = new Set();
			const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

			console.log('Ok4', JSONArray?.length);
			JSONArray = JSONArray.reduce((acc, obj) => {
				const newObj = replaceKeys(obj, dataMap);

				if (newObj.email) {
					const email = newObj.email.trim().toLowerCase();
					if (emailRegex.test(email) && !uniqueEmails.has(email)) {
						uniqueEmails.add(email);
						newObj.email = email;
						acc.push(newObj);
					}
				}
				return acc;
			}, []);

			if (JSONArray.length === 0) {
				return res
					.status(400)
					.json({ success: false, msg: 'File has no valid emails' });
			}

			console.log('Ok5', new Date().toISOString());
			//JSONArray = await normalizeArrayOfObjects(JSONArray);

			if (
				(person.role === 'COMPANY' || person.role === 'MEMBER') &&
				JSONArray.length > person.credits
			) {
				return res
					.status(400)
					.json({ success: false, msg: 'Not Enough Credits' });
			}

			console.log('Ok6', new Date().toISOString());

			let keyData;

			try {
				if (req.body.vendor === 'Million Verifier') {
					const key = await integrate_key_model.findOne({
						title: 'Million Verifier',
						company: person._id.toString(),
					});
					if (!key) {
						return res.status(400).json({
							success: false,
							msg: 'Connect million verifier in integrations first.',
						});
					}

					const credRes = await axios.get(
						`https://api.millionverifier.com/api/v3/credits?api=${key?.apiKey}`
					);

					if (credRes?.data?.credits < JSONArray?.length) {
						return res.status(400).json({
							success: false,
							msg: 'Not enough credits in million verifier.',
						});
					}

					keyData = key;
				} else if (req.body.vendor === 'Zero Bounce') {
					const key = await integrate_key_model.findOne({
						title: 'Zero Bounce',
						company: person._id.toString(),
					});
					if (!key) {
						return res.status(400).json({
							success: false,
							msg: 'Connect zero bounce in integrations first.',
						});
					}

					const credRes = await axios.get(
						`https://api.zerobounce.net/v2/getcredits?api_key=${key?.apiKey}`
					);

					if (credRes?.data?.Credits < JSONArray?.length) {
						return res.status(400).json({
							success: false,
							msg: 'Not enough credits in zero bounce.',
						});
					}

					keyData = key;
				} else if (req.body.vendor === 'Never Bounce') {
					const key = await integrate_key_model.findOne({
						title: 'Never Bounce',
						company: person._id.toString(),
					});
					if (!key) {
						return res.status(400).json({
							success: false,
							msg: 'Connect never bounce in integrations first.',
						});
					}

					const credRes = await axios.get(
						`https://api.neverbounce.com/v4.2/account/info?key=${key?.apiKey}`
					);

					if (
						credRes?.data?.credits_info?.paid_credits_remaining +
							credRes?.data?.credits_info?.free_credits_remaining <
						JSONArray?.length
					) {
						return res.status(400).json({
							success: false,
							msg: 'Not enough credits in never bounce.',
						});
					}

					keyData = key;
				} else if (req.body.vendor === 'DeBounce') {
					const key = await integrate_key_model.findOne({
						title: 'DeBounce',
						company: person._id.toString(),
					});
					if (!key) {
						return res.status(400).json({
							success: false,
							msg: 'Connect debounce in integrations first.',
						});
					}

					const credRes = await axios.get(
						`https://api.debounce.io/v1/balance/?api=${key?.apiKey}`
					);

					if (credRes?.data?.balance < JSONArray?.length) {
						return res.status(400).json({
							success: false,
							msg: 'Not enough credits in debounce.',
						});
					}

					keyData = key;
				} else if (req.body.vendor === 'Email List Verify') {
					const key = await integrate_key_model.findOne({
						title: 'Email List Verify',
						company: person._id.toString(),
					});
					if (!key) {
						return res.status(400).json({
							success: false,
							msg: 'Connect email list verify in integrations first.',
						});
					}

					const credRes = await axios.get(
						'https://api.emaillistverify.com/api/credits',
						{
							headers: { 'x-api-key': key?.apiKey },
						}
					);

					if (
						credRes?.data?.onDemand?.available +
							credRes?.data?.daily?.available <
						JSONArray?.length
					) {
						return res.status(400).json({
							success: false,
							msg: 'Not enough credits in email list verify.',
						});
					}

					keyData = key;
				}
			} catch (err) {
				return res.status(400).json({ success: false, msg: err?.message });
			}

			var makeArray;

			console.log('Ok7', new Date().toISOString());
			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				var insertArray = JSONArray.map((rev) => ({
					...rev,
					company_id: company_id,
					person: person._id,
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					vendor: req.body.vendor,
					progress_status: 'In-Process',
					e_status: 'In-Progress',
					verified: 0,
					progress: 0,
					uploaded: true,
					emailsent: false,
					is_enrichment: false,
					total_count: JSONArray.length,
					findProfile: Boolean(req.body.findProfile),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}));

				makeArray = [...insertArray];

				const bulkOps = insertArray.map((doc) => ({
					insertOne: { document: doc },
				}));
				const batchSize = JSONArray.length > 25000 ? 10000 : 950;

				console.log('Ok8', insertArray?.length);
				for (let i = 0; i < bulkOps.length; i += batchSize) {
					await FileVerifications.bulkWrite(bulkOps.slice(i, i + batchSize));
				}
			} else if (person.role === 'ADMIN') {
				// var insertArray = JSONArray.map((rev) => ({
				// 	...rev,
				// 	admin: person._id,
				// 	person: person._id,
				// 	filename: req.body.filename,
				// 	sys_filename: commonGUID,
				// 	uploadby: person.name,
				// 	vendor: req.body.vendor,
				// 	progress_status: 'In-Process',
				// 	e_status: 'In-Progress',
				// 	verified: 0,
				// 	progress: 0,
				// 	emailsent: false,
				// 	is_enrichment: false,
				// 	total_count: JSONArray.length,
				// 	findProfile: Boolean(req.body.findProfile),
				// 	created_at: new Date().toISOString(),
				// 	updated_at: new Date().toISOString(),
				// }));

				// makeArray = JSONArray.map((rev) => ({
				// 	...rev,
				// 	admin: person._id,
				// 	person: person._id,
				// 	filename: req.body.filename,
				// 	sys_filename: commonGUID,
				// 	uploadby: person.name,
				// 	vendor: req.body.vendor,
				// 	progress_status: 'In-Process',
				// 	e_status: 'In-Progress',
				// 	verified: 0,
				// 	progress: 0,
				// 	emailsent: false,
				// 	is_enrichment: false,
				// 	total_count: JSONArray.length,
				// 	findProfile: Boolean(req.body.findProfile),
				// 	created_at: new Date().toISOString(),
				// 	updated_at: new Date().toISOString(),
				// }));

				// while (insertArray.length > 0) {
				// 	var newArray = insertArray.splice(0, 950);

				// 	await FileVerifications.insertMany(newArray);
				// }
				var insertArray = JSONArray.map((rev) => ({
					...rev,
					admin: person._id,
					person: person._id,
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					vendor: req.body.vendor,
					progress_status: 'Failed',
					e_status: 'Failed',
					verified: 0,
					progress: 0,
					uploaded: true,
					emailsent: true,
					is_enrichment: false,
					total_count: JSONArray.length,
					findProfile: Boolean(req.body.findProfile),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}));

				makeArray = [...insertArray];

				const bulkOps = insertArray.map((doc) => ({
					insertOne: { document: doc },
				}));
				const batchSize = JSONArray.length > 25000 ? 10000 : 950;

				console.log('Ok8', insertArray?.length);
				for (let i = 0; i < bulkOps.length; i += batchSize) {
					await FileVerifications.bulkWrite(bulkOps.slice(i, i + batchSize));
				}
			} else if (person.role === 'SUB_ADMIN') {
				var insertArray = JSONArray.map((rev) => ({
					...rev,
					subadmin: person._id,
					person: person._id,
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					vendor: req.body.vendor,
					progress_status: 'In-Process',
					e_status: 'In-Progress',
					verified: 0,
					progress: 0,
					uploaded: true,
					emailsent: false,
					is_enrichment: false,
					total_count: JSONArray.length,
					findProfile: Boolean(req.body.findProfile),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}));

				makeArray = [...insertArray];

				const bulkOps = insertArray.map((doc) => ({
					insertOne: { document: doc },
				}));
				const batchSize = JSONArray.length > 25000 ? 10000 : 950;

				console.log('Ok8', insertArray?.length);
				for (let i = 0; i < bulkOps.length; i += batchSize) {
					await FileVerifications.bulkWrite(bulkOps.slice(i, i + batchSize));
				}
			}

			console.log('Ok9', new Date().toISOString());

			if (makeArray[0]?.progress_status === 'Failed') {
				return res.json({
					success: true,
					msg: 'Uploaded Successfully',
					data: commonGUID,
				});
			}

			const emailAddresses = makeArray.map((obj) => obj.email);

			try {
				if (req.body.vendor === 'EmailAddress.ai') {
					const response = await axios.post(
						`https://api.bounceban.com/v1/verify/bulk`,
						{
							emails: emailAddresses,
							name: req.body.filename,
						},
						{
							headers: {
								Authorization: process.env.BOUNCEBAN_KEY,
							},
						}
					);

					await FileVerifications.updateMany(
						{ sys_filename: commonGUID },
						{
							$set: {
								bbid: response?.data?.id,
								progress: 0,
								e_status: 'In_Progress',
								mainVerify: true,
							},
						}
					);
				} else if (req.body.vendor === 'Million Verifier') {
					const csvData = papaparse.unparse({
						fields: ['email'],
						data: emailAddresses.map((email) => [email]),
					});

					const bufferData = Buffer.from(csvData);
					const tempFilePath = `${req.body.filename}.csv`;
					fs.writeFileSync(tempFilePath, bufferData);

					var options = {
						method: 'POST',
						url: `https://bulkapi.millionverifier.com/bulkapi/v2/upload?key=${keyData?.apiKey}`,
						headers: {},
						formData: {
							file_contents: {
								value: fs.createReadStream(`${req.body.filename}.csv`),
								options: {
									filename: `${req.body.filename}.csv`,
									contentType: null,
								},
							},
						},
					};
					request(options, async function (error, response) {
						if (error) throw new Error(error);

						var responseData = JSON.parse(response.body);
						fs.unlink(`${req.body.filename}.csv`, (err) => {
							if (err) {
								console.error('Error deleting file:', err);
							} else {
								console.log('File deleted successfully.');
							}
						});

						await FileVerifications.updateMany(
							{ sys_filename: commonGUID },
							{
								$set: {
									bbid: responseData.file_id,
									progress: 0,
									e_status: 'In_Other_Progress',
									mainVerify: false,
								},
							}
						);
					});
				} else if (req.body.vendor === 'Zero Bounce') {
					const csvData = papaparse.unparse({
						fields: ['email'],
						data: emailAddresses.map((email) => [email]),
					});

					const bufferData = Buffer.from(csvData);
					const tempFilePath = `${req.body.filename}.csv`;
					fs.writeFileSync(tempFilePath, bufferData);

					const formData = new FormData();

					formData.append('api_key', keyData?.apiKey);
					formData.append(
						'file',
						fs.createReadStream(`${req.body.filename}.csv`)
					);
					formData.append('email_address_column', 1);
					try {
						const uploadRes = await axios.post(
							'https://bulkapi.zerobounce.net/v2/sendfile',
							formData,
							{
								headers: {
									...formData.getHeaders(),
								},
							}
						);

						if (uploadRes?.data?.file_id) {
							await FileVerifications.updateMany(
								{ sys_filename: commonGUID },
								{
									$set: {
										bbid: uploadRes?.data?.file_id,
										progress: 0,
										e_status: 'In_Other_Progress',
										mainVerify: false,
									},
								}
							);
						}
						fs.unlink(`${req.body.filename}.csv`, (err) => {
							if (err) {
								console.error('Error deleting file:', err);
							} else {
								console.log('File deleted successfully.');
							}
						});
					} catch (err) {
						fs.unlink(`${req.body.filename}.csv`, (err) => {
							if (err) {
								console.error('Error deleting file:', err);
							} else {
								console.log('File deleted successfully.');
							}
						});
						await FileVerifications.updateMany(
							{ sys_filename: commonGUID },
							{
								$set: {
									progress_status: 'Failed',
									progress: 0,
									e_status: 'Failed',
								},
							}
						);
						return res.status(400).json({ success: false, msg: err?.message });
					}
				} else if (req.body.vendor === 'Never Bounce') {
					console.log('Ok2');
					const inputData = makeArray.map((obj) => [obj.email]);

					const payload = {
						key: keyData?.apiKey,
						input_location: 'supplied',
						filename: `${req.body.filename}.csv`,
						auto_start: true,
						auto_parse: true,
						allow_manual_review: false,
						input: inputData,
					};
					console.log('Ok3');
					try {
						const uploadRes = await axios.post(
							'https://api.neverbounce.com/v4/jobs/create',
							payload
						);

						if (uploadRes?.data?.job_id) {
							console.log('Ok4');
							await FileVerifications.updateMany(
								{ sys_filename: commonGUID },
								{
									$set: {
										bbid: uploadRes?.data?.job_id,
										progress: 0,
										e_status: 'In_Other_Progress',
										mainVerify: false,
									},
								}
							);
						}
					} catch (err) {
						await FileVerifications.updateMany(
							{ sys_filename: commonGUID },
							{
								$set: {
									progress_status: 'Failed',
									progress: 0,
									e_status: 'Failed',
								},
							}
						);
						return res.status(400).json({ success: false, msg: err?.message });
					}
				} else if (req.body.vendor === 'DeBounce') {
				} else if (req.body.vendor === 'Email List Verify') {
					const csvData = papaparse.unparse({
						fields: ['email'],
						data: emailAddresses.map((email) => [email]),
					});

					const bufferData = Buffer.from(csvData);
					const tempFilePath = `${req.body.filename}.csv`;
					fs.writeFileSync(tempFilePath, bufferData);
					console.log('Ok3');
					var options = {
						method: 'POST',
						url: `https://api.emaillistverify.com/api/verifyApiFile`,
						headers: {
							'x-api-key': keyData?.apiKey,
						},
						formData: {
							file_contents: {
								value: fs.createReadStream(`${req.body.filename}.csv`),
								options: {
									filename: `${req.body.filename}.csv`,
									contentType: null,
								},
							},
						},
					};
					console.log('Ok4');
					request(options, async function (error, response) {
						if (error) throw new Error(error);

						console.log('Ok5');
						var responseData = JSON.parse(response.body);
						fs.unlink(`${req.body.filename}.csv`, (err) => {
							if (err) {
								console.error('Error deleting file:', err);
							} else {
								console.log('File deleted successfully.');
							}
						});
						console.log('Ok6', responseData);

						await FileVerifications.updateMany(
							{ sys_filename: commonGUID },
							{
								$set: {
									bbid: responseData,
									progress: 0,
									e_status: 'In_Other_Progress',
									mainVerify: false,
								},
							}
						);
					});
				}

				if (person.role === 'COMPANY' || person.role === 'MEMBER') {
					let person2 =
						(await Companies.findById(req.person._id)) ||
						(await Members.findById(req.person._id).populate('company_id'));

					person2.credits -= JSONArray.length;
					await person2.save();

					if (person.role === 'COMPANY') {
						await CreditUsage.create({
							company: person._id,
							type: 'debit',
							product: 'Verifier',
							credits: JSONArray.length,
							isBulk: true,
							filename: req.body.filename,
							fileId: commonGUID,
						});
						const today = new Date().toISOString().split('T')[0];
						let entry = await CreditUsageData.findOne({
							company: person._id,
							date: today,
						});
						if (entry) {
							entry.credits += JSONArray.length;
							await entry.save();
						} else {
							await CreditUsageData.create({
								company: person._id,
								date: today,
								credits: JSONArray.length,
							});
						}
					} else {
						await CreditUsage.create({
							company: person.company_id._id,
							member: person._id,
							type: 'debit',
							product: 'Verifier',
							credits: JSONArray.length,
							isBulk: true,
							filename: req.body.filename,
							fileId: commonGUID,
						});
						const today = new Date().toISOString().split('T')[0];
						let entry = await CreditUsageData.findOne({
							member: person._id,
							date: today,
						});
						if (entry) {
							entry.credits += JSONArray.length;
							await entry.save();
						} else {
							await CreditUsageData.create({
								company: person.company_id._id,
								member: person._id,
								date: today,
								credits: JSONArray.length,
							});
						}
					}
				} else if (person.role === 'ADMIN') {
					await CreditUsage.create({
						admin: person._id,
						type: 'debit',
						product: 'Verifier',
						credits: JSONArray.length,
						isBulk: true,
						filename: req.body.filename,
						fileId: commonGUID,
					});
					const today = new Date().toISOString().split('T')[0];
					let entry = await CreditUsageData.findOne({
						admin: person._id,
						date: today,
					});
					if (entry) {
						entry.credits += JSONArray.length;
						await entry.save();
					} else {
						await CreditUsageData.create({
							admin: person._id,
							date: today,
							credits: JSONArray.length,
						});
					}
				} else if (person.role === 'SUB_ADMIN') {
					await CreditUsage.create({
						subadmin: person._id,
						type: 'debit',
						product: 'Verifier',
						credits: JSONArray.length,
						isBulk: true,
						filename: req.body.filename,
						fileId: commonGUID,
					});
					const today = new Date().toISOString().split('T')[0];
					let entry = await CreditUsageData.findOne({
						subadmin: person._id,
						date: today,
					});
					if (entry) {
						entry.credits += JSONArray.length;
						await entry.save();
					} else {
						await CreditUsageData.create({
							subadmin: person._id,
							date: today,
							credits: JSONArray.length,
						});
					}
				}

				return res.json({
					success: true,
					msg: 'Uploaded Successfully',
					data: commonGUID,
				});
			} catch (err) {
				await FileVerifications.updateMany(
					{ sys_filename: commonGUID },
					{
						$set: {
							progress_status: 'Failed',
							progress: 0,
							e_status: 'Failed',
						},
					}
				);
				console.log(err?.message);
				return res
					.status(400)
					.json({ success: false, msg: 'Please try again later.' });
			}
		} catch (error) {
			res.status(500).json({ success: false, error });
		}
	}
);

router.post('/bulkUrl', async (req, res) => {
	try {
		console.log(req.body);
		return res.status(200).json('ok');
	} catch (error) {
		console.log('Error Occured');
		return res.status(500).json({ error: error.message });
	}
});

router.post('/bulkUrlFinished', async (req, res) => {
	try {
		console.log(req.body);
		return res.status(200).json('ok');
	} catch (error) {
		console.log('Error Occured');
		return res.status(500).json({ error: error.message });
	}
});

router.post('/complete', async (req, res) => {
	try {
		const fileid = await FileVerifications.findOne({
			sys_filename: req.body.sys_filename,
		});

		if (fileid.status === 'Verified') {
			return res.json('Verification Completed');
		}

		const response = await axios.get(
			`https://bulkapi.millionverifier.com/bulkapi/v2/download?key=${process.env.MV_PRIVATE2}&file_id=${fileid.mvfileid}&filter=all`
		);

		let data = await csvtojson().fromString(response.data);

		const fileData = await FileVerifications.find({
			sys_filename: req.body.sys_filename,
			mvstatus: { $eq: null },
		});

		const resultMap = new Map([
			['ok', 'valid'],
			['catch_all', 'catch_all'],
		]);

		const newArray = fileData.map((obj) => {
			const resultObj = data.find((item) => item.email === obj.email);
			if (resultObj) {
				const { result } = resultObj;
				const mvstatus = resultMap.get(result) || 'invalid';
				return { ...obj._doc, mvstatus, updated_at: new Date().toISOString() };
			} else {
				return { ...obj._doc, updated_at: new Date().toISOString() };
			}
		});

		const updateArray = fileData.map((obj) => {
			const resultObj = data.find((item) => item.email === obj.email);
			if (resultObj) {
				const { result } = resultObj;
				const mvstatus = resultMap.get(result) || 'invalid';
				return { ...obj._doc, mvstatus, updated_at: new Date().toISOString() };
			} else {
				return { ...obj._doc, updated_at: new Date().toISOString() };
			}
		});

		if (updateArray.length > 0) {
			while (updateArray.length > 0) {
				var shortUpdateArray = updateArray.splice(0, 950);
				const bulkOps = shortUpdateArray.map((obj) => ({
					updateOne: {
						filter: { email: obj.email },
						update: {
							$set: {
								mvstatus: obj.mvstatus,
								updated_at: new Date().toISOString(),
							},
						},
					},
				}));

				await FileVerifications.bulkWrite(bulkOps);
			}

			await FileVerifications.updateMany(
				{ sys_filename: req.body.sys_filename },
				{ $set: { status: 'Verified' } }
			);

			const invalidItems = newArray.filter(
				(item) => item.mvstatus === 'invalid'
			);

			if (invalidItems.length > 0) {
				while (invalidItems.length > 0) {
					var finalArray = invalidItems.splice(0, 950);

					const docsToInsert = finalArray.map((item) => ({
						email: item.email,
						filename: item.filename,
						sys_filename: item.sys_filename,
						verification_date: item.updated_at,
					}));

					await BounceRepos.insertMany(docsToInsert);
				}
			}
		}

		// await sequelize.query(
		// 	`EXEC Update_MasterData_Verification @fileName = '${req.body.sys_filename}'`
		// );

		const person = await FileVerifications.findOne({
			sys_filename: req.body.sys_filename,
		}).lean();

		if (person) {
			let person2;
			if (person?.company) {
				person2 = await Companies.findById(person.company);
			} else if (person?.admin) {
				person2 = await Admins.findById(person.admin);
			} else if (person?.subadmin) {
				person2 = await SubAdmins.findById(person.subadmin);
			}

			if (person2) {
				let counts = await FileVerifications.aggregate([
					{
						$match: { sys_filename: req.body.sys_filename },
					},
					{
						$group: {
							_id: '$sys_filename',
							SysFilenameCount: { $sum: 1 },
							NullCount: {
								$sum: { $cond: [{ $eq: ['$mvstatus', null] }, 1, 0] },
							},
							ValidCount: {
								$sum: { $cond: [{ $eq: ['$mvstatus', 'valid'] }, 1, 0] },
							},
							InvalidCount: {
								$sum: { $cond: [{ $eq: ['$mvstatus', 'invalid'] }, 1, 0] },
							},
							CatchAllCount: {
								$sum: { $cond: [{ $eq: ['$mvstatus', 'catch_all'] }, 1, 0] },
							},
							MaxCreatedAt: { $max: '$updated_at' },
						},
					},
					{
						$sort: { MaxCreatedAt: -1 },
					},
				]);

				const msg2 = {
					to: person2.email,
					from: 'team@healthdbi.com',
					bcc: 'girishk919@gmail.com',
					subject: `Your file is verified.`,
					html: `<p>File processing complete and ready to download. Please find it in your "Internal" section in "My Profile".</p><br />
					<p>You have requested to download ${counts[0].SysFilenameCount} contacts, which have ${counts[0].ValidCount} valid only emails and ${counts[0].CatchAllCount} accept all emails.</p>
					<p>If you have not requested one, please contact support via Live chat or send an email to team@healthdbi.com</p><br/>
					<p>Thanks,</p><p>Team HealthDBi</p><br /><p>HealthDBi</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
				};

				let transport = nodemailer.createTransport({
					pool: true,
					host: 'smtp.gmail.com',
					port: 465,
					secure: true,
					auth: {
						user: process.env.EMAIL_USERNAME,
						pass: process.env.EMAIL_PASSWORD,
					},
				});

				await transport.sendMail(msg2);
			}
		}

		return res.json('Verification Completed');
	} catch (error) {
		console.log(error);
		return res.status(500).json({ error: error.message });
	}
});

router.post('/check-status', async (req, res) => {
	try {
		const fileid = await FileVerifications.findOne({
			sys_filename: req.body.sys_filename,
		});

		const response = await axios.get(
			`https://bulkapi.millionverifier.com/bulkapi/v2/fileinfo?key=${process.env.MV_PRIVATE2}&file_id=${fileid?.mvfileid}`
		);

		if (response?.data?.error === 'parameter file_id is not integer') {
			if (fileid.status !== 'Verified') {
				await FileVerifications.updateMany(
					{ sys_filename: req.body.sys_filename },
					{ $set: { status: 'Failed' } }
				);
			}
		}
		return res.json({ data: response.data });
	} catch (error) {
		console.log('Error Occured');
		return res.status(500).json({ error: error.message });
	}
});

router.post('/download', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		let data = await FileVerifications.find({
			sys_filename: req.body.fileid,
			...(req.body.ea_status &&
				req.body.ea_status !== 'all' && {
					'result.result': req.body.ea_status,
				}),
		}).lean();

		function removeEmptyKeysFromAllObjects(arr) {
			const keysToRemove = {};
			arr.forEach((obj) => {
				Object.keys(obj).forEach((key) => {
					if (obj[key] === '' || obj[key] === null) {
						if (keysToRemove[key] !== false) {
							keysToRemove[key] = true;
						}
					} else {
						keysToRemove[key] = false;
					}
				});
			});

			arr.forEach((obj) => {
				Object.keys(keysToRemove).forEach((key) => {
					if (keysToRemove[key]) {
						delete obj[key];
					}
				});
			});

			return arr;
		}

		data = removeEmptyKeysFromAllObjects(data);

		function changeSpecificKey(arr, oldKey, newKey) {
			arr.forEach((obj) => {
				if (obj.hasOwnProperty(oldKey)) {
					obj[newKey] = obj[oldKey];
					delete obj[oldKey];
				}
			});

			return arr;
		}

		data = changeSpecificKey(data, 'mvstatus', 'ea_status');
		data = changeSpecificKey(data, 'emailstatus', 'ea_status');
		data = changeSpecificKey(data, 'score', 'ea_score');

		const keysToRemove = [
			'_id',
			'created_at',
			'updated_at',
			'uploadby',
			'filename',
			'sys_filename',
			'bbid',
			'party_counts',
			'other_vendor_counts',
			'ea_counts',
			'result',
			'progress_status',
			'e_status',
			'verified',
			'progress',
			'person',
			'admin',
			'company_id',
			'subadmin',
			'status',
			'findProfile',
			'vendor',
			'mainVerify',
			'__v',
			'emailsent',
			'is_enrichment',
			'total_count',
			'profile_data',
			'company_data',
		];

		function removeSpecificKeysFromAllObjects(arr, keys) {
			arr.forEach((obj) => {
				keys.forEach((key) => {
					delete obj[key];
				});
			});

			return arr;
		}

		function flattenResultFields(arr) {
			arr.forEach((obj) => {
				if (obj.result) {
					const { verify_at, smtp_provider, mx_records } = obj.result;
					obj.ea_verify_at = verify_at;
					obj.ea_smtp_provider = smtp_provider;
					obj.ea_mx_records = mx_records?.join(', ') || '';
					delete obj.result;
				}
				// if (obj.profile_data) {
				// 	const {
				// 		fullName,
				// 		public_identifier,
				// 		headline,
				// 		followers,
				// 		connections,
				// 		location,
				// 		skills,
				// 	} = obj.profile_data;
				// 	obj.person_linkedin_url = public_identifier
				// 		? `https://linkedin.com/in/${public_identifier}`
				// 		: '';
				// 	obj.person_fullname = fullName;
				// 	obj.headline = headline;
				// 	obj.location = location;
				// 	obj.skills = skills;
				// 	obj.followers = followers;
				// 	obj.connections = connections;
				// }
				// if (obj.company_data) {
				// 	const {
				// 		company_name,
				// 		universal_name_id,
				// 		tagline,
				// 		website,
				// 		founded,
				// 		type,
				// 		industries,
				// 		company_size,
				// 		headquarters,
				// 	} = obj.company_data;

				// 	obj.company_linkedin_url = universal_name_id
				// 		? `https://linkedin.com/company/${universal_name_id}`
				// 		: '';
				// 	obj.company_name = company_name;
				// 	obj.tagline = tagline;
				// 	obj.website = website;
				// 	obj.founded = founded;
				// 	obj.type = type;
				// 	obj.industries = industries;
				// 	obj.company_size = company_size;
				// 	obj.headquarters = headquarters;
				// }
			});
			return arr;
		}

		data = flattenResultFields(data);
		data = removeSpecificKeysFromAllObjects(data, keysToRemove);
		var result = [data, data.length];

		return res.json(result);
	} catch (error) {
		console.log('Error Occured');
		return res.status(500).json({ success: false, error: error.message });
	}
});

router.get('/check-status', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person)
			return res
				.status(400)
				.json({ success: false, msg: 'Account not found!' });

		if (!req.query.id) {
			return res.status(400).json({ success: false, msg: 'Id is required.' });
		}
		let filter = { person: person._id.toString(), sys_filename: req.query.id };

		let data = await FileVerifications.aggregate([
			{ $match: filter },
			{
				$group: {
					_id: '$sys_filename',
					progress_status: { $first: '$progress_status' },
					progress: { $first: '$progress' },
					total_count: { $first: '$total_count' },
					filename: { $first: '$filename' },
					sub_status: { $first: '$party_counts.status' },
					credits_consumed: { $first: '$party_counts.credits_consumed' },
					uploadby: { $first: '$uploadby' },
					created_at: { $first: '$created_at' },
				},
			},
		]);

		return res.json({
			success: true,
			data: data?.length > 0 ? data[0] : {},
		});
	} catch (error) {
		console.log('err', error);
		res.status(500).json({ success: false, error: error.message });
	}
});

router.get('/fileVerifications', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		var page = req.query.page ? Number(req.query.page) : 1;
		var limit = req.query.limit ? Number(req.query.limit) : 10;
		var skip = (page - 1) * limit;

		let filter = { person: person._id.toString() };

		if (person.role === 'COMPANY') {
			filter['company_id'] = person._id.toString();
		}

		// if (req.query.from) {
		// 	const fromDate = new Date(req.query.from).toISOString();
		// 	filter['created_at'] = { $gte: fromDate };
		// }
		// if (req.query.to) {
		// 	const toDate = new Date(req.query.to);
		// 	toDate.setDate(toDate.getDate() + 1);
		// 	filter['created_at'] = {
		// 		...filter.created_at,
		// 		$lte: toDate.toISOString(),
		// 	};
		// }

		let data = await FileVerifications.aggregate([
			{ $match: filter },
			{
				$group: {
					_id: '$sys_filename',
					RepeatCount: { $sum: 1 },
					progress_status: { $first: '$progress_status' },
					e_status: { $first: '$e_status' },
					uploaded: { $first: '$uploaded' },
					other_vendor_counts: { $first: '$other_vendor_counts' },
					vendor: { $first: '$vendor' },
					total_count: { $first: '$total_count' },
					filename: { $first: '$filename' },
					party_counts: { $first: '$party_counts' },
					ea_counts: { $first: '$ea_counts' },
					uploadby: { $first: '$uploadby' },
					progress: { $first: '$progress' },
					verified: { $first: '$verified' },
					created_at: { $first: '$created_at' },
				},
			},
			{ $sort: { created_at: -1 } },
			{ $skip: skip },
			{ $limit: limit },
		]);

		data = data.map((doc) => ({
			...doc,
			sys_filename: doc._id,
		}));

		const totalCountPipeline = [
			{ $match: filter },
			{ $group: { _id: null, TotalCount: { $sum: 1 } } },
		];
		const totalCountResult = await FileVerifications.aggregate(
			totalCountPipeline
		);
		const totalCount =
			totalCountResult.length > 0 ? totalCountResult[0].TotalCount : 0;

		const distinctCountPipeline = [
			{ $match: filter },
			{ $group: { _id: '$sys_filename' } },
			{ $count: 'TotalCount' },
		];
		const distinctCountResult = await FileVerifications.aggregate(
			distinctCountPipeline
		);
		const totalPages =
			distinctCountResult.length > 0 ? distinctCountResult[0].TotalCount : 0;

		const pages = Math.ceil(totalPages / limit);

		return res.json({
			pages,
			totalPages,
			totalCount,
			data: [data, data.length],
		});
	} catch (error) {
		console.log('err', error);
		res.status(400).json(error.message);
	}
});

router.post('/uploadBounce', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');
		if (person.role === 'COMPANY' || person.role === 'MEMBER') {
			if (person.is_internal_user !== true) {
				return res.status(400).json('You do not have access!');
			}
		}

		let JSONArray = req.body.dataArray;

		function isValidEmail(email) {
			const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
			return emailRegex.test(email);
		}

		JSONArray = JSONArray.filter((obj) => {
			if (obj.email !== null && obj.email.trim() !== '') {
				const trimmedEmail = obj.email.trim().toLowerCase();
				if (isValidEmail(trimmedEmail)) {
					obj.email = trimmedEmail;
					return true;
				}
			}
			return false;
		});

		if (JSONArray.length === 0) {
			return res
				.status(400)
				.json('File does not have emails with valid format.');
		}

		let company_id = 0;

		if (person.role === 'COMPANY') {
			company_id = person._id;
		} else if (person.role === 'MEMBER') {
			company_id = person.company_id;
		}

		const commonGUID = uuidv4();

		if (person.role === 'COMPANY' || person.role === 'MEMBER') {
			var insertArray = JSONArray.map((rev) => ({
				filename: req.body.filename,
				company: company_id,
				email: rev.email,
				verification_date: rev.verification_date ? rev.verification_date : null,
				uploadby: person.name,
				sys_filename: commonGUID,
				status: 'In-Process',
				total_count: JSONArray.length,
			}));

			let count = 0;
			while (insertArray.length > 0) {
				var newArray = insertArray.splice(0, 950);
				count = count + newArray.length;

				await BounceRepos.insertMany(newArray);
			}
		} else if (person.role === 'ADMIN') {
			var insertArray = JSONArray.map((rev) => ({
				filename: req.body.filename,
				admin: person._id,
				verification_date: rev.verification_date ? rev.verification_date : null,
				email: rev.email,
				uploadby: person.name,
				sys_filename: commonGUID,
				status: 'In-Process',
				total_count: JSONArray.length,
			}));

			let count = 0;
			while (insertArray.length > 0) {
				var newArray = insertArray.splice(0, 950);
				count = count + newArray.length;

				await BounceRepos.insertMany(newArray);
			}
		} else if (person.role === 'SUB_ADMIN') {
			var insertArray = JSONArray.map((rev) => ({
				filename: req.body.filename,
				subadmin: person._id,
				email: rev.email,
				verification_date: rev.verification_date ? rev.verification_date : null,
				uploadby: person.name,
				sys_filename: commonGUID,
				status: 'In-Process',
				total_count: JSONArray.length,
			}));

			let count = 0;
			while (insertArray.length > 0) {
				var newArray = insertArray.splice(0, 950);
				count = count + newArray.length;

				await BounceRepos.insertMany(newArray);
			}
		}

		await BounceRepos.updateMany(
			{ sys_filename: commonGUID },
			{ $set: { status: 'Completed' } }
		);

		const msg2 = {
			to: person.email,
			from: 'team@globaldbi.com',
			bcc: 'girishk919@gmail.com',
			subject: `Your bounce file is uploaded.`,
			html: `<p>File processing complete and uploaded successfully. Please find it in your "Internal" section in "My Profile".</p><br />
			<p>A total of ${JSONArray.length} rows have been uploaded. The file has been identified as '${req.body.filename}'.</p>
			<p>If you have not requested one, please contact support via Live chat or send an email to team@globaldbi.com</p><br/>
			<p>Thanks,</p><p>Team GlobalDBi</p><br /><p>GlobalDBi</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
		};

		let transport = nodemailer.createTransport({
			pool: true,
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: process.env.EMAIL_USERNAME,
				pass: process.env.EMAIL_PASSWORD,
			},
		});

		await transport.sendMail(msg2);

		return res.json({ data: 'Uploaded Successfully' });
	} catch (error) {
		res.status(400).json(error.message);
	}
});

router.get('/bounce', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');
		if (person.role === 'COMPANY' || person.role === 'MEMBER') {
			if (person.is_internal_user !== true) {
				return res.status(400).json('You do not have access!');
			}
		}

		if (person.role === 'COMPANY') {
			company_id = person._id;
		} else if (person.role === 'MEMBER') {
			company_id = person.company_id;
		}

		let filter = {};
		if (person.role === 'COMPANY' || person.role === 'MEMBER') {
			filter.company = company_id;
		} else if (person.role === 'ADMIN') {
			filter.admin = person._id;
		} else if (person.role === 'SUB_ADMIN') {
			filter.subadmin = person._id;
		} else {
			return res.status(400).json('Account not found!');
		}

		const page = req.query.page ? Number(req.query.page) : 1;
		const limit = req.query.limit ? Number(req.query.limit) : 10;
		const skip = (page - 1) * limit;

		let data = await BounceRepos.aggregate([
			{ $match: filter },
			{
				$group: {
					_id: '$sys_filename',
					status: { $first: '$status' },
					total_count: { $sum: 1 },
					filename: { $first: '$filename' },
					uploadby: { $first: '$uploadby' },
					created_at: { $first: '$created_at' },
				},
			},
			{
				$sort: { created_at: -1 },
			},
			{
				$skip: skip,
			},
			{
				$limit: limit,
			},
		]);

		const totalCount = await BounceRepos.countDocuments(filter);

		const totalPages = await BounceRepos.distinct('sys_filename', filter)
			.length;

		var pages = Math.ceil(totalPages / limit);

		return res.json({ pages, totalCount: [totalCount], data: [data] });
	} catch (error) {
		res.status(400).json(error.message);
	}
});

async function missingColumns(array, tableName) {
	try {
		// Get the existing columns in the table
		const query = `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '${tableName}'
        `;

		const [results] = await sequelize.query(query);
		const existingColumns = results.map((row) => row.COLUMN_NAME);

		// Determine missing columns based on array keys and their data sizes
		const missingCols = [];
		const maxLengths = {}; // Store maximum lengths for each key

		// Iterate through the array to find maximum lengths
		for (const obj of array) {
			for (const key of Object.keys(obj)) {
				if (!existingColumns.includes(key)) {
					const value = obj[key];
					if (!maxLengths[key] || (value && value.length > maxLengths[key])) {
						maxLengths[key] = value ? value.length : 0;
					}
				}
			}
		}

		// Create missing columns based on maximum lengths
		for (const key of Object.keys(maxLengths)) {
			missingCols.push({ name: key, maxLength: maxLengths[key] });
		}

		return missingCols;
	} catch (error) {
		throw error;
	}
}

async function generateAlterTableSQL(tableName, missingColumns) {
	try {
		const alterTableSQL = missingColumns.map((columnInfo) => {
			const dataSize =
				columnInfo.maxLength > 0 ? columnInfo.maxLength + 50 : 100;
			return `ALTER TABLE ${tableName} ADD ${columnInfo.name} VARCHAR(${dataSize});`;
		});

		for (const sql of alterTableSQL) {
			await sequelize.query(sql);
		}

		return true; // Indicate success
	} catch (error) {
		throw error;
	}
}

async function filterObjectsWithExcessiveLength(array, tableName) {
	try {
		// Get the existing columns in the table
		const query = `
            SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '${tableName}'
        `;

		const [results] = await sequelize.query(query);
		const columnLengths = {};
		results.forEach((row) => {
			columnLengths[row.COLUMN_NAME] = row.CHARACTER_MAXIMUM_LENGTH;
		});

		// Filter objects with excessive length values
		const filteredArray = array.filter((obj) => {
			for (const key of Object.keys(obj)) {
				const value = obj[key];
				const maxLength = columnLengths[key];
				if (maxLength !== undefined && value && value.length > maxLength) {
					return false; // Exclude objects with excessive length values
				}
			}
			return true;
		});

		return filteredArray;
	} catch (error) {
		throw error;
	}
}

async function normalizeArrayOfObjects(arr) {
	if (arr.length <= 1) return arr;

	const firstObjectKeys = new Set(Object.keys(arr[0]));

	return arr.map((obj) => {
		const newObj = {};
		for (const key of firstObjectKeys) {
			newObj[key] = obj.hasOwnProperty(key)
				? obj[key]
				: typeof arr[0][key] === 'string'
				? ''
				: null;
		}
		return newObj;
	});
}

async function removeDuplicates(array) {
	const uniqueObjects = [];
	const seenValues = new Set();

	array.forEach((obj) => {
		const key =
			obj.title + obj.companyname + obj.fullname + obj.firstname + obj.lastname;

		if (!seenValues.has(key)) {
			uniqueObjects.push(obj);
			seenValues.add(key);
		}
	});

	return uniqueObjects;
}

function customSort(a, b) {
	if (a?.fullname && b?.fullname) {
		return a?.fullname?.localeCompare(b?.fullname);
	} else if (a?.fullname) {
		return -1;
	} else if (b?.fullname) {
		return 1;
	} else {
		return a?.firstname?.localeCompare(b?.firstname);
	}
}

router.post(
	'/uploadCompanyFile',
	[authorize.verifyToken],
	upload.single('file'),
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');
			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				if (person.is_internal_user !== true) {
					return res.status(400).json('You do not have access!');
				}
			}

			const file = req.file;
			if (!file) {
				return res.status(400).json('File is required');
			}

			if (!req.body.filename) {
				return res.status(400).json('File name is required.');
			}

			const fileExtension = req.file.originalname
				.split('.')
				.pop()
				.toLowerCase();

			let JSONArray = [];
			if (fileExtension === 'csv') {
				JSONArray = await csvtojson().fromString(req.file.buffer.toString());
			} else {
				const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

				const sheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[sheetName];

				JSONArray = xlsx.utils.sheet_to_json(worksheet);
			}

			function replaceKeys(obj, dataObj) {
				const newObj = {};
				for (const key in dataObj) {
					const value = dataObj[key];
					if (value in obj) {
						newObj[key] = obj[value];
					}
				}
				return newObj;
			}

			JSONArray = JSONArray.map((obj) =>
				replaceKeys(obj, JSON.parse(req.body.data))
			);

			JSONArray = await normalizeArrayOfObjects(JSONArray);

			let company_id = 0;

			if (person.role === 'COMPANY') {
				company_id = person._id;
			} else if (person.role === 'MEMBER') {
				company_id = person.company_id;
			}

			const commonGUID = uuidv4();

			let insertArray = [];
			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				insertArray = JSONArray.map((obj) => ({
					...obj,
					company_id: company_id,
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					progress_status: 'In-Process',
				}));
			} else if (person.role === 'ADMIN') {
				insertArray = JSONArray.map((obj) => ({
					...obj,
					mainadmin_id: person._id,
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					progress_status: 'In-Process',
				}));
			} else if (person.role === 'SUB_ADMIN') {
				insertArray = JSONArray.map((obj) => ({
					...obj,
					mainsubadmin: person._id,
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					progress_status: 'In-Process',
				}));
			}

			// const missingCols = await missingColumns(
			// 	insertArray,
			// 	'GlobalDbi_CompanyFiles'
			// );

			// if (missingCols.length > 0) {
			// 	await generateAlterTableSQL('GlobalDbi_CompanyFiles', missingCols);
			// }

			// insertArray = await filterObjectsWithExcessiveLength(
			// 	insertArray,
			// 	'GlobalDbi_CompanyFiles'
			// );
			// if (insertArray.length === 0) {
			// 	return res.status(400).json('File have excessive length data.');
			// }

			insertArray = insertArray.map((obj) => ({
				...obj,
				total_count: insertArray.length,
			}));

			if (insertArray.length > 0) {
				let count = 0;
				while (insertArray.length > 0) {
					var newArray = insertArray.splice(0, 950);
					count = count + newArray.length;
					await CompanyFiles.insertMany(newArray);
				}

				await CompanyFiles.updateMany(
					{ sys_filename: commonGUID },
					{ $set: { progress_status: 'Completed' } }
				);

				const msg2 = {
					to: person.email,
					from: 'team@globaldbi.com',
					//bcc: 'girishk919@gmail.com',
					subject: `Your company file is uploaded.`,
					html: `<p>File processing complete and uploaded successfully. Please find it in your "Internal" section in "My Profile".</p><br />
					<p>A total of ${count} rows have been uploaded. The file has been identified as '${req.body.filename}'.</p>
					<p>If you have not requested one, please contact support via Live chat or send an email to team@globaldbi.com</p><br/>
					<p>Thanks,</p><p>Team GlobalDBi</p><br /><p>GlobalDBi</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
				};

				let transport = nodemailer.createTransport({
					pool: true,
					host: 'smtp.gmail.com',
					port: 465,
					secure: true,
					auth: {
						user: process.env.EMAIL_USERNAME,
						pass: process.env.EMAIL_PASSWORD,
					},
				});

				await transport.sendMail(msg2);
			}
			return res.json({ msg: 'Uploaded Successfully' });
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get('/companyFile', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');
		if (person.role === 'COMPANY' || person.role === 'MEMBER') {
			if (person.is_internal_user !== true) {
				return res.status(400).json('You do not have access!');
			}
		}

		var page = req.query.page ? Number(req.query.page) : 1;
		var limit = req.query.limit ? Number(req.query.limit) : 10;
		var skip = (page - 1) * limit;

		if (person.role === 'COMPANY') {
			company_id = person._id;
		} else if (person.role === 'MEMBER') {
			company_id = person.company_id;
		}

		let filter = {};
		if (person.role === 'COMPANY' || person.role === 'MEMBER') {
			filter.company_id = company_id;
		} else if (person.role === 'ADMIN') {
			filter.mainadmin_id = person._id;
		} else if (person.role === 'SUB_ADMIN') {
			filter.mainsubadmin = person._id;
		} else {
			return res.status(400).json('Account not found!');
		}

		let data = await CompanyFiles.aggregate([
			{
				$match: filter,
			},
			{
				$group: {
					_id: '$sys_filename',
					progress_status: { $first: '$progress_status' },
					total_count: { $sum: 1 },
					filename: { $first: '$filename' },
					uploadby: { $first: '$uploadby' },
					created_at: { $first: '$created_at' },
				},
			},
			{
				$sort: { created_at: -1 },
			},
			{
				$skip: skip,
			},
			{
				$limit: limit,
			},
		]);

		const totalCount = await CompanyFiles.countDocuments(filter);

		const totalPagesCount = await CompanyFiles.aggregate([
			{
				$match: filter,
			},
			{
				$group: {
					_id: '$sys_filename',
				},
			},
			{
				$count: 'TotalCount',
			},
		]);
		const totalPages =
			totalPagesCount.length > 0 ? totalPagesCount[0].TotalCount : 0;

		var pages = Math.ceil(totalPages / limit);

		return res.json({ pages, totalPages, totalCount, data });
	} catch (error) {
		res.status(400).json(error.message);
	}
});

router.post(
	'/uploadProjectFile',
	[authorize.verifyToken],
	upload.single('file'),
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');
			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				if (person.is_internal_user !== true) {
					return res.status(400).json('You do not have access!');
				}
			}

			const file = req.file;
			if (!file) {
				return res.status(400).json('File is required');
			}

			if (!req.body.filename) {
				return res.status(400).json('File name is required.');
			}

			const fileExtension = req.file.originalname
				.split('.')
				.pop()
				.toLowerCase();

			let JSONArray = [];
			if (fileExtension === 'csv') {
				JSONArray = await csvtojson().fromString(req.file.buffer.toString());
			} else {
				const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

				const sheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[sheetName];

				JSONArray = xlsx.utils.sheet_to_json(worksheet);
			}

			function replaceKeys(obj, dataObj) {
				const newObj = {};
				for (const key in dataObj) {
					const value = dataObj[key];
					if (value in obj) {
						newObj[key] = obj[value];
					}
				}
				return newObj;
			}

			JSONArray = JSONArray.map((obj) =>
				replaceKeys(obj, JSON.parse(req.body.data))
			);

			JSONArray = await normalizeArrayOfObjects(JSONArray);

			let company_id = 0;

			if (person.role === 'COMPANY') {
				company_id = person._id;
			} else if (person.role === 'MEMBER') {
				company_id = person.company_id;
			}

			const commonGUID = uuidv4();

			let insertArray = [];
			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				insertArray = JSONArray.map((obj) => ({
					...obj,
					company_id: company_id,
					admin_status: 'pending',
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					progress_status: 'In-Process',
				}));
			} else if (person.role === 'ADMIN') {
				insertArray = JSONArray.map((obj) => ({
					...obj,
					mainadmin_id: person._id,
					admin_status: 'pending',
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					progress_status: 'In-Process',
				}));
			} else if (person.role === 'SUB_ADMIN') {
				insertArray = JSONArray.map((obj) => ({
					...obj,
					mainsubadmin: person._id,
					admin_status: 'pending',
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					progress_status: 'In-Process',
				}));
			}

			// const missingCols = await missingColumns(
			// 	insertArray,
			// 	'GlobalDbi_ProjectFiles'
			// );

			// if (missingCols.length > 0) {
			// 	await generateAlterTableSQL('GlobalDbi_ProjectFiles', missingCols);
			// }

			// insertArray = await filterObjectsWithExcessiveLength(
			// 	insertArray,
			// 	'GlobalDbi_ProjectFiles'
			// );

			// if (insertArray.length === 0) {
			// 	return res.status(400).json('File have excessive length data.');
			// }

			insertArray = insertArray.map((obj) => ({
				...obj,
				total_count: insertArray.length,
			}));

			// const columnNames = Object.keys(insertArray[0]);
			// const valuePlaceholders = columnNames.map(() => '?').join(', ');

			let count = 0;
			while (insertArray.length > 0) {
				var newArray = insertArray.splice(0, 950);
				count += newArray.length;

				await ProjectFiles.insertMany(newArray);
			}

			await ProjectFiles.updateMany(
				{ sys_filename: commonGUID },
				{ $set: { progress_status: 'Completed' } }
			);

			const msg2 = {
				to: person.email,
				from: 'team@globaldbi.com',
				bcc: 'girishk919@gmail.com',
				subject: `Your project file is uploaded.`,
				html: `<p>File processing complete and uploaded successfully. Please find it in your "Internal" section in "My Profile".</p><br />
				<p>A total of ${count} rows have been uploaded. The file has been identified as '${req.body.filename}'.</p>
				<p>If you have not requested one, please contact support via Live chat or send an email to team@globaldbi.com</p><br/>
				<p>Thanks,</p><p>Team GlobalDBi</p><br /><p>GlobalDBi</p><p>447 Broadway, 2nd floor, #713</p><p>NewYork, NY 10013, USA</p>`,
			};

			let transport = nodemailer.createTransport({
				pool: true,
				host: 'smtp.gmail.com',
				port: 465,
				secure: true,
				auth: {
					user: process.env.EMAIL_USERNAME,
					pass: process.env.EMAIL_PASSWORD,
				},
			});

			await transport.sendMail(msg2);

			return res.json({ msg: 'Uploaded Successfully' });
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get('/projectFile', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');
		if (person.role === 'COMPANY' || person.role === 'MEMBER') {
			if (person.is_internal_user !== true) {
				return res.status(400).json('You do not have access!');
			}
		}

		var page = req.query.page ? Number(req.query.page) : 1;
		var limit = req.query.limit ? Number(req.query.limit) : 10;
		var skip = (page - 1) * limit;

		if (person.role === 'COMPANY') {
			company_id = person._id;
		} else if (person.role === 'MEMBER') {
			company_id = person.company_id;
		}
		let filter = {};
		if (person.role === 'COMPANY' || person.role === 'MEMBER') {
			filter.company_id = company_id;
		} else if (person.role === 'ADMIN') {
			filter.mainadmin_id = person._id;
		} else if (person.role === 'SUB_ADMIN') {
			filter.mainsubadmin = person._id;
		} else {
			return res.status(400).json('Account not found!');
		}

		let data = await ProjectFiles.aggregate([
			{
				$match: filter,
			},
			{
				$group: {
					_id: '$sys_filename',
					progress_status: { $first: '$progress_status' },
					total_count: { $sum: 1 },
					filename: { $first: '$filename' },
					uploadby: { $first: '$uploadby' },
					created_at: { $first: '$created_at' },
				},
			},
			{
				$sort: { created_at: -1 },
			},
			{
				$skip: skip,
			},
			{
				$limit: limit,
			},
		]);

		const totalCount = await ProjectFiles.countDocuments(filter);

		const distinctCount = await ProjectFiles.distinct('sys_filename', filter);
		const totalPages = distinctCount.length;

		var pages = Math.ceil(totalPages / limit);

		return res.json({ pages, totalPages, totalCount, data });
	} catch (error) {
		res.status(400).json(error.message);
	}
});

router.post(
	'/uploadEnhancerFile',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	upload.single('file'),
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res
					.status(400)
					.json({ success: false, msg: 'Account not found!' });

			const file = req.file;
			if (!file) {
				return res
					.status(400)
					.json({ success: false, msg: 'File is required' });
			}

			if (!req.body.filename) {
				return res
					.status(400)
					.json({ success: false, msg: 'File name is required.' });
			}

			const fileExtension = req.file.originalname
				.split('.')
				.pop()
				.toLowerCase();

			if (req.body.findProfile === true) {
				req.body.findProfile = false;
			} else {
				req.body.findProfile = false;
			}

			let JSONArray = [];
			if (fileExtension === 'csv') {
				JSONArray = await csvtojson().fromString(req.file.buffer.toString());
			} else {
				const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

				const sheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[sheetName];

				JSONArray = xlsx.utils.sheet_to_json(worksheet);
			}

			function replaceKeys(obj, dataObj) {
				const newObj = { ...obj };
				for (const key in dataObj) {
					const value = dataObj[key];
					if (value in obj) {
						newObj[key] = obj[value];
						if (key !== value) {
							delete newObj[value];
						}
					}
				}
				return newObj;
			}

			if (JSONArray.length > 25001) {
				return res
					.status(400)
					.json('The file limit has exceeded 25,000 records.');
			}

			JSONArray = JSONArray.map((obj) =>
				replaceKeys(obj, JSON.parse(req.body.data))
			);

			JSONArray = await normalizeArrayOfObjects(JSONArray);

			JSONArray.forEach((obj) => {
				// If fullname exists, split it into firstname and lastname
				if (obj.fullname && (!obj.firstname || obj.firstname === '')) {
					const names = obj.fullname.split(' ');
					if (names.length === 1) {
						obj.firstname = names[0];
						obj.lastname = '';
					} else if (names.length >= 2) {
						obj.firstname = names[0];
						obj.lastname = names.slice(1).join(' ');
					} else {
						obj.firstname = '';
						obj.lastname = '';
					}
				}
				// If firstname and lastname exist but fullname doesn't, create fullname
				else if (obj.firstname && (!obj.fullname || obj.fullname === '')) {
					obj.fullname = obj.firstname + ' ' + obj.lastname;
				}
			});

			JSONArray = JSONArray.filter(
				(obj) =>
					obj.company_url_or_name &&
					obj.fullname &&
					obj.firstname &&
					obj.lastname
			);

			if (JSONArray.length === 0) {
				return res
					.status(400)
					.json({ success: false, msg: 'File contains no valid data.' });
			}

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				if (JSONArray.length * 3 > person.credits) {
					return res
						.status(400)
						.json({ success: false, msg: 'Not Enough Credits' });
				}
			}

			let company_id = 0;

			if (person.role === 'COMPANY') {
				company_id = person._id;
			} else if (person.role === 'MEMBER') {
				company_id = person.company_id;
			}

			const commonGUID = uuidv4();

			let insertArray = [];
			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				insertArray = JSONArray.map((obj) => ({
					...obj,
					person: req.person._id,
					company_id: company_id,
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					progress_status: 'In-Process',
					e_status: 'In-Progress',
					appended: 0,
					progress: 0,
					skrapp: false,
					anymail: false,
					icypeas: false,
					is_enrichment: false,
					emailsent: false,
					findProfile: Boolean(req.body.findProfile),
					created_at: new Date().toISOString(),
				}));
			} else if (person.role === 'ADMIN') {
				insertArray = JSONArray.map((obj) => ({
					...obj,
					person: req.person._id,
					mainadmin_id: person._id,
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					progress_status: 'In-Process',
					e_status: 'In-Progress',
					appended: 0,
					progress: 0,
					skrapp: false,
					anymail: false,
					icypeas: false,
					is_enrichment: false,
					emailsent: false,
					findProfile: Boolean(req.body.findProfile),
					created_at: new Date().toISOString(),
				}));
			} else if (person.role === 'SUB_ADMIN') {
				insertArray = JSONArray.map((obj) => ({
					...obj,
					person: req.person._id,
					mainsubadmin: person._id,
					filename: req.body.filename,
					sys_filename: commonGUID,
					uploadby: person.name,
					progress_status: 'In-Process',
					e_status: 'In-Progress',
					appended: 0,
					progress: 0,
					skrapp: false,
					anymail: false,
					icypeas: false,
					is_enrichment: false,
					emailsent: false,
					findProfile: Boolean(req.body.findProfile),
					created_at: new Date().toISOString(),
				}));
			}

			insertArray = await removeDuplicates(insertArray);
			insertArray.sort(customSort);

			const totalRows = insertArray?.length || 0;
			insertArray = insertArray.map((obj) => ({
				...obj,
				total_count: insertArray.length,
			}));

			if (insertArray.length > 0) {
				// const columnNames = Object.keys(insertArray[0]);
				// const valuePlaceholders = columnNames.map(() => '?').join(', ');
				let count = 0;
				while (insertArray.length > 0) {
					var newArray = insertArray.splice(0, 950);
					count += newArray.length;
					await EnhancerFiles.insertMany(newArray);
				}
				// const getData = await EnhancerFiles.find(
				// 	{ sys_filename: commonGUID },
				// 	'companyname fullname firstname lastname title _id'
				// );
				// const reorderedData = getData.map((obj) => ({
				// 	companyname: obj.companyname.split(',')[0],
				// 	fullname: obj.fullname,
				// 	firstname: obj.firstname,
				// 	lastname: obj.lastname,
				// 	title: obj.title.split(',')[0],
				// 	_id: obj._id,
				// }));
				// const headerRow = Object.keys(reorderedData[0]);
				// let twoDArray = [headerRow];
				// reorderedData.forEach((obj) => {
				// 	const row = headerRow.map((key) => {
				// 		if (typeof obj[key] === 'number') {
				// 			return obj[key].toString();
				// 		} else {
				// 			return obj[key];
				// 		}
				// 	});
				// 	twoDArray.push(row);
				// });
				// try {
				// 	const response = await axios.post(
				// 		'https://api.anymailfinder.com/v5.0/bulk/json',
				// 		{
				// 			company_name_field_index: 0,
				// 			data: twoDArray,
				// 			domain_field_index: null,
				// 			file_name: req.body.filename,
				// 			first_name_field_index: 2,
				// 			full_name_field_index: 1,
				// 			job_title_field_index: 4,
				// 			last_name_field_index: 3,
				// 			webhook_url: null,
				// 		},
				// 		{
				// 			headers: {
				// 				Authorization: 'Bearer x4eIhx3IQ6rMB72MborG2oEf',
				// 				'Content-Type': 'application/json',
				// 			},
				// 		}
				// 	);
				// 	if (response?.data?.success === true) {
				// 		var party_counts = JSON.stringify(
				// 			response?.data?.bulkSearch?.counts
				// 		);
				// 		await EnhancerFiles.updateMany(
				// 			{ sys_filename: commonGUID },
				// 			{
				// 				party_id: response?.data?.bulkSearch?.id,
				// 				party_status: response?.data?.bulkSearch?.status,
				// 				party_counts: party_counts,
				// 			}
				// 		);
				// 	} else {
				// 		return res
				// 			.status(400)
				// 			.json('Please try again later, server is down.');
				// 	}
				// } catch (err) {
				// 	console.log(err?.response?.data.error_explained);
				// 	return res
				// 		.status(400)
				// 		.json(`Please try again later, server is down.`);
				// }
			}

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				let person2 =
					(await Companies.findById(req.person._id)) ||
					(await Members.findById(req.person._id).populate('company_id'));

				person2.credits -= totalRows * 3;
				await person2.save();

				if (person.role === 'COMPANY') {
					await CreditUsage.create({
						company: person._id,
						type: 'debit',
						product: 'Finder',
						credits: totalRows * 3,
						isBulk: true,
						filename: req.body.filename,
						fileId: commonGUID,
					});
					const today = new Date().toISOString().split('T')[0];
					let entry = await CreditUsageData.findOne({
						company: person._id,
						date: today,
					});
					if (entry) {
						entry.credits += totalRows * 3;
						await entry.save();
					} else {
						await CreditUsageData.create({
							company: person._id,
							date: today,
							credits: totalRows * 3,
						});
					}
				} else {
					await CreditUsage.create({
						company: person.company_id._id,
						member: person._id,
						type: 'debit',
						product: 'Finder',
						credits: totalRows * 3,
						isBulk: true,
						filename: req.body.filename,
						fileId: commonGUID,
					});
					const today = new Date().toISOString().split('T')[0];
					let entry = await CreditUsageData.findOne({
						member: person._id,
						date: today,
					});
					if (entry) {
						entry.credits += totalRows * 3;
						await entry.save();
					} else {
						await CreditUsageData.create({
							company: person.company_id._id,
							member: person._id,
							date: today,
							credits: totalRows * 3,
						});
					}
				}
			} else if (person.role === 'ADMIN') {
				await CreditUsage.create({
					admin: person._id,
					type: 'debit',
					product: 'Finder',
					credits: totalRows * 3,
					isBulk: true,
					filename: req.body.filename,
					fileId: commonGUID,
				});
				const today = new Date().toISOString().split('T')[0];
				let entry = await CreditUsageData.findOne({
					admin: person._id,
					date: today,
				});
				if (entry) {
					entry.credits += totalRows * 3;
					await entry.save();
				} else {
					await CreditUsageData.create({
						admin: person._id,
						date: today,
						credits: totalRows * 3,
					});
				}
			} else if (person.role === 'SUB_ADMIN') {
				await CreditUsage.create({
					subadmin: person._id,
					type: 'debit',
					product: 'Finder',
					credits: totalRows * 3,
					isBulk: true,
					filename: req.body.filename,
					fileId: commonGUID,
				});
				const today = new Date().toISOString().split('T')[0];
				let entry = await CreditUsageData.findOne({
					subadmin: person._id,
					date: today,
				});
				if (entry) {
					entry.credits += totalRows * 3;
					await entry.save();
				} else {
					await CreditUsageData.create({
						subadmin: person._id,
						date: today,
						credits: totalRows * 3,
					});
				}
			}

			return res.json({
				success: true,
				msg: 'Uploaded Successfully',
				data: commonGUID,
			});
		} catch (error) {
			res.status(500).json({ success: false, error: error.message });
		}
	}
);

router.get(
	'/search/check-status',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			if (!req.query.id) {
				return res.status(400).json({ success: false, msg: 'Id is required.' });
			}

			if (person.role === 'COMPANY') {
				company_id = person._id.toString();
			} else if (person.role === 'MEMBER') {
				company_id = person.company_id.toString();
			}

			let filter = { sys_filename: req.query.id, company_id: company_id };

			let data = await EnhancerFiles.aggregate([
				{ $match: filter },
				{
					$group: {
						_id: '$sys_filename',
						progress_status: { $first: '$progress_status' },
						total_count: { $first: '$total_count' },
						deliverable_count: { $first: '$deliverable_count' },
						filename: { $first: '$filename' },
						sub_status: { $first: '$party_counts.status' },
						uploadby: { $first: '$uploadby' },
						progress: { $first: '$progress' },
						appended: { $first: '$appended' },
						created_at: { $first: '$created_at' },
					},
				},
			]);

			return res.json({
				success: true,
				data: data.length > 0 ? data[0] : {},
			});
		} catch (error) {
			res.status(500).json({ success: false, error: error.message });
		}
	}
);

router.get('/enhancerFile', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		var page = req.query.page ? Number(req.query.page) : 1;
		var limit = req.query.limit ? Number(req.query.limit) : 10;
		var skip = (page - 1) * limit;

		if (person.role === 'COMPANY') {
			company_id = person._id.toString();
		} else if (person.role === 'MEMBER') {
			company_id = person.company_id.toString();
		}

		let filter = {};
		if (person.role === 'COMPANY' || person.role === 'MEMBER') {
			filter.company_id = company_id;
		} else if (person.role === 'ADMIN') {
			filter.mainadmin_id = person._id.toString();
		} else if (person.role === 'SUB_ADMIN') {
			filter.mainsubadmin = person._id.toString();
		} else {
			return res.status(400).json('Account not found!');
		}

		let data = await EnhancerFiles.aggregate([
			{ $match: filter },
			{
				$group: {
					_id: '$sys_filename',
					RepeatCount: { $sum: 1 },
					progress_status: { $first: '$progress_status' },
					total_count: { $first: '$total_count' },
					deliverable_count: { $first: '$deliverable_count' },
					filename: { $first: '$filename' },
					party_counts: { $first: '$party_counts' },
					uploadby: { $first: '$uploadby' },
					progress: { $first: '$progress' },
					appended: { $first: '$appended' },
					created_at: { $first: '$created_at' },
				},
			},
			{ $sort: { created_at: -1 } },
			{ $skip: skip },
			{ $limit: limit },
		]);

		data = data.map((doc) => ({
			...doc,
			sys_filename: doc._id,
		}));

		const totalCountPipeline = [
			{ $match: filter },
			{ $group: { _id: null, TotalCount: { $sum: 1 } } },
		];
		const totalCountResult = await EnhancerFiles.aggregate(totalCountPipeline);
		const totalCount =
			totalCountResult.length > 0 ? totalCountResult[0].TotalCount : 0;

		const distinctCountPipeline = [
			{ $match: filter },
			{ $group: { _id: '$sys_filename' } },
			{ $count: 'TotalCount' },
		];
		const distinctCountResult = await EnhancerFiles.aggregate(
			distinctCountPipeline
		);
		const totalPages =
			distinctCountResult.length > 0 ? distinctCountResult[0].TotalCount : 0;

		const pages = Math.ceil(totalPages / limit);

		return res.json({
			pages,
			totalPages,
			totalCount,
			data: [data, data.length],
		});
	} catch (error) {
		res.status(400).json(error.message);
	}
});

router.post('/finderdownload', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		var query = { sys_filename: req.body.fileid };
		if (req.body.result !== '' && req.body.result !== 'all') {
			query['result'] = req.body.result;
		}

		let data = await EnhancerFiles.find(query).lean();

		function removeEmptyKeysFromAllObjects(arr) {
			const keysToRemove = {};
			arr.forEach((obj) => {
				Object.keys(obj).forEach((key) => {
					if (obj[key] === '' || obj[key] === null) {
						if (keysToRemove[key] !== false) {
							keysToRemove[key] = true;
						}
					} else {
						keysToRemove[key] = false;
					}
				});
			});

			arr.forEach((obj) => {
				Object.keys(keysToRemove).forEach((key) => {
					if (keysToRemove[key]) {
						delete obj[key];
					}
				});
			});

			return arr;
		}

		// data = removeEmptyKeysFromAllObjects(data);

		// data = data.filter(
		// 	(obj) => obj.email !== undefined && obj.email !== null && obj.email !== ''
		// );

		function changeSpecificKey(arr, oldKey, newKey) {
			arr.forEach((obj) => {
				if (obj.hasOwnProperty(oldKey)) {
					obj[newKey] = obj[oldKey];
					delete obj[oldKey];
				}
			});

			return arr;
		}

		data = changeSpecificKey(data, 'result', 'ea_status');

		const keysToRemove = [
			'_id',
			'__v',
			'created_at',
			'updated_at',
			'uploadby',
			'filename',
			'sys_filename',
			'party_id',
			'party_status',
			'appended',
			'progress',
			'bbid',
			'quality',
			'e_status',
			'mainadmin_id',
			'company_id',
			'mainsubadmin',
			'progress_status',
			'valid_email_only',
			'amf_status',
			'domain_name',
			'email_type',
			'party_counts',
			'a_party_id',
			'a_party_counts',
			'a_party_status',
			'skrapp',
			'anymail',
			'icypeas',
			'party_file_id',
			'party_file_status',
			'party_file_id_1',
			'party_file_status_1',
			'party_file_id_2',
			'party_file_status_2',
			'party_file_id_3',
			'party_file_status_3',
			'party_file_id_4',
			'party_file_status_4',
			'party_file_id_5',
			'party_file_status_5',
			'party_file_id_6',
			'party_file_status_6',
			'totalFileIds',
			'mxRecords',
			'mxProvider',
			'certainty',
			'i_status',
			'findProfile',
			'is_enrichment',
			'total_count',
			'deliverable_count',
			'bb',
			'emailsent',
			'person',
			'profile_data',
			'company_data',
		];

		function removeSpecificKeysFromAllObjects(arr, keys) {
			arr.forEach((obj) => {
				keys.forEach((key) => {
					delete obj[key];
				});
			});

			return arr;
		}

		function flattenResultFields(arr) {
			arr.forEach((obj) => {
				if (obj.mxProvider) {
					obj.ea_mx_records = obj.mxRecords?.join(', ') || '';
					obj.ea_smtp_provider = obj.mxProvider;
				}
				if (obj.bb) {
					const { score, verify_at, smtp_provider, mx_records } = obj.bb;
					obj.ea_score = score || '';
					obj.ea_verify_at = verify_at;
					obj.ea_smtp_provider = smtp_provider || '';
					obj.ea_mx_records = mx_records?.join(', ') || '';
					delete obj.bb;
				}
				// if (obj.profile_data) {
				// 	const {
				// 		fullName,
				// 		public_identifier,
				// 		headline,
				// 		followers,
				// 		connections,
				// 		location,
				// 		skills,
				// 	} = obj.profile_data;
				// 	obj.person_linkedin_url = public_identifier
				// 		? `https://linkedin.com/in/${public_identifier}`
				// 		: '';
				// 	obj.person_fullname = fullName;
				// 	obj.headline = headline;
				// 	obj.location = location;
				// 	obj.skills = skills;
				// 	obj.followers = followers;
				// 	obj.connections = connections;
				// }
				// if (obj.company_data) {
				// 	const {
				// 		company_name,
				// 		universal_name_id,
				// 		tagline,
				// 		website,
				// 		founded,
				// 		type,
				// 		industries,
				// 		company_size,
				// 		headquarters,
				// 	} = obj.company_data;

				// 	obj.company_linkedin_url = universal_name_id
				// 		? `https://linkedin.com/company/${universal_name_id}`
				// 		: '';
				// 	obj.company_name = company_name;
				// 	obj.tagline = tagline;
				// 	obj.website = website;
				// 	obj.founded = founded;
				// 	obj.type = type;
				// 	obj.industries = industries;
				// 	obj.company_size = company_size;
				// 	obj.headquarters = headquarters;
				// }
			});
			return arr;
		}

		data = flattenResultFields(data);
		data = removeSpecificKeysFromAllObjects(data, keysToRemove);
		data.sort((a, b) => {
			if (a.ea_status === 'deliverable' && b.ea_status !== 'deliverable') {
				return -1;
			} else if (
				a.ea_status !== 'deliverable' &&
				b.ea_status === 'deliverable'
			) {
				return 1;
			} else if (
				a.ea_status === 'deliverable' &&
				b.ea_status === 'deliverable'
			) {
				if (a.ea_mx_records && !b.ea_mx_records) {
					return -1;
				} else if (!a.ea_mx_records && b.ea_mx_records) {
					return 1;
				}
			}
			return 0;
		});

		var result = [data, data.length];

		return res.json(result);
	} catch (error) {
		console.log('Error Occured');
		return res.status(500).json({ success: false, error: error.message });
	}
});

const skrappFinder = async (firstName, lastName, companyName) => {
	try {
		const response = await axios.get(
			`https://api.skrapp.io/api/v2/find?firstName=${firstName}&lastName=${lastName}&domain=${companyName}`,
			{
				headers: {
					'X-Access-Key': process.env.SKRAPP_KEY,
					'Content-Type': 'application/json',
				},
			}
		);

		if (response?.data) {
			return { status: true, skrapp: response?.data };
		} else {
			return {
				status: false,
			};
		}
	} catch (err) {
		return { status: false };
	}
};

const anymailFinder = async (firstName, lastName, companyName) => {
	try {
		const response = await axios.post(
			`https://api.anymailfinder.com/v5.0/search/person.json`,
			{
				domain: companyName,
				first_name: firstName,
				last_name: lastName,
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.ANYMAIL_KEY}`,
					'Content-Type': 'application/json',
				},
			}
		);

		if (response?.data) {
			return { status: true, anymail: response?.data };
		} else {
			return {
				status: false,
			};
		}
	} catch (err) {
		return { status: false };
	}
};

const icypeasFinder = async (firstName, lastName, companyName) => {
	try {
		const response = await axios.post(
			`https://app.icypeas.com/api/email-search`,
			{
				domainOrCompany: companyName,
				firstname: firstName,
				lastname: lastName,
			},
			{
				headers: {
					Authorization: `${process.env.ICYPEAS_KEY}`,
					'Content-Type': 'application/json',
				},
			}
		);

		if (response?.data?.success === true) {
			const result = await axios.post(
				`https://app.icypeas.com/api/bulk-single-searchs/read`,
				{
					id: response?.data?.item?._id,
				},
				{
					headers: {
						Authorization: `${process.env.ICYPEAS_KEY}`,
						'Content-Type': 'application/json',
					},
				}
			);
			if (result?.data?.success === true) {
				const certaintyLevels = ['ultra_sure', 'very_sure', 'sure', 'probable'];

				var items = result?.data?.items[0];
				if (items) {
					var emailFound = {};
					var emails = items.results?.emails;
					for (const level of certaintyLevels) {
						const found = emails.find((obj) => obj.certainty === level);
						if (found) {
							emailFound = found;
							return;
						}
					}

					if (emailFound?.email) {
						return { status: true, icypeas: emailFound };
					} else {
						return { status: false };
					}
				} else {
					return { status: false };
				}
			} else {
				return { status: false };
			}
		} else {
			return {
				status: false,
			};
		}
	} catch (err) {
		return { status: false };
	}
};

async function transformLinkedInData(data) {
	return {
		fullName: `${data?.firstname} ${data?.lastname}`,
		linkedin_internal_id: data?.lid || null,
		first_name: data?.firstname,
		last_name: data?.lastname,
		public_identifier: data?.lid || null,
		background_cover_image_url: null, // No data available
		profile_photo: null, // No data available
		headline: data?.headline,
		location: `${data?.address?.addressLocality}, ${data?.address?.addressRegion}, ${data?.address?.addressCountry}`,
		connections: `${data?.numOfConnections} connections`,
		followers: null, // No data available
		about: data?.description,
		experience: data?.worksFor?.map((work) => ({
			position: work?.jobTitle,
			company_image: work?.company?.logo || null,
			company_name: work?.company?.name,
			location: `${work?.company?.address?.addressLocality}, ${work?.company?.address?.addressRegion}, ${work?.company?.address?.addressCountry}`,
			summary: work?.description,
			starts_at:
				work?.startDate &&
				new Date(work?.startDate).toLocaleString('en-US', {
					month: 'short',
					year: 'numeric',
				}),
			ends_at:
				work?.endDate === '0000-01-01T00:00:00.000Z'
					? 'Present'
					: new Date(work?.endDate).toLocaleString('en-US', {
							month: 'short',
							year: 'numeric',
					  }),
			duration: null, // No data available to calculate
		})),
		education: data?.educations?.map((edu) => ({
			college_url: `https://www.linkedin.com/school/${edu?.urn
				?.split(':')
				.pop()}/`,
			college_name: edu?.name,
			college_image: null, // No data available
			college_degree: edu?.degree,
			college_degree_field: edu?.fieldsOfStudy
				.map((field) => field?.value)
				.join(', '),
			college_duration:
				edu?.startDate &&
				`${new Date(edu?.startDate).toLocaleString('en-US', {
					month: 'short',
					year: 'numeric',
				})} - ${new Date(edu?.endDate).toLocaleString('en-US', {
					month: 'short',
					year: 'numeric',
				})}`,
			college_activity: '',
		})),
		skills: data?.skills?.length > 0 ? data?.skills : [],
	};
}

async function formatCompanyData(work) {
	return {
		company_name: work?.company?.name,
		universal_name_id: work?.company?.lid || null,
		background_cover_image_url: work?.company?.coverPhoto || null,
		linkedin_internal_id: work?.company?.lid || null,
		profile_photo: work?.company?.logo || null,
		domainTld: work?.company?.website
			? new URL(work?.company?.website).hostname.split('.').pop()
			: null,
		industry: work?.company?.industry || null,
		location: `${work?.company?.address?.addressLocality}, ${work?.company?.address?.addressRegion}`,
		follower_count: work?.company?.followers
			? `${work?.company?.followers} followers`
			: null,
		tagline: work?.company?.tagline || '',
		company_size_on_linkedin: null,
		about: work?.company?.description || '',
		website: work?.company?.website || '',
		industries: '',
		company_size: work?.company?.numberOfEmployees + ' employees',
		headquarters: `${work?.company?.address?.addressLocality}, ${work?.company?.address?.addressRegion}`,
		type: work?.company?.type || '',
		founded: work?.company?.foundedYear || '',
		specialties: work?.company?.specialties || [],
	};
}

router.get('/profileUrlData', [authorize.verifyToken], async (req, res) => {
	try {
		console.log('PD, ok');
		const person = req.person;
		if (!person)
			return res
				.status(400)
				.json({ success: false, msg: 'Account not found!' });

		if (!req.query.url) {
			return res.status(400).json({
				success: false,
				msg: 'Provide a valid linkedin profile url.',
			});
		}

		console.log('PD, ok2');
		const scrapeRes = await axios.get(
			`https://app.icypeas.com/api/scrape/profile?url=${req.query.url}`,
			{
				headers: {
					Authorization: process.env.ICYPEAS_KEY,
				},
			}
		);

		if (scrapeRes?.data?.status === 'FOUND') {
			return res
				.status(200)
				.json({ message: 'Found', result: scrapeRes?.data?.result });
		} else {
			return res.status(200).json({ message: 'Not Found', result: null });
		}
	} catch (error) {
		console.log('PD', error?.message);
		res.status(500).json({ success: false, error: error?.message });
	}
});

router.post(
	'/singleFinder',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res
					.status(400)
					.json({ success: false, msg: 'Account not found!' });

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				if (person.credits < 3) {
					return res
						.status(400)
						.json({ success: false, msg: 'Not enough credits.' });
				}
			}

			if (!req.body.type) {
				req.body.type = 'Domain';
			}

			let scrapeData = null;

			if (req.body.scrapeData) {
				scrapeData = req.body.scrapeData;
			}

			if (req.body.type === 'Profile') {
				if (!req.body.profileUrl) {
					return res.status(400).json({
						success: false,
						msg: 'Provide a valid linkedin profile url.',
					});
				}

				console.log('SF, ok2');
				const scrapeRes = await axios.get(
					`https://app.icypeas.com/api/scrape/profile?url=${req.body.profileUrl}`,
					{
						headers: {
							Authorization: process.env.ICYPEAS_KEY,
						},
					}
				);

				if (scrapeRes?.data?.status === 'FOUND') {
					scrapeData = scrapeRes?.data?.result;
					req.body.firstName = scrapeRes?.data?.result?.firstname;
					req.body.lastName = scrapeRes?.data?.result?.lastname;
					req.body.domain =
						scrapeRes?.data?.result?.worksFor[0]?.company?.website;

					console.log(scrapeData);
				} else {
					console.log('undel');
					return res.status(200).json({
						success: true,
						data: { result: 'undeliverable' },
					});
				}
			}

			console.log(req.body.firstName, req.body.lastName, req.body.domain);
			if (req.body.firstName?.length < 3) {
				return res.status(400).json({
					success: false,
					msg: 'First name must be at least 3 characters.',
				});
			}
			if (req.body.lastName?.length < 3) {
				return res.status(400).json({
					success: false,
					msg: 'Last name must be at least 3 characters.',
				});
			}
			if (req.body.domain?.length < 3) {
				return res.status(400).json({
					success: false,
					msg: 'Company url or domain must be at least 3 characters.',
				});
			}

			var waterfallContinue = false;
			var provider = 'icypeas';
			var email = '';
			var finderRes = {};

			console.log('Started');
			const icypeasRes = await icypeasFinder(
				req.body.firstName,
				req.body.lastName,
				req.body.domain
			);

			if (icypeasRes.status === true) {
				waterfallContinue = false;
				provider = 'icypeas';
				finderRes = icypeasRes?.icypeas;
				email = icypeasRes?.icypeas?.email;
			} else {
				waterfallContinue = true;
			}

			console.log('Vendor 2', waterfallContinue);
			if (waterfallContinue) {
				const anymailRes = await anymailFinder(
					req.body.firstName,
					req.body.lastName,
					req.body.domain
				);

				if (anymailRes.status === true) {
					if (anymailRes?.anymail?.success) {
						waterfallContinue = false;
						provider = 'anymail';
						finderRes = anymailRes?.anymail?.results;
						email = anymailRes?.anymail?.results?.email;
					} else {
						waterfallContinue = true;
					}
				} else {
					waterfallContinue = true;
				}
			} else {
				const modifiedFinderRes = {
					...finderRes,
					mx_records: finderRes.mxRecords,
					smtp_provider: finderRes.smtpProvider,
				};

				const data = await SingleEmailFinder.create({
					person: req.person._id,
					firstName: req.body.firstName,
					lastName: req.body.lastName,
					domain: req.body.domain,
					...(req.person.role === 'COMPANY' || req.person.role === 'MEMBER'
						? { company: req.person._id }
						: {}),
					...(req.person.role === 'ADMIN' ? { admin: req.person._id } : {}),
					...(req.person.role === 'SUB_ADMIN'
						? { subadmin: req.person._id }
						: {}),
					email: email,
					...modifiedFinderRes,
					created_at: new Date().toISOString(),
				});

				if (person.role === 'COMPANY' || person.role === 'MEMBER') {
					let person2 =
						(await Companies.findById(req.person._id)) ||
						(await Members.findById(req.person._id).populate('company_id'));

					person2.credits = person2.credits - 3;
					await person2.save();

					if (person.role === 'COMPANY') {
						await CreditUsage.create({
							company: person._id,
							type: 'debit',
							product: 'Finder',
							credits: 3,
							isBulk: false,
							email: email,
						});
						const today = new Date().toISOString().split('T')[0];
						let entry = await CreditUsageData.findOne({
							company: person._id,
							date: today,
						});
						if (entry) {
							entry.credits = entry.credits + 3;
							await entry.save();
						} else {
							await CreditUsageData.create({
								company: person._id,
								date: today,
								credits: 3,
							});
						}
					} else {
						await CreditUsage.create({
							company: person.company_id._id,
							member: person._id,
							type: 'debit',
							product: 'Finder',
							credits: 3,
							isBulk: false,
							email: email,
						});
						const today = new Date().toISOString().split('T')[0];
						let entry = await CreditUsageData.findOne({
							member: person._id,
							date: today,
						});
						if (entry) {
							entry.credits += 3;
							await entry.save();
						} else {
							await CreditUsageData.create({
								company: person.company_id._id,
								member: person._id,
								date: today,
								credits: 3,
							});
						}
					}
				} else if (person.role === 'ADMIN') {
					await CreditUsage.create({
						admin: person._id,
						type: 'debit',
						product: 'Finder',
						credits: 3,
						isBulk: false,
						email: email,
					});
					const today = new Date().toISOString().split('T')[0];
					let entry = await CreditUsageData.findOne({
						admin: person._id,
						date: today,
					});
					if (entry) {
						entry.credits += 3;
						await entry.save();
					} else {
						await CreditUsageData.create({
							admin: person._id,
							date: today,
							credits: 3,
						});
					}
				} else if (person.role === 'SUB_ADMIN') {
					await CreditUsage.create({
						subadmin: person._id,
						type: 'debit',
						product: 'Finder',
						credits: 3,
						isBulk: false,
						email: email,
					});
					const today = new Date().toISOString().split('T')[0];
					let entry = await CreditUsageData.findOne({
						subadmin: person._id,
						date: today,
					});
					if (entry) {
						entry.credits += 3;
						await entry.save();
					} else {
						await CreditUsageData.create({
							subadmin: person._id,
							date: today,
							credits: 3,
						});
					}
				}

				if (req.body.type === 'Profile' || scrapeData) {
					const person_data = await transformLinkedInData(scrapeData);
					const company_data = await formatCompanyData(scrapeData?.worksFor[0]);
					await SingleEmailFinder.findByIdAndUpdate(data._id, {
						profile_data: person_data,
						company_data: company_data,
					});
				}

				if (req.body.findProfile) {
					try {
						const enrichmentRes = await axios.get(
							`https://api.enrichmentapi.io/reverse_email?api_key=${process.env.ENRICHMENT_KEY}&email=${email}`
						);

						if (enrichmentRes?.data?.status === 200) {
							const { person_data, company_data } = enrichmentRes?.data;

							await SingleEmailFinder.findByIdAndUpdate(data._id, {
								profile_data: person_data,
								company_data: company_data,
							});
						}
					} catch (err) {
						const result = await SingleEmailFinder.findById(data._id).select(
							'-alternatives -status -validation -id -is_disposable -is_accept_all -is_free -is_role -mode -quality'
						);

						return res.status(200).json({ success: true, data: result });
					}
				}

				const result = await SingleEmailFinder.findById(data._id).select(
					'-alternatives -status -validation -id -is_disposable -is_accept_all -is_free -is_role -mode -quality'
				);
				console.log(result);
				return res.status(200).json({ success: true, data: result });
			}

			console.log('Vendor 3', waterfallContinue);
			if (waterfallContinue) {
				const data = await SingleEmailFinder.create({
					person: req.person._id,
					firstName: req.body.firstName,
					lastName: req.body.lastName,
					domain: req.body.domain,
					...(req.person.role === 'COMPANY' || req.person.role === 'MEMBER'
						? { company: req.person._id }
						: {}),
					...(req.person.role === 'ADMIN' ? { admin: req.person._id } : {}),
					...(req.person.role === 'SUB_ADMIN'
						? { subadmin: req.person._id }
						: {}),
					result: 'undeliverable',
					created_at: new Date().toISOString(),
				});

				const result = await SingleEmailFinder.findById(data._id).select(
					'-alternatives -status -validation -id -is_disposable -is_accept_all -is_free -is_role -mode -quality'
				);

				console.log(result);
				return res.status(200).json({ success: true, data: result });
			}

			var resp = await axios.get(
				`https://api.bounceban.com/v1/verify/single?email=${email}`,
				{
					headers: {
						Authorization: process.env.BOUNCEBAN_KEY,
					},
				}
			);

			if (resp?.data) {
				const { credits_remaining, ...filteredData } = resp.data;

				const data = await SingleEmailFinder.create({
					person: req.person._id,
					firstName: req.body.firstName,
					lastName: req.body.lastName,
					domain: req.body.domain,
					...(req.person.role === 'COMPANY' || req.person.role === 'MEMBER'
						? { company: req.person._id }
						: {}),
					...(req.person.role === 'ADMIN' ? { admin: req.person._id } : {}),
					...(req.person.role === 'SUB_ADMIN'
						? { subadmin: req.person._id }
						: {}),
					email: email,
					...finderRes,
					...filteredData,
					created_at: new Date().toISOString(),
				});

				if (resp?.data?.result === 'deliverable') {
					if (person.role === 'COMPANY' || person.role === 'MEMBER') {
						let person2 =
							(await Companies.findById(req.person._id)) ||
							(await Members.findById(req.person._id).populate('company_id'));

						person2.credits = person2.credits - 3;
						await person2.save();

						if (person.role === 'COMPANY') {
							await CreditUsage.create({
								company: person._id,
								type: 'debit',
								product: 'Finder',
								credits: 3,
								isBulk: false,
								email: email,
							});
							const today = new Date().toISOString().split('T')[0];
							let entry = await CreditUsageData.findOne({
								company: person._id,
								date: today,
							});
							if (entry) {
								entry.credits = entry.credits + 3;
								await entry.save();
							} else {
								await CreditUsageData.create({
									company: person._id,
									date: today,
									credits: 3,
								});
							}
						} else {
							await CreditUsage.create({
								company: person.company_id._id,
								member: person._id,
								type: 'debit',
								product: 'Finder',
								credits: 3,
								isBulk: false,
								email: email,
							});
							const today = new Date().toISOString().split('T')[0];
							let entry = await CreditUsageData.findOne({
								member: person._id,
								date: today,
							});
							if (entry) {
								entry.credits += 3;
								await entry.save();
							} else {
								await CreditUsageData.create({
									company: person.company_id._id,
									member: person._id,
									date: today,
									credits: 3,
								});
							}
						}
					} else if (person.role === 'ADMIN') {
						await CreditUsage.create({
							admin: person._id,
							type: 'debit',
							product: 'Finder',
							credits: 3,
							isBulk: false,
							email: email,
						});
						const today = new Date().toISOString().split('T')[0];
						let entry = await CreditUsageData.findOne({
							admin: person._id,
							date: today,
						});
						if (entry) {
							entry.credits += 3;
							await entry.save();
						} else {
							await CreditUsageData.create({
								admin: person._id,
								date: today,
								credits: 3,
							});
						}
					} else if (person.role === 'SUB_ADMIN') {
						await CreditUsage.create({
							subadmin: person._id,
							type: 'debit',
							product: 'Finder',
							credits: 3,
							isBulk: false,
							email: email,
						});
						const today = new Date().toISOString().split('T')[0];
						let entry = await CreditUsageData.findOne({
							subadmin: person._id,
							date: today,
						});
						if (entry) {
							entry.credits += 3;
							await entry.save();
						} else {
							await CreditUsageData.create({
								subadmin: person._id,
								date: today,
								credits: 3,
							});
						}
					}

					if (req.body.type === 'Profile' || scrapeData) {
						const person_data = await transformLinkedInData(scrapeData);

						const company_data = await formatCompanyData(
							scrapeData?.worksFor[0]
						);

						await SingleEmailFinder.findByIdAndUpdate(data._id, {
							profile_data: person_data,
							company_data: company_data,
						});
					}

					if (req.body.findProfile) {
						try {
							const enrichmentRes = await axios.get(
								`https://api.enrichmentapi.io/reverse_email?api_key=${process.env.ENRICHMENT_KEY}&email=${email}`
							);

							if (enrichmentRes?.data?.status === 200) {
								const { person_data, company_data } = enrichmentRes?.data;

								await SingleEmailFinder.findByIdAndUpdate(data._id, {
									$set: {
										profile_data: person_data,
										company_data: company_data,
									},
								});
							}
						} catch (err) {
							const result = await SingleEmailFinder.findById(data._id).select(
								'-alternatives -status -validation -id -is_disposable -is_accept_all -is_free -is_role -mode -quality'
							);
							return res.status(200).json({ success: true, data: result });
						}
					}
				}
				const result = await SingleEmailFinder.findById(data._id).select(
					'-alternatives -status -validation -id -is_disposable -is_accept_all -is_free -is_role -mode -quality'
				);

				console.log(result);
				return res.status(200).json({ success: true, data: result });
			} else {
				console.log('error');
				return res
					.status(400)
					.json({ success: false, msg: 'Please try again later.' });
			}
		} catch (error) {
			console.log(error);
			res.status(500).json({ success: false, error: error.message });
		}
	}
);

router.post(
	'/findEmail',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				if (person.credits < 3) {
					return res.status(400).json('Not enough credits.');
				}
			}

			const response = await axios.get(
				`https://api.skrapp.io/api/v2/find?firstName=${req.body.firstName}&lastName=${req.body.lastName}&domain=${req.body.companyName}`,
				{
					headers: {
						'X-Access-Key': process.env.SKRAPP_KEY,
						'Content-Type': 'application/json',
					},
				}
			);

			console.log(response.data);

			var continueCheck = false;
			if (response?.data) {
				if (response?.data?.quality?.status !== 'valid') {
					try {
						const finderRes = await axios.post(
							`https://api.anymailfinder.com/v5.0/search/person.json`,
							{
								domain: req.body.companyName,
								first_name: req.body.firstName,
								last_name: req.body.lastName,
							},
							{
								headers: {
									Authorization: `Bearer ${process.env.ANYMAIL_KEY}`,
									'Content-Type': 'application/json',
								},
							}
						);

						if (finderRes?.data?.success) {
							const resp = await axios.get(
								`https://api.bounceban.com/v1/verify/single?email=${finderRes?.data?.results?.email}`,
								{
									headers: {
										Authorization: process.env.BOUNCEBAN_KEY,
									},
								}
							);

							if (resp?.data) {
								const { credits_remaining, ...filteredData } = resp.data;

								const data = await SingleEmailFinder.create({
									person: req.person._id,
									firstName: req.body.firstName,
									lastName: req.body.lastName,
									domain: req.body.companyName,
									...(req.person.role === 'COMPANY' ||
									req.person.role === 'MEMBER'
										? { company: req.person._id }
										: {}),
									...(req.person.role === 'ADMIN'
										? { admin: req.person._id }
										: {}),
									...(req.person.role === 'SUB_ADMIN'
										? { subadmin: req.person._id }
										: {}),
									...response.data,
									...filteredData,
									email: finderRes?.data?.results?.email,
									created_at: new Date().toISOString(),
								});

								if (resp?.data?.result === 'deliverable') {
									if (person.role === 'COMPANY' || person.role === 'MEMBER') {
										let person2 =
											(await Companies.findById(req.person._id)) ||
											(await Members.findById(req.person._id).populate(
												'company_id'
											));

										person2.credits = person2.credits - 3;
										await person2.save();

										if (person.role === 'COMPANY') {
											await CreditUsage.create({
												company: person._id,
												type: 'debit',
												product: 'Finder',
												credits: 3,
												isBulk: false,
												email: response?.data?.email,
											});
											const today = new Date().toISOString().split('T')[0];
											let entry = await CreditUsageData.findOne({
												company: person._id,
												date: today,
											});
											if (entry) {
												entry.credits = entry.credits + 3;
												await entry.save();
											} else {
												await CreditUsageData.create({
													company: person._id,
													date: today,
													credits: 3,
												});
											}
										} else {
											await CreditUsage.create({
												company: person.company_id._id,
												member: person._id,
												type: 'debit',
												product: 'Finder',
												credits: 3,
												isBulk: false,
												email: response?.data?.email,
											});
											const today = new Date().toISOString().split('T')[0];
											let entry = await CreditUsageData.findOne({
												member: person._id,
												date: today,
											});
											if (entry) {
												entry.credits += 3;
												await entry.save();
											} else {
												await CreditUsageData.create({
													company: person.company_id._id,
													member: person._id,
													date: today,
													credits: 3,
												});
											}
										}
									} else if (person.role === 'ADMIN') {
										await CreditUsage.create({
											admin: person._id,
											type: 'debit',
											product: 'Finder',
											credits: 3,
											isBulk: false,
											email: response?.data?.email,
										});
										const today = new Date().toISOString().split('T')[0];
										let entry = await CreditUsageData.findOne({
											admin: person._id,
											date: today,
										});
										if (entry) {
											entry.credits += 3;
											await entry.save();
										} else {
											await CreditUsageData.create({
												admin: person._id,
												date: today,
												credits: 3,
											});
										}
									} else if (person.role === 'SUB_ADMIN') {
										await CreditUsage.create({
											subadmin: person._id,
											type: 'debit',
											product: 'Finder',
											credits: 3,
											isBulk: false,
											email: response?.data?.email,
										});
										const today = new Date().toISOString().split('T')[0];
										let entry = await CreditUsageData.findOne({
											subadmin: person._id,
											date: today,
										});
										if (entry) {
											entry.credits += 3;
											await entry.save();
										} else {
											await CreditUsageData.create({
												subadmin: person._id,
												date: today,
												credits: 3,
											});
										}
									}
								}
								return res.status(200).json({ data });
							} else {
								return res.status(400).json('Please try again later.');
							}
						} else {
							continueCheck = true;
						}
					} catch (err) {
						if (response?.data?.email) {
							const resp = await axios.get(
								`https://api.bounceban.com/v1/verify/single?email=${response?.data?.email}`,
								{
									headers: {
										Authorization: process.env.BOUNCEBAN_KEY,
									},
								}
							);

							if (resp?.data) {
								const { credits_remaining, ...filteredData } = resp.data;

								const data = await SingleEmailFinder.create({
									person: req.person._id,
									firstName: req.body.firstName,
									lastName: req.body.lastName,
									domain: req.body.companyName,
									...(req.person.role === 'COMPANY' ||
									req.person.role === 'MEMBER'
										? { company: req.person._id }
										: {}),
									...(req.person.role === 'ADMIN'
										? { admin: req.person._id }
										: {}),
									...(req.person.role === 'SUB_ADMIN'
										? { subadmin: req.person._id }
										: {}),
									...response.data,
									...filteredData,
									created_at: new Date().toISOString(),
								});

								if (resp?.data?.result === 'deliverable') {
									if (person.role === 'COMPANY' || person.role === 'MEMBER') {
										let person2 =
											(await Companies.findById(req.person._id)) ||
											(await Members.findById(req.person._id).populate(
												'company_id'
											));

										person2.credits = person2.credits - 3;
										await person2.save();

										if (person.role === 'COMPANY') {
											await CreditUsage.create({
												company: person._id,
												type: 'debit',
												product: 'Finder',
												credits: 3,
												isBulk: false,
												email: response?.data?.email,
											});
											const today = new Date().toISOString().split('T')[0];
											let entry = await CreditUsageData.findOne({
												company: person._id,
												date: today,
											});
											if (entry) {
												entry.credits = entry.credits + 3;
												await entry.save();
											} else {
												await CreditUsageData.create({
													company: person._id,
													date: today,
													credits: 3,
												});
											}
										} else {
											await CreditUsage.create({
												company: person.company_id._id,
												member: person._id,
												type: 'debit',
												product: 'Finder',
												credits: 3,
												isBulk: false,
												email: response?.data?.email,
											});
											const today = new Date().toISOString().split('T')[0];
											let entry = await CreditUsageData.findOne({
												member: person._id,
												date: today,
											});
											if (entry) {
												entry.credits += 3;
												await entry.save();
											} else {
												await CreditUsageData.create({
													company: person.company_id._id,
													member: person._id,
													date: today,
													credits: 3,
												});
											}
										}
									} else if (person.role === 'ADMIN') {
										await CreditUsage.create({
											admin: person._id,
											type: 'debit',
											product: 'Finder',
											credits: 3,
											isBulk: false,
											email: response?.data?.email,
										});
										const today = new Date().toISOString().split('T')[0];
										let entry = await CreditUsageData.findOne({
											admin: person._id,
											date: today,
										});
										if (entry) {
											entry.credits += 3;
											await entry.save();
										} else {
											await CreditUsageData.create({
												admin: person._id,
												date: today,
												credits: 3,
											});
										}
									} else if (person.role === 'SUB_ADMIN') {
										await CreditUsage.create({
											subadmin: person._id,
											type: 'debit',
											product: 'Finder',
											credits: 3,
											isBulk: false,
											email: response?.data?.email,
										});
										const today = new Date().toISOString().split('T')[0];
										let entry = await CreditUsageData.findOne({
											subadmin: person._id,
											date: today,
										});
										if (entry) {
											entry.credits += 3;
											await entry.save();
										} else {
											await CreditUsageData.create({
												subadmin: person._id,
												date: today,
												credits: 3,
											});
										}
									}
								}
								return res.status(200).json({ data });
							} else {
								return res.status(400).json('Please try again later.');
							}
						}
					}
				} else {
					continueCheck = true;
				}
			}

			if (continueCheck) {
				if (response?.data?.email) {
					const resp = await axios.get(
						`https://api.bounceban.com/v1/verify/single?email=${response?.data?.email}`,
						{
							headers: {
								Authorization: process.env.BOUNCEBAN_KEY,
							},
						}
					);

					if (resp?.data) {
						const { credits_remaining, ...filteredData } = resp.data;

						const data = await SingleEmailFinder.create({
							person: req.person._id,
							firstName: req.body.firstName,
							lastName: req.body.lastName,
							domain: req.body.companyName,
							...(req.person.role === 'COMPANY' || req.person.role === 'MEMBER'
								? { company: req.person._id }
								: {}),
							...(req.person.role === 'ADMIN' ? { admin: req.person._id } : {}),
							...(req.person.role === 'SUB_ADMIN'
								? { subadmin: req.person._id }
								: {}),
							...response.data,
							...filteredData,
							created_at: new Date().toISOString(),
						});

						if (resp?.data?.result === 'deliverable') {
							if (person.role === 'COMPANY' || person.role === 'MEMBER') {
								let person2 =
									(await Companies.findById(req.person._id)) ||
									(await Members.findById(req.person._id).populate(
										'company_id'
									));

								person2.credits = person2.credits - 3;
								await person2.save();

								if (person.role === 'COMPANY') {
									await CreditUsage.create({
										company: person._id,
										type: 'debit',
										product: 'Finder',
										credits: 3,
										isBulk: false,
										email: response?.data?.email,
									});
									const today = new Date().toISOString().split('T')[0];
									let entry = await CreditUsageData.findOne({
										company: person._id,
										date: today,
									});
									if (entry) {
										entry.credits = entry.credits + 3;
										await entry.save();
									} else {
										await CreditUsageData.create({
											company: person._id,
											date: today,
											credits: 3,
										});
									}
								} else {
									await CreditUsage.create({
										company: person.company_id._id,
										member: person._id,
										type: 'debit',
										product: 'Finder',
										credits: 3,
										isBulk: false,
										email: response?.data?.email,
									});
									const today = new Date().toISOString().split('T')[0];
									let entry = await CreditUsageData.findOne({
										member: person._id,
										date: today,
									});
									if (entry) {
										entry.credits += 3;
										await entry.save();
									} else {
										await CreditUsageData.create({
											company: person.company_id._id,
											member: person._id,
											date: today,
											credits: 3,
										});
									}
								}
							} else if (person.role === 'ADMIN') {
								await CreditUsage.create({
									admin: person._id,
									type: 'debit',
									product: 'Finder',
									credits: 3,
									isBulk: false,
									email: response?.data?.email,
								});
								const today = new Date().toISOString().split('T')[0];
								let entry = await CreditUsageData.findOne({
									admin: person._id,
									date: today,
								});
								if (entry) {
									entry.credits += 3;
									await entry.save();
								} else {
									await CreditUsageData.create({
										admin: person._id,
										date: today,
										credits: 3,
									});
								}
							} else if (person.role === 'SUB_ADMIN') {
								await CreditUsage.create({
									subadmin: person._id,
									type: 'debit',
									product: 'Finder',
									credits: 3,
									isBulk: false,
									email: response?.data?.email,
								});
								const today = new Date().toISOString().split('T')[0];
								let entry = await CreditUsageData.findOne({
									subadmin: person._id,
									date: today,
								});
								if (entry) {
									entry.credits += 3;
									await entry.save();
								} else {
									await CreditUsageData.create({
										subadmin: person._id,
										date: today,
										credits: 3,
									});
								}
							}
						}
						return res.status(200).json({ data });
					} else {
						return res.status(400).json('Please try again later.');
					}
				}
			}
			return res.status(400).json('Try again later');
		} catch (error) {
			res.status(400).json(error);
		}
	}
);

router.get('/singleFinderData', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person)
			return res.status(400).json(errormessage('Account not found!'));

		var page = req.query.page || 1;
		var limit = req.query.limit || 10;

		const totalCount = await SingleEmailFinder.countDocuments({
			person: req.person._id,
		});

		const data = await SingleEmailFinder.find({ person: req.person._id })
			.select(
				'-id -is_disposable -is_accept_all -is_free -is_role -mode -quality'
			)
			.sort({ created_at: -1 })
			.skip((page - 1) * limit)
			.limit(limit);

		let result = [];
		for (const rev of data) {
			result.push({ ...rev._doc, search_by: req.person.name });
		}

		return res.json({ data: { totalCount, data: result } });
	} catch (error) {
		res.status(400).json(error);
	}
});

router.get(
	'/singleFinderDownload',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res.status(400).json(errormessage('Account not found!'));

			const data = await SingleEmailFinder.find({ person: req.person._id })
				.select(
					'-id -is_disposable -is_accept_all -is_free -is_role -mode -quality'
				)
				.sort({ created_at: -1 });

			return res.json({ data });
		} catch (error) {
			res.status(400).json(error);
		}
	}
);

router.get(
	'/admin/fileVerifications',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			let company_id = req.query.company_id;

			var page = req.query.page ? Number(req.query.page) : 1;
			var limit = req.query.limit ? Number(req.query.limit) : 10;
			var skip = (page - 1) * limit;

			const fromDate = req.query.from ? new Date(req.query.from) : null;
			const toDate = req.query.to ? new Date(req.query.to) : null;

			const filter = { company: company_id };

			if (fromDate) {
				filter.created_at = { $gte: fromDate };
			}

			if (toDate) {
				toDate.setDate(toDate.getDate() + 1);
				filter.created_at = { ...filter.created_at, $lte: toDate };
			}

			let data = await FileVerifications.aggregate([
				{ $match: filter },
				{
					$group: {
						_id: '$sys_filename',
						SysFilenameCount: { $sum: 1 },
						NullCount: {
							$sum: { $cond: [{ $eq: ['$mvstatus', null] }, 1, 0] },
						},
						ValidCount: {
							$sum: { $cond: [{ $eq: ['$mvstatus', 'valid'] }, 1, 0] },
						},
						InvalidCount: {
							$sum: { $cond: [{ $eq: ['$mvstatus', 'invalid'] }, 1, 0] },
						},
						CatchAllCount: {
							$sum: { $cond: [{ $eq: ['$mvstatus', 'catch_all'] }, 1, 0] },
						},
						MaxCreatedAt: { $max: '$created_at' },
					},
				},
				{ $sort: { MaxCreatedAt: -1 } },
				{ $skip: skip },
				{ $limit: limit },
			]);

			let final = [[], 0];

			if (data.length) {
				const sys_filenames = data.map((obj) => obj._id);

				let result = await FileVerifications.aggregate([
					{ $match: { sys_filename: { $in: sys_filenames } } },
					{ $sort: { sys_filename: 1, created_at: -1 } },
					{
						$group: {
							_id: '$sys_filename',
							data: { $first: '$$ROOT' },
						},
					},
					{ $replaceRoot: { newRoot: '$data' } },
				]);

				const countsBySysFilename = {};

				// Populate counts from data[0] into the object
				for (const ele of data) {
					countsBySysFilename[ele._id] = {
						totalCount: ele.SysFilenameCount,
						nullCount: ele.NullCount,
						validCount: ele.ValidCount,
						catchAllCount: ele.CatchAllCount,
						invalidCount: ele.InvalidCount,
					};
				}

				// Update the result array with counts from the object
				for (const rev of result) {
					const sysFilename = rev.sys_filename;
					if (countsBySysFilename.hasOwnProperty(sysFilename)) {
						const counts = countsBySysFilename[sysFilename];
						rev['totalCount'] = counts.totalCount;
						rev['nullCount'] = counts.nullCount;
						rev['validCount'] = counts.validCount;
						rev['catchAllCount'] = counts.catchAllCount;
						rev['invalidCount'] = counts.invalidCount;
					}
				}

				final[0] = result;
				final[1] = result.length;
			}

			const totalPages = await FileVerifications.aggregate([
				{ $match: filter },
				{ $group: { _id: '$sys_filename' } },
				{ $count: 'TotalCount' },
			]);

			const pages =
				totalPages.length > 0 ? Math.ceil(totalPages[0].TotalCount / limit) : 0;

			const totalsys = await FileVerifications.countDocuments(filter);
			const statusCounts = await FileVerifications.aggregate([
				{
					$match: {
						mvstatus: { $in: ['valid', 'invalid', 'catch_all'] },
						...filter,
					},
				},
				{
					$group: {
						_id: '$mvstatus',
						count: { $sum: 1 },
					},
				},
			]);

			let totalCount = [
				[
					{
						mvstatus: 'Total',
						Count: totalsys,
					},
					{
						mvstatus: 'valid',
						Count: 0,
					},
					{
						mvstatus: 'catch_all',
						Count: 0,
					},
					{
						mvstatus: 'invalid',
						Count: 0,
					},
				],
			];

			statusCounts.forEach((item) => {
				if (item._id === 'valid') {
					totalCount[0][1].Count = item.count;
				} else if (item._id === 'invalid') {
					totalCount[0][3].Count = item.count;
				} else if (item._id === 'catch_all') {
					totalCount[0][2].Count = item.count;
				}
			});

			return res.json({ pages, totalCount, final });
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get('/admin/bounce', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		let company_id = req.query.company_id;

		var page = req.query.page ? Number(req.query.page) : 1;
		var limit = req.query.limit ? Number(req.query.limit) : 10;
		var skip = (page - 1) * limit;

		let data = await BounceRepos.aggregate([
			{ $match: { company: company_id } },
			{ $sort: { sys_filename: 1, created_at: -1 } },
			{
				$group: {
					_id: '$sys_filename',
					data: { $first: '$$ROOT' },
				},
			},
			{ $replaceRoot: { newRoot: '$data' } },
			{ $skip: skip },
			{ $limit: limit },
		]);

		const totalCount = await BounceRepos.countDocuments({
			company: company_id,
		});
		const totalPages = await BounceRepos.distinct('sys_filename', {
			company: company_id,
		});
		const pages = Math.ceil(totalPages.length / limit);

		return res.json({ pages, totalCount, data });
	} catch (error) {
		res.status(400).json(error.message);
	}
});

router.get('/admin/companyFile', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');
		let company_id = req.query.company_id;

		var page = req.query.page ? Number(req.query.page) : 1;
		var limit = req.query.limit ? Number(req.query.limit) : 10;
		var skip = (page - 1) * limit;

		let data = await CompanyFiles.aggregate([
			{ $match: { company_id: company_id } },
			{ $sort: { sys_filename: 1, created_at: -1 } },
			{
				$group: {
					_id: '$sys_filename',
					data: { $first: '$$ROOT' },
				},
			},
			{ $replaceRoot: { newRoot: '$data' } },
			{ $skip: skip },
			{ $limit: limit },
		]);

		const totalCount = await CompanyFiles.countDocuments({
			company_id: company_id,
		});
		const totalPages = await CompanyFiles.distinct('sys_filename', {
			company_id: company_id,
		});
		const pages = Math.ceil(totalPages.length / limit);

		return res.json({ pages, totalCount, data });
	} catch (error) {
		res.status(400).json(error.message);
	}
});

router.get('/admin/projectFile', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person) return res.status(400).json('Account not found!');

		let company_id = req.query.company_id;
		var page = req.query.page ? Number(req.query.page) : 1;
		var limit = req.query.limit ? Number(req.query.limit) : 10;
		var skip = (page - 1) * limit;

		let data = await ProjectFiles.aggregate([
			{ $match: { company_id: company_id } },
			{ $sort: { sys_filename: 1, created_at: -1 } },
			{
				$group: {
					_id: '$sys_filename',
					data: { $first: '$$ROOT' },
				},
			},
			{ $replaceRoot: { newRoot: '$data' } },
			{ $skip: skip },
			{ $limit: limit },
		]);

		const totalCount = await ProjectFiles.countDocuments({
			company_id: company_id,
		});
		const totalPages = await ProjectFiles.distinct('sys_filename', {
			company_id: company_id,
		});
		const pages = Math.ceil(totalPages.length / limit);

		return res.json({ pages, totalCount, data });
	} catch (error) {
		res.status(400).json(error.message);
	}
});

router.get(
	'/admin/common/fileVerifications',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			var page = req.query.page ? Number(req.query.page) : 1;
			var limit = req.query.limit ? Number(req.query.limit) : 10;
			var skip = (page - 1) * limit;

			// let filter = { company: { $exists: true } };

			let data = await FileVerifications.aggregate([
				// { $match: filter },
				{
					$group: {
						_id: '$sys_filename',
						RepeatCount: { $sum: 1 },
						progress_status: { $first: '$progress_status' },
						e_status: { $first: '$e_status' },
						uploaded: { $first: '$uploaded' },
						other_vendor_counts: { $first: '$other_vendor_counts' },
						vendor: { $first: '$vendor' },
						total_count: { $first: '$total_count' },
						filename: { $first: '$filename' },
						party_counts: { $first: '$party_counts' },
						ea_counts: { $first: '$ea_counts' },
						uploadby: { $first: '$uploadby' },
						progress: { $first: '$progress' },
						verified: { $first: '$verified' },
						created_at: { $first: '$created_at' },
					},
				},
				{ $sort: { created_at: -1 } },
				{ $skip: skip },
				{ $limit: limit },
			]);

			data = data.map((doc) => ({
				...doc,
				sys_filename: doc._id,
			}));

			const totalCountPipeline = [
				// { $match: filter },
				{ $group: { _id: null, TotalCount: { $sum: 1 } } },
			];
			const totalCountResult = await FileVerifications.aggregate(
				totalCountPipeline
			);
			const totalCount =
				totalCountResult.length > 0 ? totalCountResult[0].TotalCount : 0;

			const distinctCountPipeline = [
				// { $match: filter },
				{ $group: { _id: '$sys_filename' } },
				{ $count: 'TotalCount' },
			];
			const distinctCountResult = await FileVerifications.aggregate(
				distinctCountPipeline
			);
			const totalPages =
				distinctCountResult.length > 0 ? distinctCountResult[0].TotalCount : 0;

			const pages = Math.ceil(totalPages / limit);

			return res.json({
				pages,
				totalPages,
				totalCount,
				data: [data, data.length],
			});
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/admin/common/bounce',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			var page = req.query.page ? Number(req.query.page) : 1;
			var limit = req.query.limit ? Number(req.query.limit) : 10;
			var skip = (page - 1) * limit;

			let data = await BounceRepos.aggregate([
				{ $match: { company: { $exists: true } } }, // Filter out null values
				{
					$group: {
						_id: '$sys_filename',
						status: { $first: '$status' },
						total_count: { $first: '$total_count' },
						company: { $first: '$company' },
						filename: { $first: '$filename' },
						uploadby: { $first: '$uploadby' },
						created_at: { $first: '$created_at' },
						RepeatCount: { $sum: 1 },
					},
				},
				{
					$sort: { created_at: -1 },
				},
				{
					$skip: skip,
				},
				{
					$limit: limit,
				},
			]);

			const totalCount = await BounceRepos.countDocuments({
				company: { $exists: true },
			});

			const totalPages = await BounceRepos.aggregate([
				{ $match: { company: { $exists: true } } }, // Filter out null values
				{
					$group: {
						_id: '$sys_filename',
						RepeatCount: { $sum: 1 },
					},
				},
			]);

			var pages = Math.ceil(totalPages.length / limit);

			return res.json({ pages, totalPages, totalCount, data });
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/admin/common/companyFile',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			var page = req.query.page ? Number(req.query.page) : 1;
			var limit = req.query.limit ? Number(req.query.limit) : 10;
			var skip = (page - 1) * limit;

			let data = await CompanyFiles.aggregate([
				{ $match: { company_id: { $exists: true } } }, // Filter out null values
				{
					$group: {
						_id: '$sys_filename',
						progress_status: { $first: '$progress_status' },
						total_count: { $first: '$total_count' },
						company_id: { $first: '$company_id' },
						filename: { $first: '$filename' },
						uploadby: { $first: '$uploadby' },
						created_at: { $first: '$created_at' },
						RepeatCount: { $sum: 1 },
					},
				},
				{
					$sort: { created_at: -1 },
				},
				{
					$skip: skip,
				},
				{
					$limit: limit,
				},
			]);

			const totalCount = await CompanyFiles.countDocuments({
				company_id: { $exists: true },
			});

			const totalPages = await CompanyFiles.aggregate([
				{ $match: { company_id: { $exists: true } } }, // Filter out null values
				{
					$group: {
						_id: '$sys_filename',
						RepeatCount: { $sum: 1 },
					},
				},
			]);

			var pages = Math.ceil(totalPages.length / limit);

			return res.json({ pages, totalPages, totalCount, data });
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/admin/common/projectFile',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			var page = req.query.page ? Number(req.query.page) : 1;
			var limit = req.query.limit ? Number(req.query.limit) : 10;
			var skip = (page - 1) * limit;

			let data = await ProjectFiles.aggregate([
				{ $match: { company_id: { $exists: true } } }, // Filter out null values
				{
					$group: {
						_id: '$sys_filename',
						progress_status: { $first: '$progress_status' },
						total_count: { $first: '$total_count' },
						company_id: { $first: '$company_id' },
						filename: { $first: '$filename' },
						uploadby: { $first: '$uploadby' },
						created_at: { $first: '$created_at' },
						RepeatCount: { $sum: 1 },
					},
				},
				{
					$sort: { created_at: -1 },
				},
				{
					$skip: skip,
				},
				{
					$limit: limit,
				},
			]);

			const totalCount = await ProjectFiles.countDocuments({
				company_id: { $exists: true },
			});

			const totalPages = await ProjectFiles.aggregate([
				{ $match: { company_id: { $exists: true } } }, // Filter out null values
				{
					$group: {
						_id: '$sys_filename',
						RepeatCount: { $sum: 1 },
					},
				},
			]);

			var pages = Math.ceil(totalPages.length / limit);

			return res.json({ pages, totalPages, totalCount, data });
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/admin/common/enhancerFile',
	[authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person) return res.status(400).json('Account not found!');

			var page = req.query.page ? Number(req.query.page) : 1;
			var limit = req.query.limit ? Number(req.query.limit) : 10;
			var skip = (page - 1) * limit;

			let data = await EnhancerFiles.aggregate([
				// { $match: { company_id: { $exists: true } } },
				{
					$group: {
						_id: '$sys_filename',
						progress_status: { $first: '$progress_status' },
						total_count: { $first: '$total_count' },
						deliverable_count: { $first: '$deliverable_count' },
						company_id: { $first: '$company_id' },
						filename: { $first: '$filename' },
						uploadby: { $first: '$uploadby' },
						progress: { $first: '$progress' },
						appended: { $first: '$appended' },
						party_counts: { $first: '$party_counts' },
						created_at: { $first: '$created_at' },
						RepeatCount: { $sum: 1 },
					},
				},
				{
					$sort: { created_at: -1 },
				},
				{
					$skip: skip,
				},
				{
					$limit: limit,
				},
			]);

			data = data.map((doc) => ({
				...doc,
				sys_filename: doc._id,
			}));

			const totalCount = await EnhancerFiles.countDocuments({
				// company_id: { $exists: true },
			});

			const totalPages = await EnhancerFiles.aggregate([
				// { $match: { company_id: { $exists: true } } }, // Filter out null values
				{
					$group: {
						_id: '$sys_filename',
						RepeatCount: { $sum: 1 },
					},
				},
			]);

			var pages = Math.ceil(totalPages.length / limit);

			return res.json({
				pages,
				totalPages: totalPages?.length,
				totalCount,
				data: [data, data.length],
			});
		} catch (error) {
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/admin/commonSingleVerifies',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res.status(400).json(errormessage('Account not found!'));

			var page = req.query.page || 1;
			var limit = req.query.limit || 10;

			const totalCount = await SingleVerifier.countDocuments();
			const data = await SingleVerifier.find()
				.sort({ verify_at: -1 })
				.skip((page - 1) * limit)
				.limit(limit);

			let result = [];
			for (const rev of data) {
				const contact =
					(await Companies.findById(rev.person).select('name')) ||
					(await Members.findById(rev.person).select('name')) ||
					(await Admins.findById(rev.person).select('name')) ||
					(await SubAdmins.findById(rev.person).select('name'));

				result.push({ ...rev._doc, search_by: contact?.name });
			}

			return res.json({ data: { totalCount, data: result } });
		} catch (error) {
			res.status(400).json(error);
		}
	}
);

router.get(
	'/admin/commonSingleFinderData',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res.status(400).json(errormessage('Account not found!'));

			var page = req.query.page || 1;
			var limit = req.query.limit || 10;

			const totalCount = await SingleEmailFinder.countDocuments();
			const data = await SingleEmailFinder.find()
				.sort({ created_at: -1 })
				.skip((page - 1) * limit)
				.limit(limit);

			let result = [];
			for (const rev of data) {
				const contact =
					(await Companies.findById(rev.person).select('name')) ||
					(await Members.findById(rev.person).select('name')) ||
					(await Admins.findById(rev.person).select('name')) ||
					(await SubAdmins.findById(rev.person).select('name'));

				result.push({ ...rev._doc, search_by: contact?.name });
			}

			return res.json({ data: { totalCount, data: result } });
		} catch (error) {
			res.status(400).json(error);
		}
	}
);

router.post('/reportData', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person)
			return res.status(400).json(errormessage('Account not found!'));

		req.body.person = req.person._id;
		await reportedData.create(req.body);

		return res.json('Reported Successfully');
	} catch (error) {
		res.status(400).json(error);
	}
});

router.get('/admin/getUserFile', [authorize.verifyToken], async (req, res) => {
	try {
		const person = req.person;
		if (!person)
			return res.status(400).json(errormessage('Account not found!'));

		const data = await EnhancerFiles.find({
			sys_filename: req.query.sys_filename,
		});

		return res.json({ data });
	} catch (error) {
		res.status(400).json(error);
	}
});

router.get(
	'/admin/getUserVerifyFile',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res.status(400).json(errormessage('Account not found!'));

			const data = await FileVerifications.find({
				sys_filename: req.query.sys_filename,
			});

			return res.json({ data });
		} catch (error) {
			res.status(400).json(error);
		}
	}
);

router.get(
	'/admin/getSingleFile',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res.status(400).json(errormessage('Account not found!'));

			const data = await SingleVerifier.find()
				.sort({ verify_at: -1 })
				.limit(100);

			return res.json({ data });
		} catch (error) {
			res.status(400).json(error);
		}
	}
);

router.get(
	'/admin/getSingleFinderFile',
	[authorize.verifyToken],
	async (req, res) => {
		try {
			const person = req.person;
			if (!person)
				return res.status(400).json(errormessage('Account not found!'));

			const data = await SingleEmailFinder.find()
				.sort({ verify_at: -1 })
				.limit(100);

			return res.json({ data });
		} catch (error) {
			res.status(400).json(error);
		}
	}
);

router.get('/admin/test', async (req, res) => {
	try {
		// const person = req.person;
		// if (!person)
		// 	return res.status(400).json(errormessage('Account not found!'));

		const data = await EnhancerFiles.findOne({
			deliverable_count: { $exists: false },
		});

		if (data) {
			const allData = await EnhancerFiles.find({
				sys_filename: data.sys_filename,
			});

			const deliverableCount = allData.filter(
				(rev) => rev.result === 'deliverable'
			).length;

			await EnhancerFiles.updateMany(
				{ sys_filename: data.sys_filename },
				{ $set: { deliverable_count: deliverableCount } }
			);
			return res.json({ msg: 'done' });
		}

		return res.json({ msg: 'ok' });
	} catch (error) {
		res.status(400).json(error);
	}
});

module.exports = router;
