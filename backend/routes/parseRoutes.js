import express from "express";
import { parseDocument } from "../controllers/parseController.js";

const router = express.Router();

router.get("/:id",parseDocument);

export default router;
