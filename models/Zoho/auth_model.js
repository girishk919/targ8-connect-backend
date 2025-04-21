const { default: mongoose } = require("mongoose");

const zohoAuthSchema = new mongoose.Schema({
    access_token : {type: String ,required : true},
    refresh_token : {type : String , required : true}
} , {timestamps : true});

const ZohoAuth = mongoose.model("Zoho_auth" , zohoAuthSchema);

module.exports = ZohoAuth;