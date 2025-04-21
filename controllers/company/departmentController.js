const { default: mongoose } = require("mongoose");
const Companies = require("../../models/company/company_model");
const createDepartment = async (req, res) => {
  try {
    if (req.body.department_name) {
      let company = await Companies.findById(req.user.id);
      if (!company) {
        res.status(404).json({ message: "No company found with this ID." });
      }
      company = await Companies.findByIdAndUpdate(
        req.user.id,
        {
          $push: { departments: { name: req.body.department_name } },
        },
        { new: true }
      );
      res.status(201).json({ message: "Department created Successfully !", departments: company.departments });
    } else res.status(400).json({ message: "Department name is must" });
  } catch (err) {
    res.status(500).json("Error: " + err);
  }
};

const getDepartments = async (req, res) => {
  try {
    let company = await Companies.findById(req.user.id);
    if (!company) {
      res.status(404).json({ message: "No company found with this ID." });
    }
    const departments = await Companies.findById(req.user.id).select({ departments: 1, _id: 0 });
    if (departments.length === 0) {
      res.status(200).json({ message: "No department found !" });
    } else res.status(200).json({ departments });
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};

const deleteDepartment = async (req, res) => {
  try {
    if (req.params.id) {
      const company = await Companies.findByIdAndUpdate(
        req.user.id,
        {
          $pull: { departments: { _id:  req.params.id } },
        },
        { new: true }
      );
      if (company) {
        res.status(201).json({ departments: company.departments });
      } else res.status(500).json({ message: "Something went wrong" });
    } else {
      res.status(400).json({ message: "No department is specified" });
    }
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};

const updateDepartment = async (req, res) => {
  try {
    if (req.params.id) {
      if (req.body.department_name) {
        const departments = await Companies.findByIdAndUpdate(
          req.user.id,
          {
            $set: { "departments.$[el].name": req.body.department_name },
          },
          { arrayFilters: [{ "el._id": req.params.id }], new: true }
        ).select({ departments: 1 });
        if (departments) {
          res.status(201).json({ departments });
        } else res.status(500).json({ message: "Something went wrong" });
      } else res.status(400).json({ message: "No update specified" });
    } else {
      res.status(400).json({ message: "No department is specified" });
    }
  } catch (err) {
    res.status(400).json("Error: " + err);
  }
};
module.exports = { createDepartment, getDepartments, deleteDepartment, updateDepartment };
