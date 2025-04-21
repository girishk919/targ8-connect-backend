const express = require("express");
const authorize = require("../../helpers/authorize");
const router = express.Router();
const departmentController = require("../../controllers/company/departmentController");
router
  .route("/")
  .get([authorize.verifyToken, authorize.accessCompany], departmentController.getDepartments)
  .post([authorize.verifyToken, authorize.accessCompany], departmentController.createDepartment);
router
  .route("/:id")
  .patch([authorize.verifyToken, authorize.accessCompany], departmentController.updateDepartment)
  .delete([authorize.verifyToken, authorize.accessCompany], departmentController.deleteDepartment);

module.exports = router;
