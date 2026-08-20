const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument } = require("pdf-lib");

const DEFAULT_EXTRACT_PDF_WEBHOOK_URL = "https://n8n.cmg1.online/webhook/extractpdf";
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

function parseSingleColumnCsv(csvText) {
  const values = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index++) {
    const char = csvText[index];
    if (char === '"') {
      if (inQuotes && csvText[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      values.push(field);
      field = "";
      if (char === "\r" && csvText[index + 1] === "\n") index++;
    } else {
      field += char;
    }
  }

  if (field) values.push(field);
  return values;
}

function parseGoogleSheetReference(sheetUrl, spreadsheetId, gid) {
  let resolvedSpreadsheetId = String(spreadsheetId || "").trim();
  let resolvedGid = String(gid || "").trim();

  if (sheetUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(sheetUrl);
    } catch {
      throw new Error("invalid-sheet-url");
    }
    if (parsedUrl.hostname !== "docs.google.com") throw new Error("invalid-sheet-url");
    const idMatch = parsedUrl.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) throw new Error("invalid-sheet-url");
    resolvedSpreadsheetId = idMatch[1];
    resolvedGid = parsedUrl.searchParams.get("gid") || resolvedGid;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(resolvedSpreadsheetId)) {
    throw new Error("invalid-spreadsheet-id");
  }
  if (!/^\d+$/.test(resolvedGid)) throw new Error("invalid-sheet-gid");
  return {spreadsheetId: resolvedSpreadsheetId, gid: resolvedGid};
}

async function commitFirestoreOperations(operations) {
  for (let index = 0; index < operations.length; index += 450) {
    const batch = admin.firestore().batch();
    for (const operation of operations.slice(index, index + 450)) operation(batch);
    await batch.commit();
  }
}

async function isAuthenticatedRequest(req, suppliedSecret) {
  const configuredSecret = getTagSyncSecret();
  if (configuredSecret && suppliedSecret === configuredSecret) return true;

  const authorization = String(req.get("Authorization") || "");
  if (!authorization.startsWith("Bearer ")) return false;
  const decodedToken = await admin.auth().verifyIdToken(authorization.slice(7));
  return Boolean(decodedToken?.uid);
}

exports.syncGoogleSheetTagNos = functions
  .region("asia-southeast1")
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "method-not-allowed" });
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
      sheetUrl = "",
      gid = "",
      sheetName = "",
      range = "D2:D",
      skipHeader = false,
    } = req.body || {};

    let authenticated = false;
    try {
      authenticated = await isAuthenticatedRequest(req, secret);
    } catch (error) {
      console.error("Tag sync authentication failed", error);
    }
    if (!authenticated) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }

    if (!projectId) {
      res.status(400).json({ ok: false, error: "missing-project-id" });
      return;
    }

    if (!/^[A-Z]+\d*:[A-Z]+\d*$/i.test(range)) {
      res.status(400).json({ok: false, error: "invalid-range"});
      return;
    }

    let incomingValues = Array.isArray(values) ? values : tags;
    let resolvedSpreadsheetId = String(spreadsheetId || "").trim();
    let resolvedGid = String(gid || "").trim();

    try {
      if (!Array.isArray(incomingValues)) {
        const reference = parseGoogleSheetReference(sheetUrl, spreadsheetId, gid);
        resolvedSpreadsheetId = reference.spreadsheetId;
        resolvedGid = reference.gid;
        const csvUrl = new URL(`https://docs.google.com/spreadsheets/d/${resolvedSpreadsheetId}/gviz/tq`);
        csvUrl.searchParams.set("tqx", "out:csv");
        csvUrl.searchParams.set("gid", resolvedGid);
        csvUrl.searchParams.set("range", range);
        const sheetResponse = await fetch(csvUrl.toString(), {redirect: "follow"});
        const contentType = sheetResponse.headers.get("content-type") || "";
        if (!sheetResponse.ok || !contentType.includes("text/csv")) {
          throw new Error(`sheet-not-readable:${sheetResponse.status}`);
        }
        incomingValues = parseSingleColumnCsv(await sheetResponse.text());
        if (skipHeader) incomingValues = incomingValues.slice(1);
      }
    } catch (error) {
      console.error("Failed to read Google Sheet", error);
      res.status(502).json({
        ok: false,
        error: "sheet-not-readable",
        message: "Google Sheet must be shared as Anyone with the link (Viewer).",
      });
      return;
    }

    const appliedPrefix = String(prefix || building || "").trim();
    const preparedTags = sanitizeTagValues(incomingValues, appliedPrefix);
    const collectionRef = admin.firestore()
      .collection("QC-System")
      .doc("root")
      .collection("tagOptions");

    const existingSnapshot = await collectionRef
      .where("projectId", "==", projectId)
      .where("field", "==", "tagNo")
      .get();

    const now = admin.firestore.FieldValue.serverTimestamp();
    const existingById = new Map(existingSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data()]));
    const incomingDocIds = new Set();
    const operations = [];
    let created = 0;
    let skipped = 0;
    let deactivated = 0;

    for (const item of preparedTags) {
      const docId = buildOptionDocId(projectId, "tagNo", item.value);
      if (!docId) continue;
      incomingDocIds.add(docId);
      if (existingById.has(docId)) {
        skipped++;
        const existing = existingById.get(docId);
        if (existing.source === "google-sheet") {
          operations.push((batch) => batch.set(collectionRef.doc(docId), {
            active: true,
            syncedAt: now,
            updatedAt: now,
          }, {merge: true}));
        }
        continue;
      }
      operations.push((batch) => batch.set(collectionRef.doc(docId), {
        projectId,
        field: "tagNo",
        value: item.value,
        prefix: item.prefix,
        building: item.prefix,
        tagValue: item.tagValue,
        normalizedValue: item.normalizedValue,
        active: true,
        source: "google-sheet",
        spreadsheetId: resolvedSpreadsheetId,
        gid: resolvedGid,
        sheetName,
        range,
        syncedAt: now,
        createdAt: now,
        updatedAt: now,
      }, { merge: true }));
      created++;
    }

    for (const docSnap of existingSnapshot.docs) {
      const data = docSnap.data();
      if (
        data.source === "google-sheet" &&
        data.spreadsheetId === resolvedSpreadsheetId &&
        !incomingDocIds.has(docSnap.id) &&
        data.active !== false
      ) {
        operations.push((batch) => batch.set(docSnap.ref, {
          active: false,
          syncedAt: now,
          updatedAt: now,
        }, {merge: true}));
        deactivated++;
      }
    }

    await commitFirestoreOperations(operations);

    res.status(200).json({
      ok: true,
      projectId,
      prefix: appliedPrefix,
      received: preparedTags.length,
      created,
      skipped,
      deactivated,
    });
  });

exports.processExtractPdf = functions
  .runWith({ timeoutSeconds: 300, memory: "1GB" })
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

        const {
          pdfStoragePath,
          page,
          webhookUrl = DEFAULT_EXTRACT_PDF_WEBHOOK_URL,
          fileName,
          totalPages,
          folderId,
        } = afterData;

        if (!pdfStoragePath) {
          throw new Error("Missing pdfStoragePath");
        }
        const requestedPage = Number(page);
        if (!Number.isInteger(requestedPage) || requestedPage < 1) {
          throw new Error(`Invalid page number: ${page}`);
        }

        // 1. Download PDF from Firebase Storage
        console.log(`Downloading PDF for folder ${folderId || "unknown"} from ${pdfStoragePath}`);
        const bucket = admin.storage().bucket();
        const file = bucket.file(pdfStoragePath);
        const [fileBuffer] = await file.download();

        // 2. Extract specific page using pdf-lib
        console.log(`Extracting page ${requestedPage}`);
        const pdfDoc = await PDFDocument.load(fileBuffer);
        if (requestedPage > pdfDoc.getPageCount()) {
          throw new Error(`Page ${requestedPage} exceeds PDF page count ${pdfDoc.getPageCount()}`);
        }
        const newPdfDoc = await PDFDocument.create();
        
        // PDF-lib uses 0-based index for pages
        const pageIndex = requestedPage - 1;
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
        newPdfDoc.addPage(copiedPage);
        
        const singlePagePdfBytes = await newPdfDoc.save();
        const singlePageBuffer = Buffer.from(singlePagePdfBytes);

        // 3. Send to n8n webhook
        const sourceFileName = fileName || path.basename(pdfStoragePath) || "document.pdf";
        const singlePageFileName = `${sourceFileName.replace(/\.pdf$/i, "")}_page_${requestedPage}.pdf`;
        console.log(`Sending to n8n Webhook: ${webhookUrl}`);
        
        const formData = new FormData();
        formData.append("file", singlePageBuffer, {
          filename: singlePageFileName,
          contentType: "application/pdf",
        });
        formData.append("fileName", sourceFileName);
        formData.append("page", String(requestedPage));
        formData.append("total", String(totalPages || pdfDoc.getPageCount()));
        formData.append("pageNumber", String(requestedPage));
        formData.append("folderId", String(folderId || ""));
        formData.append("pdfStoragePath", pdfStoragePath);

        // จบ request ก่อน timeout ของ Cloud Function เพื่อให้บันทึก calc_error
        // และไม่ปล่อยให้หน้าเว็บส่งหน้าถัดไปซ้อนกับงานที่ค้างอยู่
        const controller = new AbortController();
        const webhookTimeout = setTimeout(() => controller.abort(), 240_000);
        let response;
        try {
          response = await fetch(webhookUrl, {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
        } catch (error) {
          if (error.name === "AbortError") {
            throw new Error("n8n webhook timed out after 240 seconds");
          }
          throw error;
        } finally {
          clearTimeout(webhookTimeout);
        }

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
