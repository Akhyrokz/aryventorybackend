const { S3Client } = require("@aws-sdk/client-s3");
// const { v4: uuidv4 } = require('uuid');
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");

const s3 = new S3Client({
  credentials: {
    secretAccessKey: process.env.s3Secret_Key,
    accessKeyId: process.env.s3Access_Key,
  },
  region: process.env.AWS_REGION,
});
// const storage = multerS3({
//   s3: s3,
//   bucket: process.env.s3Bucket_Name,
//   contentType: multerS3.AUTO_CONTENT_TYPE,
//   metadata: function (req, file, cb) {
//     cb(null, { fieldName: file.fieldname });
//   },
//   key: function (req, file, cb) {
//     cb(null, `${Date.now().toString()}`);
//   },
// });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./uploads";

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    console.log("Saving file to directory:", dir); // Debugging log
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const uploadFunction = multer({ storage: storage });
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif|mp4|mov|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb("Error: Images only (jpeg, jpg, png, gif, mp4, mov, pdf)!");
  }
}

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, (error, result) => {
      if (error) {
        cb(new Error(error));
      } else {
        cb(null, result);
      }
    });
  },
});

const uploadMiddleWare = upload;

module.exports = uploadMiddleWare;
