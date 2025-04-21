/** @format */

const express = require('express');
const router = express.Router();
const Companies = require('../../models/company/company_model');
const authorize = require('../../helpers/authorize');

const {
	createProduct,
	updateProduct,
	getProductById,
	getAllProduct,
	getAll,
	deleteProduct,
	createTestSubscription,
} = require('../../controllers/admin/productController');

router.post(
	'/create',
	[authorize.verifyToken, authorize.accessAdmin],
	createProduct
);

router.put(
	'/update/:id',
	[authorize.verifyToken, authorize.accessAdmin],
	updateProduct
);

router.delete(
	'/delete/:id',
	[authorize.verifyToken, authorize.accessAdmin],
	deleteProduct
);

router.get('/get/:id', getProductById);

router.get('/getAll', [authorize.verifyToken], getAllProduct);

router.get('/get', getAll);

router.post('/createTest', createTestSubscription);

router.get('/history', [authorize.verifyToken], async (req, res) => {
	try {
		const company_id = req.query.company_id;
		if (!company_id) {
			return res.status(400).json('No company id specified !');
		}

		const Company = await Companies.findById(company_id)
			.populate('plan')
			.populate('invoices');
		if (!Company) {
			return res.status(400).json('No Company exists with this ID.');
		}
		let subsHistory = [];
		Company.invoices.map((invoice, id) => {
			if (invoice.item.subscription_type !== 'EXTRA CREDIT')
				subsHistory.push(
					Object.assign(invoice.item, {
						subscription_startedAt: new Date(invoice.createdAt),
						subscription_endedAt: new Date(
							invoice.createdAt.setDate(
								invoice.createdAt.getDate() + invoice.item.subscription_validity
							)
						),
						isCurrentProduct: false,
					})
				);
		});

		function comp(a, b) {
			let date_a = new Date(a.subscription_startedAt);
			let date_b = new Date(b.subscription_startedAt);
			return date_b - date_a;
		}

		subsHistory.sort(comp);
		subsHistory[0].isCurrentProduct = true;

		return res.status(200).json(subsHistory);
	} catch (err) {
		res.status(400).json(err);
	}
});

module.exports = router;
