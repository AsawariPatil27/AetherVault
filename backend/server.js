import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./database/mongoConnection.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import parseRoutes from "./routes/parseRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ CONNECT TO MONGODB
connectDB();

// ✅ ROUTES FIRST
app.use("/upload", uploadRoutes);
app.use("/chat", chatRoutes);
app.use("/user", userRoutes);
app.use("/parse", parseRoutes);


app.get("/", (req, res) => {
  res.send("Hello World!");
});

const PORT = process.env.PORT || 5000;

// ✅ START SERVER LAST
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});