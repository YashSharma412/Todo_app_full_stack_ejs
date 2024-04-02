const regexEmail = (emailAddress)=>{
    // let regex = /^[a-z0-9]+@[a-z0-9]+\.[a-z]{2,3}$/
    let regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return regex.test(emailAddress);
}

module.exports = regexEmail;