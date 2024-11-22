var express = require("express");
var router = express.Router();

// In-memory database
let orders = [];

// Orders CRUD
router.get("/", (req, res) => {
  res.json(orders);
});

router.post("/", express.json(), (req, res) => {
  const order = {
    id: Date.now().toString(),
    ...req.body,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  res.status(201).json(order);
});

router.get("/:id", (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json(order);
});

router.put("/:id", express.json(), (req, res) => {
  const index = orders.findIndex((o) => o.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Order not found" });
  }
  orders[index] = { ...orders[index], ...req.body };
  res.json(orders[index]);
});

module.exports = router;
