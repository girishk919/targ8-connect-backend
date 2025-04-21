const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const requestCreditSchema = new Schema({
    member: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Members"
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Companies"
    },
    credits: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: "PENDING"
    }
}, {timestamps: true})

module.exports = request_credits_model = mongoose.model('RequestCredits', requestCreditSchema);