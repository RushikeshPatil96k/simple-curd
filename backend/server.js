const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());

const {
  MONGO_HOST,
  MONGO_PORT,
  MONGO_DATABASE,
  MONGO_USER,
  MONGO_PASSWORD
} = process.env;

const uri =
  `mongodb://${encodeURIComponent(MONGO_USER)}:` +
  `${encodeURIComponent(MONGO_PASSWORD)}@` +
  `MONGOHOST:{MONGO_PORT}/${MONGO_DATABASE}` +
  `?authSource=${MONGO_DATABASE}`;

const client = new MongoClient(uri);
let students;

// CREATE
app.post("/api/records", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        error: "Name and email are required"
      });
    }

    const result = await students.insertOne({
      name: name.trim(),
      email: email.trim()
    });

    res.status(201).json({
      id: result.insertedId.toString(),
      message: "Record created"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create record" });
  }
});

// READ AND SEARCH
app.get("/api/records", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    const filter = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: "i" } },
            { email: { $regex: escapeRegex(search), $options: "i" } }
          ]
        }
      : {};

    const rows = await students.find(filter)
      .sort({ _id: -1 })
      .toArray();

    res.json(rows.map(record => ({
      id: record._id.toString(),
      name: record.name,
      email: record.email
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not read records" });
  }
});

// UPDATE
app.put("/api/records/:id", async (req, res) => {
  try {
    const { name, email } = req.body;
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        error: "Name and email are required"
      });
    }

    const result = await students.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: name.trim(),
          email: email.trim()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({ message: "Record updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update record" });
  }
});

// DELETE
app.delete("/api/records/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }

    const result = await students.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({ message: "Record deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete record" });
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function start() {
  await client.connect();

  const database = client.db(MONGO_DATABASE);
  await database.command({ ping: 1 });

  students = database.collection("students");

  console.log("MongoDB connected; students collection is ready");

  app.listen(3000, "0.0.0.0", () => {
    console.log("Backend running on port 3000");
  });
}

start().catch(error => {
  console.error("Could not connect to MongoDB:", error.message);
  process.exit(1);
});
