const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l574mko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    //   await client.db("admin").command({ ping: 1 });

    app.get("/", (req, res) => {
      res.send("Hello From MongoDB Hotelllll!");
    });

    //JWT
    const verifyAPI = (req, res, next) => {
      const token = req?.cookies?.token;
      console.log(token);
      if (!token) {
        return res.status(401).send("UnAuthorized access");
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send("UnAuthorized access");
        }
        req.user = decoded;
        next();
      });
    };

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    //Room collection

    const roomCollection = client.db("HotelloBookingSystem").collection("room");
    const reviewCollection = client
      .db("HotelloBookingSystem")
      .collection("review");
    const bookingCollection = client
      .db("HotelloBookingSystem")
      .collection("booking");

    app.get("/room", async (req, res) => {
      const limit = req.query.limit;
      const result = await roomCollection
        .find({})
        .limit(parseInt(limit))
        .toArray();
      res.send(result);
    });

    app.get("/room/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await roomCollection.findOne(query);
      res.send(result);
    });

    //Booking Collection
    app.post("/booking", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);

      if (result.acknowledged) {
        const filter = { _id: new ObjectId(req.query.id) };
        const updateDocument = {
          $set: {
            availability: false,
          },
        };
        const updatedResult = await roomCollection.updateOne(
          filter,
          updateDocument
        );
        res.send(updatedResult);
      }
    });

    app.get("/booking/:email", verifyAPI, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send("forbidden access");
      }
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const date = req.body.date;
      console.log(id, date);
      const filter = { _id: new ObjectId(id) };
      const updateDocument = {
        $set: {
          date: date,
        },
      };
      const updatedResult = await bookingCollection.updateOne(
        filter,
        updateDocument
      );
      res.send(updatedResult);
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const roomId = req.query.room_id;
      console.log(typeof roomId);
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      console.log(result);

      if (result.deletedCount) {
        const filter = { room_id: parseInt(roomId) };
        const updateDocument = {
          $set: {
            availability: true,
          },
        };
        const updatedResult = await roomCollection.updateOne(
          filter,
          updateDocument
        );
        console.log(updatedResult);
        res.send(updatedResult);
      }
    });

    //review Collection

    app.post("/review", async (req, res) => {
      const bookingData = req.body;
      const roomId = req.query.room_id;
      console.log(bookingData, roomId);
      const result = await reviewCollection.insertOne(bookingData);

      if (result.acknowledged) {
        const filter = { room_id: parseInt(roomId) };
        const updateDocument = {
          $inc: {
            review: 1,
          },
        };
        const updatedResult = await roomCollection.updateOne(
          filter,
          updateDocument
        );
        console.log(updatedResult);
        res.send(updatedResult);
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
