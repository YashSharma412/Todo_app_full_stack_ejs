const regexPassword = (password)=>{
    let regex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/
/*
    (?=.*\d)                //should contain at least one digit
    (?=.*[a-z])             //should contain at least one lower case
    (?=.*[A-Z])             //should contain at least one upper case
    [a-zA-Z0-9]{8,}         //should contain at least 8 from the mentioned characters
*/
    return regex.test(password)
}

module.exports = regexPassword