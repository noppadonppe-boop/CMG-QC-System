const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument } = require("pdf-lib");
const FormData = require("form-data");
const fetch = require("node-fetch");

admin.initializeApp();

exports.processExtractPdf = functions
  .region("asia-southeast1") // Adjust region if needed, defaults to us-central1 if omitted, but let's use a safe default and the user can change it
  .firestore
  .document("QC-System/root/extractPdf/{docId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if calcStatus changed to WAITING_CLOUD
    if (afterData.calcStatus === "WAITING_CLOUD" && beforeData.calcStatus !== "WAITING_CLOUD") {
      const docId = context.params.docId;
      
      try {
        // Update status to CALCULATING
        await change.after.ref.update({
          calcStatus: "calculating",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const { pdfStoragePath, page, webhookUrl, fileName, totalPages } = afterData;

        if (!pdfStoragePath) {
          throw new Error("Missing pdfStoragePath");
        }
        if (!webhookUrl) {
          throw new Error("Missing webhookUrl");
        }

        // 1. Download PDF from Firebase Storage
        console.log(`Downloading PDF from ${pdfStoragePath}`);
        const bucket = admin.storage().bucket();
        const file = bucket.file(pdfStoragePath);
        const [fileBuffer] = await file.download();

        // 2. Extract specific page using pdf-lib
        console.log(`Extracting page ${page}`);
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const newPdfDoc = await PDFDocument.create();
        
        // PDF-lib uses 0-based index for pages
        const pageIndex = page - 1;
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
        newPdfDoc.addPage(copiedPage);
        
        const singlePagePdfBytes = await newPdfDoc.save();
        const singlePageBuffer = Buffer.from(singlePagePdfBytes);

        // 3. Send to n8n webhook
        const singlePageFileName = `${fileName.replace(".pdf", "")}_page_${page}.pdf`;
        console.log(`Sending to n8n Webhook: ${webhookUrl}`);
        
        const formData = new FormData();
        formData.append("file", singlePageBuffer, {
          filename: singlePageFileName,
          contentType: "application/pdf",
        });
        formData.append("fileName", fileName);
        formData.append("page", String(page));
        formData.append("total", String(totalPages));
        formData.append("pageNumber", String(page));

        const response = await fetch(webhookUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`n8n responded with status ${response.status}: ${response.statusText}`);
        }

        let responseData = null;
        try {
          const text = await response.text();
          if (text) {
            responseData = JSON.parse(text);
          }
        } catch (err) {
          console.log("Failed to parse n8n response as JSON, ignoring.", err);
        }

        // 4. Update Firestore with success and metadata
        const updatedData = {
          calcStatus: "calculated",
          calcResponse: responseData || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (responseData) {
          if (responseData.dwgNo || responseData.dwgno || responseData.DWG_NO) {
            updatedData.dwgNo = responseData.dwgNo || responseData.dwgno || responseData.DWG_NO;
          }
          if (responseData.title || responseData.TITLE) {
            updatedData.title = responseData.title || responseData.TITLE;
          }
          if (responseData.rev || responseData.REV) {
            updatedData.rev = responseData.rev || responseData.REV;
          }
        }

        console.log(`Updating document ${docId} with result`);
        await change.after.ref.update(updatedData);

      } catch (error) {
        console.error("Error processing extract PDF:", error);
        await change.after.ref.update({
          calcStatus: "calc_error",
          calcResponse: error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  });
