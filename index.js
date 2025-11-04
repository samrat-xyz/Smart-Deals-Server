const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// MongoDB Connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.me32qay.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Express App Setup

const app = express();
const port = process.env.PORT || 3030;

app.use(cors());
app.use(express.json());


const verifyFireBaseToken = async(req, res, next) => {
  if(!req.headers.authorization){
    return res.status(401).send({message : 'unauthoriz access'})
  }
  const token = req.headers.authorization.split(" ")[1]
  if(!token){
    return res.status(401).send({message : 'unauthoriz access'})
  }
  // verify when token have

  try{
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email
    console.log(userInfo)
    next()
  }catch{
     return res.status(401).send({message : 'unauthoriz access'})
  }


}

// Root route
app.get("/", (req, res) => {
  res.send("Smart Deals Server Is Running");
});

//  Main Async Function
async function run() {
  try {
    await client.connect();
    console.log("MongoDB Connected Successfully!");

    const database = client.db("SimpleDealsDB");
    const productCollections = database.collection("Products");
    const userCollections = database.collection("Users");
    const bidCollections = database.collection("Bids");

    // JWT realted apis

    app.post('/getToken',async(req,res)=>{
      const loggedUser = req.body;
      console.log(loggedUser)
      const token = jwt.sign(loggedUser,process.env.JWT_SECRET,{expiresIn:'1h'})
      res.send({token})
    })
    
    //  USERS API

    // Create User (POST)
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const existingUser = await userCollections.findOne(query);

      if (existingUser) {
        res.send({ message: "User Already Exists" });
      } else {
        const result = await userCollections.insertOne(newUser);
        res.send(result);
      }
    });

    // Get All Users
    app.get("/users", async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    });

    // Get Single User
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const result = await userCollections.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Update User
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const updatedUser = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      };
      const result = await userCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete User
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const result = await userCollections.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // PRODUCTS API

    // Create Product
    app.post("/products", async (req, res) => {
      const newProduct = {
        ...req.body,
        created_at: new Date(),
      };
      const result = await productCollections.insertOne(newProduct);
      res.send(result);
    });

    // Get All Products
    app.get("/products", async (req, res) => {
      const result = await productCollections.find().toArray();
      res.send(result);
    });

    // Get Single Product
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productCollections.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Delete Product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productCollections.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Get Latest Products
    app.get("/latest-products", async (req, res) => {
      const result = await productCollections
        .find()
        .sort({ created_at: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    //  BIDS API

    // Create Bid
    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidCollections.insertOne(newBid);
      res.send(result);
    });

    // Get Bids (All or by email)
    app.get("/bids", verifyFireBaseToken, async (req, res) => {
      // console.log('author',req.headers)
      const email = req.query.email;
      const query = {};
      if (email) {
        if(email !== req.token_email){
          return res.status(403).send({message : "forbidden"})
        }
        query.buyer_email = email;
      }
      const result = await bidCollections.find(query).toArray();
      res.send(result);
    });

    // Delete Bid
    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidCollections.deleteOne(query);
      res.send(result);
    });

    // Get Bids by Product (sorted by highest bid_price)
    app.get("/products/bids/:productId", async (req, res) => {
      const productId = req.params.productId;
      const query = { product: productId }; // confirm this field in frontend
      const result = await bidCollections
        .find(query)
        .sort({ bid_price: -1 })
        .toArray();
      res.send(result);
    });
  } catch (error) {
    console.error(" Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

// Start Server

app.listen(port, () => {
  console.log(` Server is running on port ${port}`);
});
