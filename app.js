const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors=require('cors');
const passport=require('passport');
const bcrypt=require('bcrypt');
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');
const cookieParser = require("cookie-parser");
const path = require('path')
const session=require('express-session');
const { log } = require('console');
require('dotenv').config();


const LocalStrategy = require('passport-local').Strategy;
const secretKey="bduebdjwbdiwbe3y43nb@WVutbfejbfjk"
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// connection to database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'courseApp',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database');
});


// app declarations
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(""));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,  // Secret for signing the session ID cookie
  resave: false,              // Do not save the session if it was not modified
  saveUninitialized: false,   // Do not store an uninitialized session
  cookie: { secure: false }   // Set secure to true if using HTTPS
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  // Add session user info to locals if logged in
  if (req.session.user) {
      res.locals.userName = req.session.user.name;  // Attach user's name to res.locals
      res.locals.role=req.session.user.role
  }
  else{
    res.locals.userName=null
    res.locals.role=null
  }
  next();
});





//Test Query

db.query('SELECT * FROM COURSES', (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return;
    }
    console.log('Query results:', results);
  });
  
// Home Page
const discountedCourses=[{
  title:"Course101",
  originalPrice:100,
  discountedPrice:90
}]
// const blogs=[{}]

app.get('/',(req,res)=>{
  res.render("index")
})
app.get('/courses',(req,res)=>{
  // if(req.session.user){

  
  
  db.query('SELECT * FROM COURSES', (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      res.render("error",{err})
      return;
    }
    const allCourses=results;
    res.render("courses/courses",{allCourses})
  });

  
}

)
function getCurrentDateTime(type) {
  const now = new Date();

  // Extract components of the date and time
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Format as 'YYYY-MM-DD HH:MM:SS'
  if(type=="form") return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
app.get('/courses/:id/purchase',(req,res)=>{
  const courseId=req.params.id
  res.render("courses/payment1",{courseId})
})

app.get('/blogs',(req,res)=>{
  const currentDateTime=getCurrentDateTime()
  db.query('SELECT * FROM BLOGS WHERE dateLive <= ?',[currentDateTime],(err,results)=>{
    if(err){
      res.render("error",{err})
    }
    else{
      const blogs=results
      res.render("blogs",{blogs})
    }
  })
  
})
app.get('/checkout/:courseId',(req,res)=>{
  const courseId=req.params.courseId
  db.query('SELECT * FROM COURSES WHERE id=?',[courseId],(err,results)=>{
    if(err){
      res.render("error",{err})
    }
    else{
      const course=results[0];
      res.render("checkout/checkout",{course})
    }
  })
  
})


app.post('/process-payment', (req, res) => {
  const { courseId, paymentMethod } = req.body;  
  res.redirect(`/dummy-payment?courseId=${courseId}&paymentMethod=${paymentMethod}`);
});

app.get('/dummy-payment',(req,res)=>{
  const {courseId,paymentMethod}=req.query
  res.render('checkout/dummy-payment',{courseId,paymentMethod})
})


app.post("/login", async (req, res) => {
  console.log(req.body);
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({ error: "fill the details" });
  };

  try {

      db.query('SELECT * from USERS WHERE username=?',[username],async (err,results)=>{
        if (err) {
          console.error('Error executing the query:', err);
          return res.status(400).json("Error finding details in DB");
        }
        if(results.length==1){

        
        const isMatch = await bcrypt.compare(password, results[0].password);
            console.log(isMatch);
            if (!isMatch) {
                return res.status(400).json({ error: "invalid crediential pass" });
            } else {
                const userLoginData=results[0];
                console.log(userLoginData);
                req.session.user = userLoginData;
                req.session.user.role="user"
                console.log(req.session.user);
               res.cookie("name", userLoginData.name);
               res.redirect('courses')
            }
          }
          else{
            return res.status(400).json({error: "User not found in DB"});
          }

      });
    } catch (error) {
      console.log("error the bhai catch ma for login time" + error.message);
      return res.status(400).json({ error: "invalid crediential pass" });
      
  }
});

// Admin routes
app.get('/admin/login',(req,res)=>{
  res.render('admin/adminLogin')
})
app.post('/admin/login',(req,res)=>{
  const {username,password}=req.body
  if(username==process.env.ADMIN_USERNAME && password==ADMIN_PASSWORD){
    req.session.user={
      role:"admin",
      name:"admin"
    }
    console.log(req.session.user);
    res.redirect('/admin/home')
    
  }
  else{
    res.send("Error connecting to admin login")
  }
})

app.get('/admin/home',(req,res)=>{
  console.log(req.session.user);
  
  if(req.session.user && req.session.user.role=="admin"){

  
  res.render('admin/adminHome')
  }
  else if(req.session.user){
    res.send("You need to be an admin to access this route")
  }
  else{
    res.redirect('/login')
  }
})
app.get('/admin/add-course',(req,res)=>{
  if(req.session.user && req.session.user.role=="admin"){

  
    res.render('admin/addCourse')
    }
    else{
      res.send("You need to be an admin to access this route")
    }
})
app.get('/admin/add-blog',(req,res)=>{
  const dateTime=getCurrentDateTime("form")
  if(req.session.user && req.session.user.role=="admin"){

    res.render('admin/addBlog',{dateTime})

    }
    else{
      res.send("You need to be an admin to access this route")
    }
})
app.post('/admin/add-course',(req,res)=>{
  if(req.session.user && req.session.user.role=="admin"){
  const {title,description,price,discountPercentage}=req.body;
  const courseId=uuidv4()
  const dateLive=getCurrentDateTime()
  db.query('INSERT INTO COURSES(title,description,price,discountPercentage,dateLive) VALUES(?,?,?,?,?)',[title,description,price,discountPercentage,dateLive],(err)=>{
    if(err){
      console.log(err);
      res.render('error', {err})
      return
    }else{
      res.redirect('/admin/home')
      return
    }
  })
}
else{
  res.send("Oops! only admins can access this route")
}
})

app.post('/admin/add-blog',(req,res)=>{
  if(req.session.user && req.session.user.role=="admin"){
    const {title,description,dateLive}=req.body
    console.log(title,description,dateLive);
    db.query('INSERT INTO BLOGS(title,description,dateLive) VALUES(?,?,?)',[title,description,dateLive],(err)=>{
      if(err){
        res.render("error",{err})
      }
      else{
        res.redirect('/admin/home')
      }
    })
   
  }
  else{
    res.send("Oops! only admins can access this route")
  }
})
app.post("/register", async function (req, res) {
  console.log(req.body);
  const {name,email,phone, age, username, password} = req.body;
  if (!name || !username || !email || !password || !phone || !age) {
      return res.status(422).json({ error: "filll the all details" });
      console.log("Insufficient Details");
  };
  try {
          const hashedPassword = await bcrypt.hash(password, 10);
        
          db.query('INSERT INTO users (username, password,name,email,phone,age) VALUES ( ?, ?, ?, ?, ?, ?)', [username, hashedPassword,name,email,phone,age], (err) => {
            if (err) {
              console.error(err);
              return res.status(500).send('Registration failed');
            }
            return res.status(201).json('User registered successfully');
          });
  } catch (error) {
      console.log("Error" + error.message);
      return res.status(422).send(error);
  }
});
app.post('/confirm-payment',(req,res)=>{
  const {verificationCode}=req.body
  if(verificationCode=="1234"){
    res.redirect("success");
  }
  else{
    const err={
      sqlMessage:"There was an error completing the payment"
    }
    res.render("error",{err})
  }
})
// Logout Route
app.get('/logout', (req, res) => {
  req.logout((err) => {
      if (err) {
          return next(err);
      }
      res.redirect('/login'); // Redirect to login page after logout
  });
});
app.get("/success",(req,res)=>{
  res.render("success")
})
app.get('/login',(req,res)=>{
  res.render('auth/login') 
})
app.get('/register',(req,res)=>{
  res.render('auth/register')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
