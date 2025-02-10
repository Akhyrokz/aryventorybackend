const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const route = require("./routes/route");
dotenv.config();
const { sequelize, connectToDatabase } = require("./config/config"); // Import from dbconnection
const setupAssociations = require("./model/association");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const http = require("http");
const server = http.createServer(app);
const { initializeSocket } = require("./socketConfig/socket");
app.use("/ulploads", express.static(path.join(__dirname, "uploads")));
app.use(bodyParser.json());
app.use(express.json());
app.use("/", route);
app.use(
  cors({
    origin: "http://localhost:3000", // Change this to your React Native app's URL or IP
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

// Initialize Socket.IO
initializeSocket(server);

//sync the Sequelize models with your database and start your server.
connectToDatabase().then(async () => {
  // Sync models (create tables if not exist)
  // Setup associations
  setupAssociations();
  await sequelize.sync({ force: false });

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
