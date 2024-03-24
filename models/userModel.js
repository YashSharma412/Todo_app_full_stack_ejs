const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    email: {
        type:String,
        required:true,
        unique:true
    },
    username: {
        type:String,
        required:true,
        unique:true
    },
    password: {
        type:String,
        required:true
    }
})
// console.log("mySchema", userSchema)
module.exports = mongoose.model("user", userSchema);