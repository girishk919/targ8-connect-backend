const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const resetPasswordSchema = new Schema({
    person_id: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    expireAt: {
        type: Date,
        default: Date.now,
        index: { expires: '15m' }
    }
})

module.exports = reset_password_model = mongoose.model('ResetPassword', resetPasswordSchema);