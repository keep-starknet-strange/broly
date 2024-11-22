var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

// Status endpoint
router.get("/status", (req, res) => {
  res.json({ status: "healthy" });
});

module.exports = router;
