const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());

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

    //Room collection

    const roomCollection = client.db("HotelloBookingSystem").collection("room");

    app.get("/room", async (req, res) => {
      const limit = req.query.limit;
      const result = await roomCollection.find({}).limit(parseInt(limit)).toArray();
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
    const bookingCollection = client
      .db("HotelloBookingSystem")
      .collection("booking");

    app.post("/booking", async (req, res) => {
      const bookingData = req.body;
      // console.log(req.body);
      const id = req.query.id;

      const result = await bookingCollection.insertOne(bookingData);
      // console.log("Bboking", result);

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
        // console.log("updated",updatedResult);
        res.send(updatedResult);
      }
    });

    app.get("/booking/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await bookingCollection.deleteOne(query);

      if (result.deletedCount) {
        const filter = { _id: new ObjectId(req.params.id) };
        const updateDocument = {
          $set: {
            availability: true,
          },
        };
        const updatedResult = await roomCollection.updateOne(
          filter,
          updateDocument
        );
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
