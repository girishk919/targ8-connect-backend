const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const inviteSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    company_name: {
        type: String,
        required: true
    },
    credits: {
        type: Number,
        default: 0
    }
}, {timestamps: true})

module.exports = invite_model = mongoose.model('Invites', inviteSchema);