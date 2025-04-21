const express = require('express');

const router = express.Router();

const authorize = require('../../helpers/authorize');

const {
	createCategory,
	updateCategory,
	getCategoryById,
	getAllCategory,
	deleteCategory,
} = require('../../controllers/admin/categoryContorller');

// create new category @Route /api/category/create POST
router.post(
	'/create',
	[authorize.verifyToken, authorize.accessAdmin],
	createCategory
);

// update category @Route /api/category/update/:id PUT
router.put(
	'/update/:id',
	[authorize.verifyToken, authorize.accessAdmin],
	updateCategory
);

// delete category @Route /api/category/create DELETE
router.delete(
	'/delete/:id',
	[authorize.verifyToken, authorize.accessAdmin],
	deleteCategory
);

// get category by id @Route /api/category/:id GET
router.get(
	'/get/:id',
	[authorize.verifyToken, authorize.accessAdmin],
	getCategoryById
);

// get category by id @Route /api/category/all GET
router.get(
	'/getAll',
	[authorize.verifyToken, authorize.accessAdmin],
	getAllCategory
);

module.exports = router;
