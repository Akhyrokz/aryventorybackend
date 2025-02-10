const { Sequelize } = require("sequelize");
const { S3Client, ListObjectsCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

// Initialize Sequelize for PostgreSQL connection
const sequelize = new Sequelize({
  dialect: "postgres",
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_DATABASE,
  pool: {
    max: 100,
    min: 0,
    idle: 10000,
    acquire: 60000,
  },
  dialectOptions: {
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            // Only use SSL in production
            require: true,
            rejectUnauthorized: false, // Set to true in production for security
          }
        : undefined,
  },

  // dialectOptions: {
  //   ssl: {
  //     require: true,
  //     rejectUnauthorized: false, // This is for development; set to true for production
  //   },
  // },
  logging: false,
});

// Function to connect to the PostgreSQL database
const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection to PostgreSQL has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the PostgreSQL database:", error);
    process.exit(1);
  }
};

// Initialize AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.s3Access_Key,
    secretAccessKey: process.env.s3Secret_Key,
  },
});

// Function to list objects in the S3 bucket
const listS3BucketContents = async () => {
  try {
    const data = await s3Client.send(
      new ListObjectsCommand({ Bucket: process.env.s3Bucket_Name })
    );
    console.log("S3 Bucket Contents:", data);
  } catch (error) {
    console.error("Error listing S3 bucket contents:", error);
  }
};

module.exports = { sequelize, connectToDatabase };
