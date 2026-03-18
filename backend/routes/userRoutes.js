import express from "express";
import User from "../models/User.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();

router.post("/sync", verifyUser, async (req, res) => {
  const { id, email } = req.user;

  let user = await User.findOne({ userId: id });

  if (!user) {
    user = await User.create({
      userId: id,
      email
    });
  }

  res.json(user);
});

export default router;