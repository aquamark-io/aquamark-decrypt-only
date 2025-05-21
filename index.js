const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { PDFDocument } = require("pdf-lib");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(fileUpload());

app.post("/decrypt", async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    const file = req.files.pdf;
    let pdfBytes;

    const tempId = Date.now();
    const inPath = path.join("/tmp", `in-${tempId}.pdf`);
    const outPath = path.join("/tmp", `out-${tempId}.pdf`);

    // Write input PDF to disk
    fs.writeFileSync(inPath, file.data);

    try {
      // Attempt decryption with qpdf
      await new Promise((resolve, reject) => {
        exec(`qpdf --decrypt "${inPath}" "${outPath}"`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      // If successful, read decrypted file
      pdfBytes = fs.readFileSync(outPath);

      // Clean up
      fs.unlinkSync(inPath);
      fs.unlinkSync(outPath);
    } catch (err) {
      console.warn("Decryption failed — returning original file.");
      pdfBytes = file.data;

      // Clean up only input file
      if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }

    const base64Pdf = Buffer.from(pdfBytes).toString("base64");
    res.json({ base64: base64Pdf });
  } catch (err) {
    console.error("❌ An error occurred:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🔐 PDF Decryption Service running on port ${PORT}`);
});
