const express = require("express");
const router = express.Router();
const authorize = require("../../helpers/authorize");

router.get("/", [authorize.verifyToken], async (req, res) => {
  try {
    res.status(200).json({
      departments: ["Department 1", "Department 2", "Department 3", "Department 4"],
    });
  } catch (err) {
    res.status(500).json({
      error: err,
    });
  }
});

module.exports = router;
