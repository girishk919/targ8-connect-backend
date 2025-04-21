const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const refreshTokenSchema = new Schema({
    token: {
        type: String,
        required: true
    },
    user_id: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    expireAt: {
        type: Date,
        default: Date.now,
        index: { expires: 86400 }
    }
})

module.exports = refresh_token_model = mongoose.model('RefreshToken', refreshTokenSchema);