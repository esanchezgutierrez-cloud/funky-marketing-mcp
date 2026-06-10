import express from "express";

const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Funky Marketing MCP server is running.");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "funky-marketing-mcp"
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
