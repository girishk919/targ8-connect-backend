const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    status:{
        type:Boolean,
        default:false
    },
},
{timestamps:true}
)

const Category = mongoose.model('Category', CategorySchema);

module.exports = Category;