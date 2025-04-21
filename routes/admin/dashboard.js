const authorize = require('../../helpers/authorize');

const router = require('express').Router();
const Companies = require('../../models/company/company_model');
const Plans = require('../../models/company/plans_model');
const Invoices = require('../../models/company/invoice_model');
router.get(
	'/ok',
	// [authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			let users_time = await Companies.aggregate([
				{ $addFields: { year: { $year: '$createdAt' } } },
				{ $addFields: { month: { $month: '$createdAt' } } },
				//{ $match: { 'plan.subscription_type': { $ne: 'Free Trial' } } },
				{
					$group: {
						_id: { year: '$year', month: '$month' },
						users: { $addToSet: '$_id' },
						// prime_users: { $addToSet: '$plan._id' },
						// free_users: { $addToSet: '$plan._id' },
					},
				},
				{ $addFields: { year: '$_id.year' } },
				{ $addFields: { month: '$_id.month' } },
				{ $addFields: { users: { $size: '$users' } } },
				{
					$project: { _id: 0 },
				},
				{
					$group: {
						_id: '$year',
						months: { $push: '$$ROOT' },
					},
				},
				{ $addFields: { year: '$_id' } },
				{
					$project: { _id: 0 },
				},
			]);

			const primeUser = await Plans.aggregate([
				{ $addFields: { year: { $year: '$createdAt' } } },
				{ $addFields: { month: { $month: '$createdAt' } } },
				{ $match: { subscription_type: { $eq: 'Free Trial' } } },
				{
					$group: {
						_id: { year: '$year', month: '$month' },
						prime_users: { $addToSet: '$_id' },
					},
				},
				{ $addFields: { year: '$_id.year' } },
				{ $addFields: { month: '$_id.month' } },
				{ $addFields: { prime_users: { $size: '$prime_users' } } },
				{
					$project: { _id: 0 },
				},
				{
					$group: {
						_id: '$year',
						months: { $push: '$$ROOT' },
					},
				},
				{ $addFields: { year: '$_id' } },
				{
					$project: { _id: 0 },
				},
			]);

			const sales_time = await Invoices.aggregate([
				{ $addFields: { year: { $year: '$createdAt' } } },
				{ $addFields: { month: { $month: '$createdAt' } } },
				{
					$group: {
						_id: { year: '$year', month: '$month' },
						prime_users: { $addToSet: '$company' },
						extra_credit: {
							$sum: {
								$cond: [{ $eq: ['$name', 'EXTRA CREDIT'] }, '$amount', 0],
							},
						},
						subscription: {
							$sum: {
								$cond: [{ $eq: ['$name', 'Subscription'] }, '$amount', 0],
							},
						},
						earnings: { $sum: '$amount' },
					},
				},
				{ $addFields: { year: '$_id.year' } },
				{ $addFields: { month: '$_id.month' } },
				{ $addFields: { prime_users: { $size: '$prime_users' } } },
				{
					$project: { _id: 0 },
				},
				{
					$group: {
						_id: '$year',
						months: { $push: '$$ROOT' },
					},
				},
				{ $addFields: { year: '$_id' } },
				{
					$project: { _id: 0 },
				},
			]);

			res.status(200).json({ sales_time, primeUser, users_time });
		} catch (err) {
			res.status(400).json(err);
		}
	}
);

router.get(
	'/',
	// [authorize.verifyToken, authorize.accessAdmin],
	async (req, res) => {
		try {
			const getUsers = async (firstDay, lastDay) => {
				const FindUsers = await Companies.find({
					createdAt: { $gte: firstDay, $lte: lastDay },
				}).count();
				const FindPre = await Companies.find({
					createdAt: { $gte: firstDay, $lte: lastDay },
				});
				var precount = 0;
				for (const rev of FindPre) {
					let plan = await Plans.findById(rev.plan);
					if (plan) {
						if (plan.subscription_end_date < new Date()) {
							precount = precount + 1;
						}
					}
				}
				var free = FindUsers - precount;
				var all = { total: FindUsers, prem: precount, free: free };

				return all;
			};
			const getSales = async (firstDay, lastDay) => {
				const FindExtra = await Invoices.find({
					name: 'EXTRA CREDIT',
					createdAt: { $gte: firstDay, $lte: lastDay },
				});
				const FindSub = await Invoices.find({
					name: 'Subscription',
					createdAt: { $gte: firstDay, $lte: lastDay },
				});
				var extra_credit = 0;
				var subscription = 0;
				for (const rev of FindExtra) {
					extra_credit = extra_credit + rev.amount;
				}
				for (const rev of FindSub) {
					subscription = subscription + rev.amount;
				}
				var earning = subscription + extra_credit;
				var all = { extra_credit, subscription, earning };

				return all;
			};
			var date = new Date();
			if (req.query.date) {
				date = new Date(req.query.date);
			}
			let usersArray = [];
			let salesArray = [];
			for (var i = 0; i < date.getMonth(); i++) {
				var firstDay = new Date(date.getFullYear(), date.getMonth() - i, 1);
				var lastDay = new Date(
					date.getFullYear(),
					date.getMonth() - (i - 1),
					1
				);
				var data = await getUsers(firstDay, lastDay);
				usersArray.push(data);
				var data2 = await getSales(firstDay, lastDay);
				salesArray.push(data2);
			}

			// let users_time = await Companies.aggregate([
			// 	{ $addFields: { year: { $year: '$createdAt' } } },
			// 	{ $addFields: { month: { $month: '$createdAt' } } },
			// 	//{ $match: { 'plan.subscription_type': { $ne: 'Free Trial' } } },
			// 	{
			// 		$group: {
			// 			_id: { year: '$year', month: '$month' },
			// 			users: { $addToSet: '$_id' },
			// 			// prime_users: { $addToSet: '$plan._id' },
			// 			// free_users: { $addToSet: '$plan._id' },
			// 		},
			// 	},
			// 	{ $addFields: { year: '$_id.year' } },
			// 	{ $addFields: { month: '$_id.month' } },
			// 	{ $addFields: { users: { $size: '$users' } } },
			// 	{
			// 		$project: { _id: 0 },
			// 	},
			// 	{
			// 		$group: {
			// 			_id: '$year',
			// 			months: { $push: '$$ROOT' },
			// 		},
			// 	},
			// 	{ $addFields: { year: '$_id' } },
			// 	{
			// 		$project: { _id: 0 },
			// 	},
			// ]);

			// const primeUser = await Plans.aggregate([
			// 	{ $addFields: { year: { $year: '$createdAt' } } },
			// 	{ $addFields: { month: { $month: '$createdAt' } } },
			// 	{ $match: { subscription_type: { $eq: 'Free Trial' } } },
			// 	{
			// 		$group: {
			// 			_id: { year: '$year', month: '$month' },
			// 			prime_users: { $addToSet: '$_id' },
			// 		},
			// 	},
			// 	{ $addFields: { year: '$_id.year' } },
			// 	{ $addFields: { month: '$_id.month' } },
			// 	{ $addFields: { prime_users: { $size: '$prime_users' } } },
			// 	{
			// 		$project: { _id: 0 },
			// 	},
			// 	{
			// 		$group: {
			// 			_id: '$year',
			// 			months: { $push: '$$ROOT' },
			// 		},
			// 	},
			// 	{ $addFields: { year: '$_id' } },
			// 	{
			// 		$project: { _id: 0 },
			// 	},
			// ]);

			// const sales_time = await Invoices.aggregate([
			// 	{ $addFields: { year: { $year: '$createdAt' } } },
			// 	{ $addFields: { month: { $month: '$createdAt' } } },
			// 	{
			// 		$group: {
			// 			_id: { year: '$year', month: '$month' },
			// 			prime_users: { $addToSet: '$company' },
			// 			extra_credit: {
			// 				$sum: {
			// 					$cond: [{ $eq: ['$name', 'EXTRA CREDIT'] }, '$amount', 0],
			// 				},
			// 			},
			// 			subscription: {
			// 				$sum: {
			// 					$cond: [{ $eq: ['$name', 'Subscription'] }, '$amount', 0],
			// 				},
			// 			},
			// 			earnings: { $sum: '$amount' },
			// 		},
			// 	},
			// 	{ $addFields: { year: '$_id.year' } },
			// 	{ $addFields: { month: '$_id.month' } },
			// 	{ $addFields: { prime_users: { $size: '$prime_users' } } },
			// 	{
			// 		$project: { _id: 0 },
			// 	},
			// 	{
			// 		$group: {
			// 			_id: '$year',
			// 			months: { $push: '$$ROOT' },
			// 		},
			// 	},
			// 	{ $addFields: { year: '$_id' } },
			// 	{
			// 		$project: { _id: 0 },
			// 	},
			// ]);

			res.status(200).json({ usersArray, salesArray });
		} catch (err) {
			res.status(400).json(err);
		}
	}
);

module.exports = router;
