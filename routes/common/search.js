/** @format */

const express = require('express');

const router = express.Router();

const authorize = require('../../helpers/authorize');

const Companies = require('../../models/company/company_model');
const Members = require('../../models/member/member_model');
const SaveSearch = require('../../models/common/savesearch_model');
const Admin = require('../../models/admin/admin_model');
const SubAdmin = require('../../models/sub-admin/sub_admin_model');
const { dashLogger } = require('../../logger');
const subscription_validater = require('../../helpers/subscription_validator');

router.post(
	'/add',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			if (req.body.search_name == null)
				return res.status(400).json('Search name is required!');
			if (req.body.search_name === '')
				return res.status(400).json('Search name is required!');

			const person =
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id)) ||
				(await Admin.findById(req.user.id)) ||
				(await SubAdmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			if (person.role === 'COMPANY' || person.role === 'MEMBER') {
				const getSearch = await SaveSearch.findOne({
					search_name: req.body.search_name,
					person: person._id,
				});
				if (getSearch)
					return res.status(400).json('Search with this name already exists!');

				const addSearch = new SaveSearch({
					search_name: req.body.search_name,
					person: person._id,
					search_params: req.body.search_params,
					type: req.body.type,
				});

				const genSearch = await addSearch.save();

				person.search.push(genSearch._id);

				await person.save();
			} else if (person.role === 'ADMIN') {
				const getSearch = await SaveSearch.findOne({
					search_name: req.body.search_name,
					admin: person._id,
				});
				if (getSearch)
					return res.status(400).json('Search with this name already exists!');

				const addSearch = new SaveSearch({
					search_name: req.body.search_name,
					admin: person._id,
					search_params: req.body.search_params,
					type: req.body.type,
				});

				const genSearch = await addSearch.save();

				person.search.push(genSearch._id);

				await person.save();
			} else if (person.role === 'SUB_ADMIN') {
				const getSearch = await SaveSearch.findOne({
					search_name: req.body.search_name,
					subadmin: person._id,
				});
				if (getSearch)
					return res.status(400).json('Search with this name already exists!');

				const addSearch = new SaveSearch({
					search_name: req.body.search_name,
					subadmin: person._id,
					search_params: req.body.search_params,
					type: req.body.type,
				});

				const genSearch = await addSearch.save();

				person.search.push(genSearch._id);

				await person.save();
			}

			return res.status(200).json('Search saved');
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json('There was some error!' + error);
		}
	}
);

router.get(
	'/',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id).populate('search')) ||
				(await Members.findById(req.user.id).populate('search')) ||
				(await Admin.findById(req.user.id).populate('search')) ||
				(await SubAdmin.findById(req.user.id).populate('search'));
			if (!person) return res.status(400).json('Account not found!');

			if (req.query.type === '1') {
				var search = person.search.filter((e) => e.type !== '0');
			} else {
				var search = person.search.filter((e) => e.type !== '1');
			}

			return res.json(search);
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json('There was some error!');
		}
	}
);

router.post(
	'/edit',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			await SaveSearch.findByIdAndUpdate(req.body.search_id, req.body, {
				new: true,
			});

			return res.json('Record Renamed Successfully!');
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json(error.message);
		}
	}
);

router.delete(
	'/',
	[authorize.verifyToken, authorize.checkUnpaidInvoice],
	async (req, res) => {
		try {
			const person =
				(await Companies.findById(req.user.id)) ||
				(await Members.findById(req.user.id)) ||
				(await Admin.findById(req.user.id)) ||
				(await SubAdmin.findById(req.user.id));
			if (!person) return res.status(400).json('Account not found!');

			const getSearch = await SaveSearch.findOne({
				_id: req.query.search_id,
				// person: person._id,
			});
			if (!getSearch) return res.status(400).json('Search does not exist!');

			await getSearch.remove();

			person.search = person.search.filter((element) => {
				if (element.equals(getSearch._id)) {
					return false;
				}
				return true;
			});

			await person.save();

			return res.json('Search deleted');
		} catch (error) {
			dashLogger.error(
				`Error : ${err}, Request : ${req.originalUrl}, UserType: ${req.user.role}, User: ${req.user.id}, UserName: ${req.user.name}`
			);
			res.status(400).json('There was some error!');
		}
	}
);

module.exports = router;
