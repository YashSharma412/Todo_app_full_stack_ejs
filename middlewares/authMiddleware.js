const isAuth = (req, res, next)=>{
    console.log("~~~~~ Authorizing user ~~~~~~")
    if(req.session.isAuth){
        next();
    } else {
        return res.status(401).json({
            status: "401",
            message: "Session expired/not found please login again"
        })
    }
}

module.exports = {isAuth}