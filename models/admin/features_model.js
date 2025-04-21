const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const featureSchema = new Schema({
    description: {
        type: String,
        required: true,
        unique: true
    }
})

module.exports = features_model = mongoose.model('features', featureSchema);