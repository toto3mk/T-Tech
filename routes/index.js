const express = require("express");
const publicRoutes = require("./public");
const protectedRoutes = require("./protected");

const router = express.Router();

router.use("/api", publicRoutes);
router.use("/api", protectedRoutes);

module.exports = router;