const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express();

// MiddleWare
app.use(cors())
app.use(express.json())

const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Bistro boss is running.........');
});

// VerifyJWT
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


// MongoDB Atlas


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a46jnic.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const menuCollections = client.db("bistroBoss").collection("menu");
        const reviewsCollections = client.db("bistroBoss").collection("reviews");
        const cartsCollections = client.db("bistroBoss").collection("carts");
        const usersCollections = client.db("bistroBoss").collection("users");

        // JWT
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send({ token })
        })

        // Verify is admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollections.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(401).send({ error: true, message: 'unauthorized access' })
            }
            next()

        }

        // Users APIs
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollections.find().toArray();
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollections.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exist" })
            }
            console.log(user);
            const result = await usersCollections.insertOne(user)
            res.send(result)
        })



        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: "admin"
                },
            }

            const result = await usersCollections.updateOne(query, updatedDoc)
            res.send(result)
        })

        // Get Admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollections.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send({ result: result });
        })


        // Menu APIs
        app.get('/menu', async (req, res) => {
            const result = await menuCollections.find().toArray();
            res.send(result)
        })

        // Review APIs
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollections.find().toArray();
            res.send(result)
        })

        // Cart APIs
        app.post('/carts', async (req, res) => {
            const item = req.body;
            const result = await cartsCollections.insertOne(item)
            res.send(result)
        })

        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'porviden access' })
            }

            const query = { email: email };
            const result = await cartsCollections.find(query).toArray();
            res.send(result);
        });


        app.delete('/carts/:id', async (req, res) => {
            const id = req.params
            const filter = { _id: new ObjectId(id) }
            const result = await cartsCollections.deleteOne(filter)
            res.send(result)

        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);


app.listen(port, (req, res) => {
    console.log(
        `Bistro boss is runnig at port: ${port}`
    );
})