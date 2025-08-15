import express from "express";
import "dotenv/config";
import docusignRouter from "./routes/docusign.js";

const app = express();
app.use(express.json());
app.use(docusignRouter);

app.get("/", (req, res) => res.send("Server is running ✅"));

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
