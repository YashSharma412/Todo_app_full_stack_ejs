const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config(); // Load environment variables from .env file

//! Constant variables for backend

const app = express(); // Initializes server
const session = require("express-session");
const mongoDbSession = require("connect-mongodb-session")(session);
const port = process.env.PORT || 8000;
const mongoURI = process.env.MONGO_URI;
const storeLocation = new mongoDbSession({ // where to store
  uri: mongoURI,
  collection: "sessions"
})

//! Helper functions import

const validateUserData = require("./functions/validateUserData");
const userModel = require("./models/userModel");
const regexEmail = require("./functions/regexEmail");
const { isAuth } = require("./middlewares/authMiddleware");
const todoModel = require("./models/todoModel");

// ? MiddleWares =>
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// for every req that comes to the server, regardles of wether it is public or private we attach a skeleton/template session object to it
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false, // will give warning if not specified as false
  saveUninitialized: false, // will not allow un initialized session to get saved in db
  store: storeLocation
}))
// this .set is a capabilty of the express framework
app.set("view engine", "ejs"); //not a middleware, but a setter that sets node's property "view engine"

//? 1.) Connects to MongoDB =>

mongoose
  .connect(mongoURI, {
    autoIndex: true, //make this also true
  })
  .then(() => {
    console.log("~~~~ Connection to MongoDb secured !~~~~");
  })
  .catch((err) => console.error("Failed to connect to MongoDB: " + err));

//? Server listens on port =>
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

// ? Apis =>
app.get("/", (req, res) => {
  res.send("Hello World");
});

// ! HANDLING REGISTER 

// get register page api 
app.get("/register", (req, res) => {
  res.render("registerPage");
});
// post registeration data api =>
app.post("/register", async(req, res)=>{
  const {name, email, username, password} = req.body;
  
  //TODO: Step1> validating data 
  try{
    await validateUserData(req.body);
  } catch(err){
    console.log("error in data reccieved from user", err);
    return res.status(422).json({
      status: 422,
      message: "Failed to register due to Invalid credentials",
      err: err
    });
  }

  //TODO: Step2> check wether email and username are already present in database if present return error.
  // We can solve both into a single call to database, we search for two fields using aggrigaters in userModel
  const dbUserByEmail = await userModel.findOne({email: email})
  // console.log("user data matching the email in database : ", dbUser)
  if(dbUserByEmail){
    return res.status(406).json({
      status: 406, // Not acceptable data in request
      message: "Email already in use, try another email or try login!",
      email: dbUserByEmail.email
    })
  }

  const dbUserByUsername = await userModel.findOne({username})
  // console.log("user data matching the username in database : ", dbUser)
  if(dbUserByUsername){
    return res.status(406).json({
      status: 406, // Not acceptable data in request
      message: "Username already in use, try another name",
      email: dbUserByUsername.email
    })
  }

  //TODO: Encrypting password using Bcrypt
  const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT)) 
  const dataObj = new userModel({ // Initializing data object
    name: name,
    email: email,
    username: username,
    password: hashedPassword,
  });
  // console.log(dataObj);
  try{
    const userDocument = await dataObj.save();
    res.status(201).json({
      status: 201,
      data: userDocument,
      message: "User registered successfully!"
    });
  } catch(err){
    console.error(err);
    return res.status(500).json({
      status: 500,
      message: "Internal Server error. DB error",
      err: err
    })
  }
})

//! HANDLING LOGIN
// ? get login page api 
app.get("/login", (req, res) => {    
  res.render("loginPage");
});

//? post login data api =>
app.post("/login", async(req, res)=>{
  const {loginId, password} = req.body;
  //TODO: Step1>  Validate login data
  if(!loginId) 
    return res.status(403).json({
      status: 403,
      message: "Missing Login Id, please check and try again"
    })
  if(!password) 
    return res.status(403).json({
      status: 403,
      message: "Missing Login password, please check and try again"
    })

  // const loginUsing = ""
  //TODO: Step-2> Check wether loginId is an email or username
  try {
    let userDoc = null;
    if(regexEmail(loginId)){
      // Symbolizes loginId is an email
      userDoc = await userModel.findOne({ email: loginId });
    } else {
      // Symbolizes loginId is username
      userDoc = await userModel.findOne({ username: loginId });
    }
    // if no user is found still
    if (!userDoc)
      return res.status(404).json({
        status: 404,
        message: "User not found. Please Check credentials or try Sign in",
      });
    // console.log("login user doc: " + userDoc);

    //TODO: Step-3> Once user is found, we will now compare the password of user data and userDoc
    const matched = await bcrypt.compare(password, userDoc.password);
    // console.log("passwords matched", matched);
    if (!matched) {
      return res.status(403).json({
        status: 403,
        message: "Invalid Login password, please check and try again",
      });
    }

    //TODO: Step-4> Once passwords match, we login the user by generating a session for the user.
    console.log("req session before: ", req.session)
    //! Express-Sessions middleware Stores the session document for current login in the DB dynamically without explicitly defining a session Schema.
    //! a.) firstly E-S creates the session document in the sessions collection, then it creates an isAuth keyin the document and sets its value to true.
    //!  b.) Secondly E-S takes the _id generated from the creation of session document, and transfers it in to client sides browsers cookie as "connect.sid". The connect.sid stored in the cookie on Client side is encrypted usinf SESSION_SECRET
    req.session.isAuth = true;
    req.session.user = {
      userId: userDoc._id,
      username: userDoc.username,
      email: userDoc.email, 
    }
    //  storing some user info with the session as well so we can track which user has been looged in
    console.log("req session after: ", req.session)
    console.log("session id: (sid): ", req.session.id)
    // return res.send("User logged in successfully!");
    return res.redirect("/dashboard");
  } catch (e){
    console.error(e);
    res.status(500).json({
      status: 500,
      message: "Internal Server error. DB error",
      err: e
    })
  }
  
})

//! Handling DASHBOARD
app.get("/dashboard", isAuth, (req, res)=>{
  return res.render("dashboardPage")
})

//! Handling LOGOUT
app.post("/logout", isAuth, (req, res)=>{
  console.log(req.session)
  // it will navigate to the session and delete it, moreover it will unset the req.session property
  req.session.destroy((err)=>{
    if (err) return res.status(500).json({
      err: err,
      message: "Error ocurred from database while trying to logout. Please try again."
    })
    console.log(req.session)
    return res.redirect("/login");
  }) 
})

// app.post("/logout_from_all_devices", isAuth, async(req, res) => {
//   // console.log(req.session.user.email);
//   let email = req.session.user.email;
//   // we did not make a model for sessions collection just yet so we create a temporrary schema
//   // createing schema
//   const sessionSchema = new mongoose.Schema(
//     {
//       _id: String,
//     },
//     {
//       strict: false,
//     }
//   );
//   //  converting into model
//   const sessionModel = mongoose.model("session", sessionSchema);
//   try{
//     const deletedDb = await sessionModel.deleteMany({
//       "session.user.email": email, // schema: client 
//     })
//     console.log("DB data deleted: ", deletedDb)
//     return res.send("Succesfully logged out from all devices");
//   } catch(err){
//     console.log(err)
//     res.status(500).json({
//       message: "error ocured logging out from all devices",
//       err: err
//     })
//   }
  
// });
const sessionModel = mongoose.model(
  "session",
  new mongoose.Schema(
    { _id: String, },
    {strict: false,}
  )
);
// Defin e your route handler
app.post("/logout_from_all_devices", isAuth, async (req, res) => {
  let email = req.session.user.email;
  try {
    const deletedDb = await sessionModel.deleteMany({
      "session.user.email": email, // Assuming your schema structure is correct
    });
    console.log("DB data deleted: ", deletedDb);
    return res.send("Successfully logged out from all devices");
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Error occurred logging out from all devices",
      err: err,
    });
  }
});

//! Handling TODOs
app.post('/create-todo', isAuth, async (req, res)=>{
  const {title, description} = req.body;
  const username = req.session.user.username;
  const userId = req.session.user.userId;
  // ? Validating data
  if(!title){
    return res.status(403).json({
      status: 403,
      message: "Missing title, please check and try again"
    })
  }
  // if(!description)
  //   return res.status(403).json({
  //     status: 403,
  //     message: "Missing description, please check and try again"
  //   })
  if(typeof title !== 'string'){
    return res.status(403).json({
      status: 403,
      message: "Invalid title type, Title is not a string, please check and try again"
    })
  }

  if(title.length < 3){
    return res.status(403).json({
      status: 403,
      message: "Invalid title length, Title should be at least 3 characters long, please check and try again"
    })
  }

  if(title.length > 100){
    return res.status(403).json({
      status: 403,
      message: "Invalid title length, Title should be at most 100 characters long, please check and try again"
    })
  }

  if(description && description.length > 1000){
    return res.status(403).json({
      status: 403,
      message: "Invalid description length, Description should be at most 1000 characters long, please check and try again"
    })
  }

  const todoObj = new todoModel({
    title: title,
    description: description,
    username: username,
    userId: userId
  })
  // console.log(todoObj)
  try{
    const todoDoc = await todoObj.save()
    return res.status(201).json({
      status: 201,
      message: "todo created successfully",
      data: todoDoc
    })
  }catch(err){
    console.error(err);
    return res.status(500).json({
      status: 500,
      message: "Internal Server error. DB error",
      err: err
    })
  }
  // return res.send("todo created successfully")
})

app.get('/read-todos', isAuth, async(req, res) =>{
  const username = req.session.user.username;
  try{ 
    const todos = await todoModel.find({username})
    console.log(todos)
    return res.status(200).json({
      status: 200,
      message: `todos fetched successfully for ${username}`,
      data: todos
    })
  }catch(err){
    console.error(err);
    return res.status(500).json({
      status: 500,
      message: "Internal Server error. DB error",
      err: err
    })
  }
})

app.post('/edit-todo', isAuth, async(req, res)=>{
  //  to edit we need the todo id, newTitle and newDesc
  const {todoId, newTitle, newDesc} = req.body;
  const username = req.session.user.username;
  console.log("todoId: ", todoId);
  console.log("newTitle: ", newTitle);
  console.log("newDesc: ", newDesc);
  try{
    const todoDoc = await todoModel.findOne({_id: todoId});
    console.log(todoDoc);
    return res.send("todo found");
  }catch (error){
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server error. DB error",
      err: error
    })
  }
})