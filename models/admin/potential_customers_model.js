const { default: mongoose } = require("mongoose");

const potential_customer = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, expires: 24 * 60 * 60 },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);
const Potentials = mongoose.model("Potential_cutomers", potential_customer);

module.exports = Potentials;
