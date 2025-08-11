/********************************************************************************
* WEB322 – Assignment 06
*
* I declare that this assignment is my own work and completed based on my
* current understanding of the course concepts.
*
* The assignment was completed in accordance with:
* a. The Seneca's Academic Integrity Policy
* https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
*
* b. The academic integrity policies noted in the assessment description
*
* I did NOT use generative AI tools (ChatGPT, Copilot, etc) to produce the code
* for this assessment.
*
* Name: Karthika Krishnan Student ID: 101801231
*
********************************************************************************/
const HTTP_PORT = process.env.PORT || 8080;

const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "dev",
  resave: false,
  saveUninitialized: false
}));

(async function startServer() {
  try {
    
    await mongoose.connect(process.env.MONGO_CONNECTION_STRING, { dbName: "app" });
    console.log("MongoDB connected");

    const { Schema, model, Types } = mongoose;

    const User = model("User", new Schema({
      email: { type: String, required: true, unique: true, trim: true },
      password: { type: String, required: true }
    }));

    const Car = model("Car", new Schema({
      model: { type: String, required: true },
      imageUrl: { type: String, required: true },
      returnDate: { type: String, default: "" },
      renter: { type: Types.ObjectId, ref: "User", default: null }
    }));

    
    const SEED_CARS = [
      { model: "Tesla Model Y",        imageUrl: "/img/tesla.jpg",    returnDate: "" },
      { model: "Honda Civic",          imageUrl: "/img/civic.jpg",    returnDate: "" },
      { model: "Toyota Corolla",       imageUrl: "/img/corolla.jpg",  returnDate: "" },
      { model: "Porsche Panamera",     imageUrl: "/img/panamera.jpg", returnDate: "" },
      { model: "Lamborghini Huracán",  imageUrl: "/img/huracan.jpg",  returnDate: "" }
    ];

 
    function ensureAuth(req, res, next) {
      if (!req.session.user) return res.redirect("/login");
      next();
    }

    
    app.get("/", (req, res) => res.redirect("/login"));

    app.get("/login", (req, res) => {
      if (req.session.user) return res.redirect("/cars");
      res.render("login", { error: null });
    });

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      if (!email?.trim() || !password?.trim()) {
        return res.render("login", { error: "Email and password required." });
      }
      let user = await User.findOne({ email: email.trim() });
      if (!user) {
        user = await User.create({ email: email.trim(), password });
        req.session.user = { _id: user._id.toString(), email: user.email };
        return res.redirect("/cars");
      }
      if (user.password !== password) {
        return res.render("login", { error: "Wrong password." });
      }
      req.session.user = { _id: user._id.toString(), email: user.email };
      res.redirect("/cars");
    });

    app.post("/logout", (req, res) => {
      req.session.destroy(() => res.redirect("/login"));
    });

    app.get("/cars", ensureAuth, async (req, res) => {
      const cars = await Car.find().populate("renter", "email");
      res.render("cars", { cars, me: req.session.user });
    });

    app.get("/book/:id", ensureAuth, async (req, res) => {
      const car = await Car.findById(req.params.id);
      if (!car || car.renter) return res.redirect("/cars");
      res.render("bookingForm", { car });
    });

    app.post("/book/:id", ensureAuth, async (req, res) => {
      const car = await Car.findById(req.params.id);
      if (!car) return res.redirect("/cars");
      if (!car.renter) {
        const dateStr = (req.body.returnDate || req.body.date || "").trim();
        car.renter = req.session.user._id;
        car.returnDate = dateStr;
        await car.save();
      }
      res.redirect("/cars");
    });

    app.post("/return/:id", ensureAuth, async (req, res) => {
      const car = await Car.findById(req.params.id);
      if (car && car.renter && car.renter.toString() === req.session.user._id) {
        car.renter = null;
        car.returnDate = "";
        await car.save();
      }
      res.redirect("/cars");
    });


    
    app.listen(HTTP_PORT, () => {
      console.log(`server listening on: http://localhost:${HTTP_PORT}`);
    });
  } catch (err) {
    console.log("ERROR: connecting to MONGO database");
    console.log(err);
    console.log("Please resolve these errors and try again.");
  }
})();

