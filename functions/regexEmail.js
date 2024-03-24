const regexEmail = (emailAddress)=>{
    let regex = /^[a-z0-9]+@[a-z0-9]+\.[a-z]{2,3}$/
    return regex.test(emailAddress);
}

module.exports = regexEmail;