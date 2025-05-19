const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors"); // ✅ NEW
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
require("dotenv").config();

const app = express();
app.use(cors()); // ✅ NEW
app.use(fileUpload());
app.use(express.json());

app.post("/decrypt", async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send("Missing file");
  }

  const file = req.files.file;

  try {
    let pdfBytes = file.data;
    try {
      await PDFDocument.load(pdfBytes, { ignoreEncryption: false });
    } catch {
      const tempId = Date.now();
      const inPath = path.join(__dirname, `temp-${tempId}.pdf`);
      const outPath = path.join(__dirname, `temp-${tempId}-dec.pdf`);
      fs.writeFileSync(inPath, file.data);
      await new Promise((resolve, reject) => {
        exec(`qpdf --decrypt "${inPath}" "${outPath}"`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      pdfBytes = fs.readFileSync(outPath);
      fs.unlinkSync(inPath);
      fs.unlinkSync(outPath);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("❌ Decrypt error:", err);
    res.status(500).send("Decryption failed: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔓 Decrypt-only server running on port ${PORT}`);
});
