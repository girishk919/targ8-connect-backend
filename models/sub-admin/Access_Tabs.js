const { default: mongoose } = require("mongoose");

const accessTabsSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const Tabs = mongoose.model("Tabs", accessTabsSchema);

module.exports = Tabs;