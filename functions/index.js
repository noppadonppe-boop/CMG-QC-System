const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument } = require("pdf-lib");
const FormData = require("form-data");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

admin.initializeApp();

function readEnvValueFromRootFile(key) {
  try {
    const envPath = path.resolve(__dirname, "..", ".env");
    if (!fs.existsSync(envPath)) return "";
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;
      const envKey = trimmed.slice(0, separatorIndex).trim();
      if (envKey !== key) continue;
      return trimmed.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, "$1");
    }
    return "";
  } catch (error) {
    console.error(`Failed to read ${key} from root .env`, error);
    return "";
  }
}

function getEnvValue(key) {
  return process.env[key] || readEnvValueFromRootFile(key);
}

function getTagSyncSecret() {
  const runtimeConfigSecret = functions.config()?.tag?.sync_secret;
  return getEnvValue("TAG_SYNC_SECRET") || runtimeConfigSecret || "";
}

function normalizeOptionValue(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function sanitizeTagValues(values, prefix = "") {
  const cleanPrefix = String(prefix || "").trim();
  const deduped = new Map();
  for (const rawValue of Array.isArray(values) ? values : []) {
    const tagValue = String(rawValue || "").trim();
    if (!tagValue) continue;
    const value = cleanPrefix ? `${cleanPrefix} ${tagValue}` : tagValue;
    const normalizedValue = normalizeOptionValue(value);
    if (!normalizedValue || deduped.has(normalizedValue)) continue;
    deduped.set(normalizedValue, {
      value,
      tagValue,
      prefix: cleanPrefix,
    });
  }
  return [...deduped.entries()].map(([normalizedValue, item]) => ({
    normalizedValue,
    value: item.value,
    tagValue: item.tagValue,
    prefix: item.prefix,
  }));
}

function buildOptionDocId(projectId, field, value) {
  const normalizedValue = normalizeOptionValue(value);
  if (!projectId || !field || !normalizedValue) return "";
  return `${projectId}__${field}__${encodeURIComponent(normalizedValue)}`;
}

exports.syncGoogleSheetTagNos = functions
  .region("asia-southeast1")
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "method-not-allowed" });
      return;
    }

    const configuredSecret = getTagSyncSecret();
    if (!configuredSecret) {
      res.status(500).json({ ok: false, error: "missing-tag-sync-secret" });
      return;
    }

    const {
      secret,
      projectId,
      values,
      tags,
      prefix = "",
      building = "",
      spreadsheetId = "",
      sheetName = "",
      range = "D3:D",
    } = req.body || {};

    if (secret !== configuredSecret) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }

    if (!projectId) {
      res.status(400).json({ ok: false, error: "missing-project-id" });
      return;
    }

    const appliedPrefix = String(prefix || building || "").trim();
    const preparedTags = sanitizeTagValues(Array.isArray(values) ? values : tags, appliedPrefix);
    const collectionRef = admin.firestore()
      .collection("QC-System")
      .doc("root")
      .collection("tagOptions");

    const existingSnapshot = await collectionRef
      .where("projectId", "==", projectId)
      .where("field", "==", "tagNo")
      .get();

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = admin.firestore().batch();
    const existingDocIds = new Set(existingSnapshot.docs.map((docSnap) => docSnap.id));
    let created = 0;
    let skipped = 0;

    for (const item of preparedTags) {
      const docId = buildOptionDocId(projectId, "tagNo", item.value);
      if (!docId) continue;
      if (existingDocIds.has(docId)) {
        skipped++;
        continue;
      }
      batch.set(collectionRef.doc(docId), {
        projectId,
        field: "tagNo",
        value: item.value,
        prefix: item.prefix,
        building: item.prefix,
        tagValue: item.tagValue,
        normalizedValue: item.normalizedValue,
        active: true,
        source: "google-sheet",
        spreadsheetId,
        sheetName,
        range,
        syncedAt: now,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
      created++;
    }

    await batch.commit();

    res.status(200).json({
      ok: true,
      projectId,
      prefix: appliedPrefix,
      received: preparedTags.length,
      created,
      skipped,
    });
  });

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
