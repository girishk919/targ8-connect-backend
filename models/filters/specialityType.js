const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var SpecialityTypeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const SpecialityType = mongoose.model("SpecialityType", SpecialityTypeSchema);

module.exports = SpecialityType;
