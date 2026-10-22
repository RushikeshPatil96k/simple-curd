const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());

const {
  MONGO_HOST, MONGO_PORT, MONGO_DATABASE,
  MONGO_USER, MONGO_PASSWORD
} = process.env;

const uri =
  `mongodb://${encodeURIComponent(MONGO_USER)}:` +
  `${encodeURIComponent(MONGO_PASSWORD)}@${MONGO_HOST}:${MONGO_PORT}/` +
  `${MONGO_DATABASE}?authSource=${MONGO_DATABASE}`;

const client = new MongoClient(uri);
let students;

function validId(id) {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// CREATE
app.post("/api/records", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name?.trim() || !email?.trim())
      return res.status(400).json({ error: "Name and email required" });

    const result = await students.insertOne({
      name: name.trim(), email: email.trim()
    });
    res.status(201).json({ id: result.insertedId.toString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Create failed" });
  }
});

// READ AND SEARCH
app.get("/api/records", async (req, res) => {
  try {
    const s = (req.query.search || "").trim();
    const filter = s ? { $or: [
      { name: { $regex: escapeRegex(s), $options: "i" } },
      { email: { $regex: escapeRegex(s), $options: "i" } }
    ] } : {};

    const rows = await students.find(filter).sort({ _id: -1 }).toArray();
    res.json(rows.map(r => ({
      id: r._id.toString(), name: r.name, email: r.email
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Read failed" });
  }
});

// UPDATE
app.put("/api/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    if (!validId(id))
      return res.status(400).json({ error: "Invalid ID" });
    if (!name?.trim() || !email?.trim())
      return res.status(400).json({ error: "Name and email required" });

    const result = await students.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: name.trim(), email: email.trim() } }
    );
    if (!result.matchedCount)
      return res.status(404).json({ error: "Record not found" });

    res.json({ message: "Updated" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE
app.delete("/api/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id))
      return res.status(400).json({ error: "Invalid ID" });

    const result = await students.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount)
      return res.status(404).json({ error: "Record not found" });

    res.json({ message: "Deleted" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Delete failed" });
  }
});

async function start() {
  await client.connect();
  const db = client.db(MONGO_DATABASE);
  await db.command({ ping: 1 });
  students = db.collection("students");
  console.log("MongoDB connected");

  app.listen(3000, "0.0.0.0", () =>
    console.log("Backend running on port 3000")
  );
}

start().catch(e => {
  console.error("Startup failed:", e);
  process.exit(1);
});
