/** @format */

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const authorize = require('../../helpers/authorize');
const { dashLogger } = require('../../logger');
const Companies = require('../../models/company/company_model');
const Members = require('../../models/member/member_model');
const Leads = require('../../models/admin/leads_model');
const Folders = require('../../models/common/folder_model');
const Admin = require('../../models/admin/admin_model');
const SubAdmin = require('../../models/sub-admin/sub_admin_model');
const Subscription = require('../../models/admin/subscription_model');
const subscription_validater = require('../../helpers/subscription_validator');

router.post(
	'/create',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			if (req.body.folder_name == null)
				return res.status(400).json('Folder name is required!');
			if (req.body.folder_name === '')
				return res.status(400).json('Folder name is required!');

			const person =
				(await Companies.findById(req.user.id).populate('plan')) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
					populate: { path: 'plan' },
				})) ||
				(await Admin.findById(req.user.id)) ||
				(await SubAdmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				let company_id;
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
					company_id = person._id;
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
					company_id = person.company_id._id;
				}

				const getFolder = await Folders.findOne({
					folder_name: req.body.folder_name,
					company_id: company_id,
				});
				if (getFolder)
					return res.status(400).json('Folder with this name already exists!');

				if (
					plan.includes('Create up to 5 Lists') &&
					!plan.includes('Create Lists Unlimited')
				) {
					// if (!plan.includes('Create Lists Unlimited')) {
					// 	return res.status(400).json('Upgrade your plan for creating lists!');
					// }
					const TotalFolder = await Folders.find({
						company_id: company_id,
					});
					if (TotalFolder.length >= 5)
						return res
							.status(400)
							.json('Upgrade your plan for creating lists!');
				}
				if (
					!plan.includes('Create up to 5 Lists') &&
					!plan.includes('Create Lists Unlimited')
				) {
					return res.status(400).json('Upgrade your plan for creating lists!');
				}

				const addFolder = new Folders({
					folder_name: req.body.folder_name,
					dataType: req.body.dataType,
					company_id: company_id,
				});

				const genFolder = await addFolder.save();

				if (person.role === 'COMPANY') {
					person.folders.push(genFolder._id);
					await person.save();
				} else if (person.role === 'MEMBER') {
					person.company_id.folders.push(genFolder._id);
					await person.company_id.save();
				}
			} else if (person.role === 'ADMIN') {
				const getFolder = await Folders.findOne({
					folder_name: req.body.folder_name,
					admin: person._id,
				});
				if (getFolder)
					return res.status(400).json('Folder with this name already exists!');

				const addFolder = new Folders({
					folder_name: req.body.folder_name,
					dataType: req.body.dataType,
					admin: person._id,
				});

				const genFolder = await addFolder.save();
				person.folders.push(genFolder._id);
				await person.save();
			} else if (person.role === 'SUB_ADMIN') {
				const getFolder = await Folders.findOne({
					folder_name: req.body.folder_name,
					subadmin: person._id,
				});
				if (getFolder)
					return res.status(400).json('Folder with this name already exists!');

				const addFolder = new Folders({
					folder_name: req.body.folder_name,
					dataType: req.body.dataType,
					subadmin: person._id,
				});

				const genFolder = await addFolder.save();
				person.folders.push(genFolder._id);
				await person.save();
			}

			return res.status(200).json('Folder created');
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id).populate({
					path: 'folders',
					select: {
						_id: 1,
						folder_name: 1,
						leads: 1,
						dataType: 1,
						createdAt: 1,
					},
				})) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
					populate: {
						path: 'folders',
						select: {
							_id: 1,
							folder_name: 1,
							leads: 1,
							dataType: 1,
							createdAt: 1,
						},
					},
				})) ||
				(await Admin.findById(req.user.id).populate({
					path: 'folders',
					select: {
						_id: 1,
						folder_name: 1,
						leads: 1,
						dataType: 1,
						createdAt: 1,
					},
				})) ||
				(await SubAdmin.findById(req.user.id).populate({
					path: 'folders',
					select: {
						_id: 1,
						folder_name: 1,
						leads: 1,
						dataType: 1,
						createdAt: 1,
					},
				}));
			if (!person) return res.status(400).json('Account not found!');

			let folders;

			if (req.query.type === '0') {
				if (
					person.role === 'COMPANY' ||
					person.role === 'ADMIN' ||
					person.role === 'SUB_ADMIN'
				) {
					folders = person.folders.filter((e) => e.dataType === '0');
				} else if (person.role === 'MEMBER') {
					folders = person.company_id.folders.filter((e) => e.dataType === '0');
				} else {
					return res.status(400).json('Role not found!');
				}
			} else {
				if (
					person.role === 'COMPANY' ||
					person.role === 'ADMIN' ||
					person.role === 'SUB_ADMIN'
				) {
					folders = person.folders.filter((e) => e.dataType === '1');
				} else if (person.role === 'MEMBER') {
					folders = person.company_id.folders.filter((e) => e.dataType === '1');
				} else {
					return res.status(400).json('Role not found!');
				}
			}

			for (const rev of folders) {
				rev.count = rev.leads.length;
			}

			return res.json(folders);
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.get(
	'/oneFolder',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id')) ||
				(await Admin.findById(req.user.id)) ||
				(await SubAdmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			// let company_id;

			// if (person.role === 'COMPANY') {
			// 	company_id = person._id;
			// } else if (person.role === 'MEMBER') {
			// 	company_id = person.company_id._id;
			// } else {
			// 	return res.status(400).json('Role not found!');
			// }

			let folder = await Folders.findOne({
				_id: mongoose.Types.ObjectId(req.query.folder_id),
				// company_id: company_id,
			}).populate('leads');
			if (!folder) return res.status(404).json('Folder not found!');

			var newFolder = {};
			newFolder['folder_name'] = folder.folder_name;
			newFolder['dataType'] = folder.dataType;
			newFolder['company_id'] = folder.company_id;
			newFolder['admin'] = folder.admin;
			newFolder['subadmin'] = folder.subadmin;
			newFolder['leads'] = folder.leads;
			newFolder['unlockIndex'] = [];

			for (const rev of newFolder.leads) {
				if (person.leads.includes(rev._id.toString())) {
					newFolder['unlockIndex'].push(true);
				} else {
					newFolder['unlockIndex'].push(false);
				}
			}
			// if (person.role === 'COMPANY') {
			// 	for (const rev of newFolder.leads) {
			// 		if (person.leads.includes(rev._id.toString())) {
			// 			newFolder['unlockIndex'].push(true);
			// 		} else {
			// 			newFolder['unlockIndex'].push(false);
			// 		}
			// 	}

			// } else if (person.role === 'MEMBER') {
			// 	for (const rev of folder.leads) {
			// 		if (person.leads.includes(rev._id.toString())) {
			// 			newFolder['unlockIndex'].push(true);
			// 		} else {
			// 			newFolder['unlockIndex'].push(false);
			// 		}
			// 	}
			// } else {
			// 	return res.status(400).json('Role not found!');
			// }

			return res.json(newFolder);
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json('There was some error!' + error);
		}
	}
);

router.post(
	'/addItems',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id).populate('folders')) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
					populate: { path: 'folders' },
				})) ||
				(await Admin.findById(req.user.id)).populate('folders') ||
				(await SubAdmin.findById(req.user.id)).populate('folders');
			if (!person) return res.status(400).json('Account not found!');

			// let company_id;

			// if (person.role === 'COMPANY') {
			// 	company_id = person._id;
			// } else if (person.role === 'MEMBER') {
			// 	company_id = person.company_id._id;
			// } else {
			// 	return res.status(400).json('Role not found!');
			// }

			const folder = await Folders.findOne({
				_id: mongoose.Types.ObjectId(req.body.folder_id),
				// company_id: company_id,
			});
			if (!folder) return res.status(404).json('Folder not found!');

			if (folder.dataType !== req.body.dataType && req.body.dataType === '1') {
				return res
					.status(400)
					.json('Cannot add executives data in physicians folder');
			}
			if (folder.dataType !== req.body.dataType && req.body.dataType === '0') {
				return res
					.status(400)
					.json('Cannot add physicians data in executives folder');
			}
			let leads_ids = req.body.leads_ids;

			leads_ids = leads_ids.filter((element) => {
				if (folder.leads.includes(element)) {
					return false;
				}
				return true;
			});

			for (let i = 0; i < leads_ids.length; i++) {
				const isLeadPresent = await Leads.findById(leads_ids[i]);
				if (!isLeadPresent) {
					leads_ids.splice(i, 1);
				}
			}

			for (let i = 0; i < leads_ids.length; i++) {
				folder.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
			}

			await folder.save();

			return res.status(400).json('Items added to list');
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.post(
	'/createAndAddItems',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			if (req.body.folder_name == null)
				return res.status(400).json('Folder name is required!');
			if (req.body.folder_name === '')
				return res.status(400).json('Folder name is required!');

			const person =
				(await Companies.findById(req.user.id)
					.populate('folders')
					.populate('plan')) ||
				(await Members.findById(req.user.id)
					.populate({
						path: 'company_id',
						populate: { path: 'folders' },
					})
					.populate({
						path: 'company_id',
						populate: { path: 'plan' },
					})) ||
				(await Admin.findById(req.user.id)).populate('folders') ||
				(await SubAdmin.findById(req.user.id)).populate('folders');
			if (!person) return res.status(400).json('Account not found!');

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				let company_id;
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
					company_id = person._id;
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
					company_id = person.company_id._id;
				}

				const getFolder = await Folders.findOne({
					folder_name: req.body.folder_name,
					company_id: company_id,
				});
				if (getFolder)
					return res.status(400).json('Folder with this name already exists!');

				if (
					plan.includes('Create up to 5 Lists') &&
					!plan.includes('Create Lists Unlimited')
				) {
					// if (!plan.includes('Create Lists Unlimited')) {
					// 	return res.status(400).json('Upgrade your plan for creating lists!');
					// }
					const TotalFolder = await Folders.find({
						company_id: company_id,
					});
					if (TotalFolder.length >= 5)
						return res
							.status(400)
							.json('Upgrade your plan for creating lists!');
				}
				if (
					!plan.includes('Create up to 5 Lists') &&
					!plan.includes('Create Lists Unlimited')
				) {
					return res.status(400).json('Upgrade your plan for creating lists!');
				}

				const addFolder = new Folders({
					folder_name: req.body.folder_name,
					dataType: req.body.dataType,
					company_id: company_id,
				});

				const genFolder = await addFolder.save();

				if (person.role === 'COMPANY') {
					person.folders.push(genFolder._id);
					await person.save();
				} else if (person.role === 'MEMBER') {
					person.company_id.folders.push(genFolder._id);
					await person.company_id.save();
				}

				let leads_ids = req.body.leads_ids;

				leads_ids = leads_ids.filter((element) => {
					if (genFolder.leads.includes(element)) {
						return false;
					}
					return true;
				});

				for (let i = 0; i < leads_ids.length; i++) {
					const isLeadPresent = await Leads.findById(leads_ids[i]);
					if (!isLeadPresent) {
						leads_ids.splice(i, 1);
					}
				}

				for (let i = 0; i < leads_ids.length; i++) {
					genFolder.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
				}

				await genFolder.save();
			} else if (person.role === 'ADMIN') {
				const getFolder = await Folders.findOne({
					folder_name: req.body.folder_name,
					admin: person._id,
				});
				if (getFolder)
					return res.status(400).json('Folder with this name already exists!');

				const addFolder = new Folders({
					folder_name: req.body.folder_name,
					dataType: req.body.dataType,
					admin: person._id,
				});

				const genFolder = await addFolder.save();
				person.folders.push(genFolder._id);
				await person.save();

				let leads_ids = req.body.leads_ids;

				leads_ids = leads_ids.filter((element) => {
					if (genFolder.leads.includes(element)) {
						return false;
					}
					return true;
				});

				for (let i = 0; i < leads_ids.length; i++) {
					const isLeadPresent = await Leads.findById(leads_ids[i]);
					if (!isLeadPresent) {
						leads_ids.splice(i, 1);
					}
				}

				for (let i = 0; i < leads_ids.length; i++) {
					genFolder.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
				}

				await genFolder.save();
			} else if (person.role === 'SUB_ADMIN') {
				const getFolder = await Folders.findOne({
					folder_name: req.body.folder_name,
					subadmin: person._id,
				});
				if (getFolder)
					return res.status(400).json('Folder with this name already exists!');

				const addFolder = new Folders({
					folder_name: req.body.folder_name,
					dataType: req.body.dataType,
					subadmin: person._id,
				});

				const genFolder = await addFolder.save();
				person.folders.push(genFolder._id);
				await person.save();

				let leads_ids = req.body.leads_ids;

				leads_ids = leads_ids.filter((element) => {
					if (genFolder.leads.includes(element)) {
						return false;
					}
					return true;
				});

				for (let i = 0; i < leads_ids.length; i++) {
					const isLeadPresent = await Leads.findById(leads_ids[i]);
					if (!isLeadPresent) {
						leads_ids.splice(i, 1);
					}
				}

				for (let i = 0; i < leads_ids.length; i++) {
					genFolder.leads.push(mongoose.Types.ObjectId(leads_ids[i]));
				}

				await genFolder.save();
			}

			return res.status(200).json('Folder created and items added!');
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.post(
	'/edit',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id).populate('folders')) ||
				(await Members.findById(req.user.id).populate({
					path: 'company_id',
					populate: { path: 'folders' },
				})) ||
				(await Admin.findById(req.user.id)).populate('folders') ||
				(await SubAdmin.findById(req.user.id)).populate('folders');
			if (!person) return res.status(400).json('Account not found!');

			const folder = await Folders.findOne({
				_id: mongoose.Types.ObjectId(req.body.folder_id),
				// company_id: company_id,
			});
			if (!folder) return res.status(404).json('Folder not found!');

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				let company_id;

				if (person.role === 'COMPANY') {
					company_id = person._id;
				} else if (person.role === 'MEMBER') {
					company_id = person.company_id._id;
				}
				const getFolder = await Folders.findOne({
					folder_name: req.body.folder_name,
					company_id: company_id,
				});
				if (getFolder)
					return res.status(400).json('Folder with this name already exists!');
			} else if (person.role === 'ADMIN') {
				const getFolder = await Folders.findOne({
					folder_name: req.body.folder_name,
					admin: person._id,
				});
				if (getFolder)
					return res.status(400).json('Folder with this name already exists!');
			} else if (person.role === 'SUB_ADMIN') {
				const getFolder = await Folders.findOne({
					folder_name: req.body.folder_name,
					subadmin: person._id,
				});
				if (getFolder)
					return res.status(400).json('Folder with this name already exists!');
			}
			folder.folder_name = req.body.folder_name;

			await folder.save();

			return res.json('Folder name changed!');
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.delete(
	'/delete',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			if (req.query.folder_id == null)
				return res.status(400).json('Folder id is required!');
			if (req.query.folder_id === '')
				return res.status(400).json('Folder id is required!');

			const folder_id = mongoose.Types.ObjectId(req.query.folder_id);

			const person =
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id).populate('company_id')) ||
				(await Admin.findById(req.user.id)) ||
				(await SubAdmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			// let company_id;

			// if (person.role === 'COMPANY') {
			// 	company_id = person._id;
			// } else if (person.role === 'MEMBER') {
			// 	company_id = person.company_id._id;
			// } else {
			// 	return res.status(400).json('Role not found!');
			// }

			const folder = await Folders.findOne({
				_id: folder_id,
				// company_id: company_id,
			});
			if (!folder) return res.status(404).json('Folder not found!');

			if (
				person.role === 'COMPANY' ||
				person.role === 'ADMIN' ||
				person.role === 'SUB_ADMIN'
			) {
				person.folders = person.folders.filter((element) => {
					if (element.equals(folder_id)) {
						return false;
					}
					return true;
				});

				await person.save();
			} else if (person.role === 'MEMBER') {
				person.company_id.folders = person.company_id.folders.filter(
					(element) => {
						if (element.equals(folder_id)) {
							return false;
						}
						return true;
					}
				);

				await person.company_id.save();
			} else {
				return res.status(400).json('Role not found!');
			}

			await folder.remove();

			return res.json('Folder deleted!');
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

module.exports = router;
