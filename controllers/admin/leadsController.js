/** @format */

const csvtojson = require('csvtojson');
//const csvToJson = require('convert-csv-to-json');
// const txtToJson = require('txt-file-to-json');

const Leads = require('../../models/admin/leads_model');
const Category = require('../../models/admin/category_model');
const DupLeads = require('../../models/admin/dupLeads');

const ActivityLog = require('../../models/admin/activity_log_model');
const nodemailer = require('nodemailer');
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
//const sgMail = require('@sendgrid/mail');
//sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//filters
const Location = require('../../models/filters/location');
const Spty = require('../../models/filters/spty');
const City = require('../../models/filters/cities');
const States = require('../../models/filters/state');
const Country = require('../../models/filters/country');
const Zipcode = require('../../models/filters/zipcode');
const Speciality = require('../../models/filters/speciality');
const SpecialityType = require('../../models/filters/specialityType');
const SpecialityGroup = require('../../models/filters/specialityGroup');
const HospitalType = require('../../models/filters/hospitalType');
const FirmType = require('../../models/filters/firmType');
const Ownership = require('../../models/filters/ownership');
const Title = require('../../models/filters/title');
const LicenseState = require('../../models/filters/licenseState');
const { array } = require('joi');

// fileID generate
const UploadLeadsCSV = async (req, res) => {
	//await Leads.deleteMany();
	try {
		const file = req.file;
		console.log(req.file);
		const { categoryId } = req.body;

		if (!file) {
			return res.status(400).json('File is required');
		}

		const category = await Category.findById(categoryId);
		if (!category) {
			return res.status(400).json('Category not found');
		}

		console.log('file detected');
		// file status

		let JSONArray = await csvtojson({
			delimiter: 'auto',
			colParser: {},
			escape: '"',
			output: 'json',
			nullObject: true,
			trim: true,
		}).fromString(
			req.file.buffer.toString('utf16le') || req.file.buffer.toString()
		);
		if (JSONArray.length === 0) {
			JSONArray = await csvtojson({
				delimiter: 'auto',
				colParser: {},
				escape: '"',
				output: 'json',
				nullObject: true,
				trim: true,
			}).fromString(req.file.buffer.toString());
		}
		console.log('Adding category & Checking Duplicates');
		let count = 0;
		let dupCount = 0;
		for (const doc of JSONArray) {
			doc.category = category;
			doc.updatestatus = '';
		}

		const masterIDs = JSONArray.map((doc) => doc.MasterID);

		while (masterIDs.length > 0) {
			var newmasterArray = masterIDs.splice(0, 500);
			count = count + newmasterArray.length;
			const findDupQuery = {
				MasterID: { $in: newmasterArray },
				updatestatus: { $ne: 'ascii' },
			};
			const update = {
				$set: { updatestatus: 'ascii' },
			};

			const result = await Leads.updateMany(findDupQuery, update);
			dupCount += result.modifiedCount;
			console.log(count);
		}

		console.log('uploading');
		let count2 = 0;
		while (JSONArray.length > 0) {
			var newArray = JSONArray.splice(0, 5000);
			count2 = count2 + newArray.length;
			var result = await Leads.insertMany(newArray);
			console.log(count2);
		}
		console.log('uploaded');
		var rest = count2 - dupCount;
		const msg = {
			to: 'anubhav.mittal@kyloapps.com',
			from: 'team@healthdbi.com',
			bcc: 'team@healthdbi.com',
			subject: `You data have been uploaded`,
			html: `<p>Added ${count2} total leads. Update Leads: ${dupCount} and new leads: ${rest} </p>`,
		};
		transport.sendMail(msg, (err, info) => {
			if (err) {
				console.log('Error in sending email: ' + err);
			} else {
				console.log('Email Send!');
			}
		});

		// sgMail
		// 	.send(msg)
		// 	.then(() => console.log('Email Send!'))
		// 	.catch((err) => console.log('Error in sending email: ' + err));

		const addActivityLog = new ActivityLog({
			person: req.user.id,
			role: req.user.role,
			heading: 'Leads Added',
			message: 'Added ' + count2 + ' new leads.',
		});

		await addActivityLog.save();

		return res.json({
			count: count2,
			message: 'Leads Data Uploaded Successfully',
		});
	} catch (error) {
		return res.status(400).json(error.message);
	}
};

// 1MILLION DATA
const updateData = async (req, res) => {
	try {
		const { dataArray } = req.body;
		const result = await Leads.updateMany(
			{ MasterID: { $in: dataArray.map((item) => item.MasterID.toString()) } },
			{ $set: { updatestatus: 'ascii' } }
		);

		return res.status(200).json({ result });
	} catch (err) {}
};

const updateSingleData = async (req, res) => {
	try {
		const file = req.file;

		if (!file) {
			return res.status(400).json('File is required');
		}
		let JSONArray = await csvtojson({
			delimiter: 'auto',
			colParser: {},
			escape: '"',
			output: 'json',
			nullObject: true,
			trim: true,
		}).fromString(
			req.file.buffer.toString('utf16le') || req.file.buffer.toString()
		);
		if (JSONArray.length === 0) {
			JSONArray = await csvtojson({
				delimiter: 'auto',
				colParser: {},
				escape: '"',
				output: 'json',
				nullObject: true,
				trim: true,
			}).fromString(req.file.buffer.toString());
		}

		console.log(JSONArray.length);

		// let bulkOps = [];

		// console.log('uploading');
		// let count = 0;
		// for (const update of JSONArray) {
		// 	bulkOps.push({
		// 		updateOne: {
		// 			filter: {
		// 				EmailAddress: update.EmailAddress,
		// 				updatestatus: { $ne: 'ascii' },
		// 			},
		// 			update: { $set: { Office_Type: update.Office_Type } },
		// 		},
		// 	});
		// }

		// let count2 = 0;
		// while (bulkOps.length > 0) {
		// 	var newArray = bulkOps.splice(0, 100);
		// 	count2 = count2 + newArray.length;
		// 	var result = await Leads.bulkWrite(newArray);
		// 	console.log(count2);
		// }
		// console.log('uploaded');

		// let count2 = 0;
		// while (JSONArray.length > 0) {
		// 	var newArray = JSONArray.splice(0, 5000);
		// 	count2 = count2 + newArray.length;
		// 	var result = await DupLeads.insertMany(newArray);
		// 	console.log(count2);
		// }
		// console.log('uploaded');

		return res.status(200).json('Done');
	} catch (err) {
		return res.status(400).json(err);
	}
};

const getFewRecords = async (req, res) => {
	try {
		const result = await Leads.find({
			Type: req.query.type,
			Country: { $ne: 'USA' },
			updatestatus: { $ne: 'ascii' },
		})
			.skip((req.query.page - 1) * req.query.limit)
			.limit(req.query.limit);

		return res.status(200).json({ result });
	} catch (err) {
		return res.status(400).json(err);
	}
};

const filterGender = async (req, res) => {
	const { page, query, limits } = req.body;
	Leads.find(query)
		.skip((page - 1) * limits)
		.limit(limits)
		.then(function (leads) {
			return res.json({
				status: '200',
				data: leads,
				message: 'Leads Data fetched Successfully',
			});
		})
		.catch(function (error) {
			console.log(error);
		});
};

const removeDuplicateLeads = async (req, res) => {
	try {
		let arr = [];
		let response = await Leads.aggregate(
			[
				{
					$group: {
						_id: { MasterID: '$MasterID' },
						slugs: { $addToSet: '$_id' },
						count: { $sum: 1 },
					},
				},
				{
					$match: {
						count: { $gt: 1 },
					},
				},
			],
			{ allowDiskUse: true }
		);

		response.forEach(function (doc) {
			doc.slugs.shift();
			doc.slugs.forEach(function (ele) {
				arr.push(ele);
			});
		});

		var final = await Leads.remove({ _id: { $in: arr } });

		return res
			.status(200)
			.json({ message: 'Query Runned Succesfully', data: final });
	} catch (err) {
		return res.status(400).json(err);
	}
};

const leadsFromCategory = async (req, res) => {
	let leads = await Leads.find({ category: req.query.categoryId })
		.skip((req.query.page - 1) * req.query.limits)
		.limit(req.query.limits);

	const totalCount = await Leads.countDocuments({
		category: req.query.categoryId,
	});

	return res.json({ count: totalCount, leads: leads });
};

const getFilterLeadsData = async (req, res) => {
	var page = req.query.page;
	var limit = req.query.limit;
	const data = await Leads.find({})
		.skip((page - 1) * limit)
		.limit(limit);
	console.log('Total: ' + data.length);
	let count = 0;
	if (data.length > 0) {
		const filterList = data.map(async (rev, i) => {
			if (i % 1000 === 0) {
				console.log('Completed: ' + i);
			}
			if (rev.City !== '' || rev.City !== null) {
				const city = await City.findOne({ name: rev.City });
				if (!city) {
					await City.create({ name: rev.City });
				}
			}
			if (rev.State !== '' || rev.State !== null) {
				const state = await States.findOne({ name: rev.State });
				if (!state) {
					await States.create({ name: rev.State });
				}
			}
			if (rev.Country !== '' || rev.Country !== null) {
				const country = await Country.findOne({ name: rev.Country });
				if (!country) {
					await Country.create({ name: rev.Country });
				}
			}
			if (rev.ZIPCode !== '' || rev.ZIPCode !== null) {
				const zip = await Zipcode.findOne({ name: rev.ZIPCode });
				console.log(zip);
				if (!zip) {
					const a = '';
					await Zipcode.create({ name: rev.ZIPCode });
				}
			}
			if (rev.Specialty !== '' || rev.Specialty !== null) {
				const sp = await Speciality.findOne({ name: rev.Specialty });
				if (!sp) {
					await Speciality.create({ name: rev.Specialty });
				}
			}
			if (rev.SpecialtyType !== '' || rev.SpecialtyType !== null) {
				const spType = await SpecialityType.findOne({
					name: rev.SpecialtyType,
				});
				if (!spType) {
					await SpecialityType.create({ name: rev.SpecialtyType });
				}
			}
			if (rev.SpecialtyGroup1 !== '' || rev.SpecialtyGroup1 !== null) {
				const spGroup = await SpecialityGroup.findOne({
					name: rev.SpecialtyGroup1,
				});
				if (!spGroup) {
					await SpecialityGroup.create({ name: rev.SpecialtyGroup1 });
				}
			}
			if (rev.HospitalType !== '' || rev.HospitalType !== null) {
				const hos = await HospitalType.findOne({
					name: rev.HospitalType,
				});
				if (!hos) {
					await HospitalType.create({ name: rev.HospitalType });
				}
			}
			if (rev.FirmType !== '' || rev.FirmType !== null) {
				const firm = await FirmType.findOne({
					name: rev.FirmType,
				});
				if (!firm) {
					await FirmType.create({ name: rev.FirmType });
				}
			}
			if (rev.Title !== '' || rev.Title !== null) {
				const title = await Title.findOne({
					name: rev.Title,
				});
				if (!title) {
					await Title.create({ name: rev.Title });
				}
			}
			if (rev.Ownership !== '' || rev.Ownership !== null) {
				const own = await Ownership.findOne({
					name: rev.Ownership,
				});
				if (!own) {
					await Ownership.create({ name: rev.Ownership });
				}
			}
			if (rev.LicenseIssueState !== '' || rev.LicenseIssueState !== null) {
				const lin = await LicenseState.findOne({
					name: rev.LicenseIssueState,
				});
				if (!lin) {
					await LicenseState.create({ name: rev.LicenseIssueState });
				}
			}
			count++;
			//return rev;
		});
		const listWithFilter = await Promise.all(filterList);
		if (listWithFilter) {
			console.log('done, all filter list added to database');
			return res.status(200).json({
				status: '200',
				message: 'Leads Data fetched Successfully',
			});
		}
	} else {
		res.status(400).json({ message: 'No Data Found' });
	}
};

const populateLocation = async (req, res) => {
	try {
		await Location.deleteMany();
		const file = req.file;

		if (!file) {
			return res.status(400).json('File is required');
		}

		console.log('file detected');
		// file status
		let JSONArray = await csvtojson({
			delimiter: 'auto',
			colParser: {},
			escape: '"',
			output: 'json',
			nullObject: true,
			trim: true,
		}).fromString(
			req.file.buffer.toString('utf16le') || req.file.buffer.toString()
		);
		if (JSONArray.length === 0) {
			JSONArray = await csvtojson({
				delimiter: 'auto',
				colParser: {},
				escape: '"',
				output: 'json',
				nullObject: true,
				trim: true,
			}).fromString(req.file.buffer.toString());
		}
		JSONArray.map(async (doc) => {
			doc.Country = 'USA';
		});
		console.log('Total Data: ' + JSONArray.length);
		let count = 0;
		for (const rev of JSONArray) {
			await Location.create(rev);
			if (count % 100 === 0) {
				console.log('Data Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateSpty = async (req, res) => {
	try {
		await Spty.deleteMany();
		const file = req.file;

		if (!file) {
			return res.status(400).json('File is required');
		}

		console.log('file detected');
		// file status
		let JSONArray = await csvtojson({
			delimiter: 'auto',
			colParser: {},
			escape: '"',
			output: 'json',
			nullObject: true,
			trim: true,
		}).fromString(
			req.file.buffer.toString('utf16le') || req.file.buffer.toString()
		);
		if (JSONArray.length === 0) {
			JSONArray = await csvtojson({
				delimiter: 'auto',
				colParser: {},
				escape: '"',
				output: 'json',
				nullObject: true,
				trim: true,
			}).fromString(req.file.buffer.toString());
		}
		console.log('Total Data: ' + JSONArray.length);
		let count = 0;
		for (const rev of JSONArray) {
			await Spty.create(rev);
			if (count % 100 === 0) {
				console.log('Data Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateState = async (req, res) => {
	try {
		//await States.deleteMany();
		var lead = await Leads.find().distinct('State');
		var leads = lead.join('').split('');
		console.log('States total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await States.findOne({ name: rev });
			if (!find) {
				await States.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log('States Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateCity = async (req, res) => {
	try {
		//await City.deleteMany();
		var lead = await Leads.find().distinct('City');
		var leads = lead.join('').split('');
		console.log('Cities total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await City.findOne({ name: rev });
			if (!find) {
				await City.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log('Cities Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateZipCode = async (req, res) => {
	try {
		await Zipcode.deleteMany();
		var lead = await Leads.find().distinct('ZIPCode');
		var leads = lead.filter((item) => item);
		console.log('Zipcodes total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await Zipcode.findOne({ name: rev });
			if (!find) {
				await Zipcode.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log('Zipcodes Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateSpeciality = async (req, res) => {
	try {
		//await City.deleteMany();
		var lead = await Leads.find().distinct('Specility');
		var leads = lead.join('').split('');
		console.log('Speciality total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await Speciality.findOne({ name: rev });
			if (!find) {
				await Speciality.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log('Speciality Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateSpecialityType = async (req, res) => {
	try {
		await SpecialityType.deleteMany();
		var lead = await Leads.find().distinct('SpecialtyType');
		var leads = lead.filter((item) => item);
		console.log('SpecialityType total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await SpecialityType.findOne({ name: rev });
			if (!find) {
				await SpecialityType.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log('SpecialityType Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateSpecialityGroup = async (req, res) => {
	try {
		//await City.deleteMany();
		var lead = await Leads.find().distinct('SpecialtyGroup1');
		var leads = lead.filter((item) => item);
		console.log(' SpecialityGroup total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await SpecialityGroup.findOne({ name: rev });
			if (!find) {
				await SpecialityGroup.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log(' SpecialityGroup Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateHospitalType = async (req, res) => {
	try {
		await HospitalType.deleteMany();
		var lead = await Leads.find().distinct('HospitalType');
		var leads = lead.filter((item) => item);
		console.log('HospitalType total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await HospitalType.findOne({ name: rev });
			if (!find) {
				await HospitalType.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log('HospitalType Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateFirmType = async (req, res) => {
	try {
		await FirmType.deleteMany();
		var lead = await Leads.find().distinct('FirmType');
		var leads = lead.filter((item) => item);
		console.log('FirmType total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await FirmType.findOne({ name: rev });
			if (!find) {
				await FirmType.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log('FirmType Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateTitle = async (req, res) => {
	try {
		await Title.deleteMany();
		const file = req.file;

		if (!file) {
			return res.status(400).json('File is required');
		}

		console.log('file detected');
		// file status
		let JSONArray = await csvtojson({
			delimiter: 'auto',
			colParser: {},
			escape: '"',
			output: 'json',
			nullObject: true,
			trim: true,
		}).fromString(
			req.file.buffer.toString('utf16le') || req.file.buffer.toString()
		);
		if (JSONArray.length === 0) {
			JSONArray = await csvtojson({
				delimiter: 'auto',
				colParser: {},
				escape: '"',
				output: 'json',
				nullObject: true,
				trim: true,
			}).fromString(req.file.buffer.toString());
		}
		console.log('Total Data: ' + JSONArray.length);
		let count = 0;
		// for (const rev of JSONArray) {
		// 	await Title.findOneAndUpdate(
		// 		{ name: rev.name },
		// 		{ $set: { abb: rev.abb } }
		// 	);
		// 	if (count % 100 === 0) {
		// 		console.log('Data Populated: ' + count);
		// 	}
		// 	count++;
		// }
		await Title.insertMany(JSONArray);
		// var lead = await Leads.find().distinct('Title');
		// var leads = lead.filter((item) => item);
		// console.log('Title total: ' + leads.length);
		// let count = 0;
		// for (const rev of leads) {
		// 	const find = await Title.findOne({ name: rev });
		// 	if (!find) {
		// 		await Title.create({ name: rev });
		// 	}
		// 	if (count % 100 === 0) {
		// 		console.log('Title Populated: ' + count);
		// 	}
		// 	count++;
		// }
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateOwnership = async (req, res) => {
	try {
		await Ownership.deleteMany();
		var lead = await Leads.find().distinct('Ownership');
		var leads = lead.filter((item) => item);
		console.log('Ownership total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await Ownership.findOne({ name: rev });
			if (!find) {
				await Ownership.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log('Ownership Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const populateLicenseState = async (req, res) => {
	try {
		//await LicenseState.deleteMany();
		var lead = await Leads.find().distinct('LicenseIssueState');
		var leads = lead.filter((item) => item);
		console.log('LicenseState total: ' + leads.length);
		let count = 0;
		for (const rev of leads) {
			const find = await LicenseState.findOne({ name: rev });
			if (!find) {
				await LicenseState.create({ name: rev });
			}
			if (count % 100 === 0) {
				console.log('LicenseState Populated: ' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Populated' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const bedRange = async (req, res) => {
	try {
		// await Leads.updateMany(
		// 	{ City: 'San Diego Ca' },
		// 	{ $set: { City: 'San Diego' } }
		// );
		// await Leads.updateMany(
		// 	{ City: 'San Diega' },
		// 	{ $set: { City: 'San Diego' } }
		// );
		// await Leads.updateMany(
		// 	{ City: 'San Deigo' },
		// 	{ $set: { City: 'San Diego' } }
		// );
		await Leads.updateMany(
			{ BedsRange: 'Jan-50' },
			{ $set: { BedsRange: '1-50' } }
		);

		return res.status(200).json({ message: 'Done' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const bedRange2 = async (req, res) => {
	try {
		await Location.deleteOne({ State: 'CA', City: 'San Diego Ca' });
		await Location.deleteOne({ State: 'CA', City: 'San Diega' });
		await Location.deleteOne({ State: 'CA', City: 'San Diego' });
		await Location.deleteOne({ State: 'CA', City: 'San Deigo' });

		return res.status(200).json({ message: 'Done' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const capitalCase = async (req, res) => {
	try {
		//await LicenseState.deleteMany();
		var lead = await Leads.find({
			Hospital_Doctor: { $exists: true, $ne: '' },
		});

		function titleCase(str) {
			return str
				.toLowerCase()
				.split(' ')
				.map(function (word) {
					return word.replace(word[0], word[0].toUpperCase());
				})
				.join(' ');
		}

		let count = 0;
		for (const rev of lead) {
			await Leads.updateOne(
				{ _id: rev._id },
				{ $set: { Hospital_Doctor: titleCase(rev.Hospital_Doctor) } }
			);

			if (count % 1000 === 0) {
				console.log('Title Case:' + count);
			}
			count++;
		}
		return res.status(200).json({ message: 'Capital Case Done' });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const leadData = async (req, res) => {
	try {
		var lead = await Leads.find({
			debounceStatus: req.query.status,
		});

		return res.status(200).json({ message: 'Fetched Successfully', lead });
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

module.exports = {
	UploadLeadsCSV,
	updateData,
	updateSingleData,
	filterGender,
	getFewRecords,
	removeDuplicateLeads,
	leadsFromCategory,
	getFilterLeadsData,
	populateLocation,
	populateSpty,
	populateCity,
	populateFirmType,
	populateHospitalType,
	populateLicenseState,
	populateOwnership,
	populateSpeciality,
	populateSpecialityGroup,
	populateSpecialityType,
	populateState,
	populateTitle,
	populateZipCode,
	capitalCase,
	bedRange,
	bedRange2,
	leadData,
};
