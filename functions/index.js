const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument } = require("pdf-lib");

const DEFAULT_EXTRACT_PDF_WEBHOOK_URL = "https://n8n.cmgautomation.online/webhook/extractpdf";
const EXTRACT_PDF_COLLECTION_PATH = "QC-System/root/extractPdf";
const EXTRACT_PDF_QUEUE_LOCK_PATH = "QC-System/root/extractPdfQueue/lock";
const EXTRACT_PDF_QUEUE_LEASE_MS = 270_000;
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

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function queueOrderFor(docId, data) {
  // queueOrder is written by the client as a sortable string. Older rows do
  // not have it, so keep them usable as a fallback.
  return String(
    data.queueOrder
      || data.queueRequestedAt
      || data.calculationRequestedAt
      || data.createdAt
      || docId,
  );
}

async function kickExtractPdfQueue() {
  const lockRef = admin.firestore().doc(EXTRACT_PDF_QUEUE_LOCK_PATH);
  await lockRef.set({
    queueKickAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function claimNextExtractPdfJob() {
  const db = admin.firestore();
  const lockRef = db.doc(EXTRACT_PDF_QUEUE_LOCK_PATH);

  return db.runTransaction(async (transaction) => {
    const lockSnapshot = await transaction.get(lockRef);
    const lockData = lockSnapshot.exists ? lockSnapshot.data() : {};
    const now = Date.now();

    if (lockData.activeDocId && toMillis(lockData.leaseUntil) > now) {
      return null;
    }

    const waitingQuery = db.collection(EXTRACT_PDF_COLLECTION_PATH)
      .where("calcStatus", "==", "WAITING_CLOUD");
    const waitingSnapshot = await transaction.get(waitingQuery);
    const waitingJobs = waitingSnapshot.docs
      .map((snapshot) => ({
        docId: snapshot.id,
        ref: snapshot.ref,
        data: snapshot.data(),
      }))
      .sort((left, right) => {
        const order = queueOrderFor(left.docId, left.data)
          .localeCompare(queueOrderFor(right.docId, right.data), undefined, { numeric: true });
        return order || left.docId.localeCompare(right.docId);
      });

    if (!waitingJobs.length) {
      if (lockSnapshot.exists && lockData.activeDocId) {
        transaction.set(lockRef, {
          activeDocId: null,
          activeWorkerId: null,
          leaseUntil: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      return null;
    }

    const job = waitingJobs[0];
    const workerId = `${job.docId}-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const leaseUntil = new Date(now + EXTRACT_PDF_QUEUE_LEASE_MS);

    transaction.update(job.ref, {
      calcStatus: "calculating",
      queueStatus: "processing",
      queueWorkerId: workerId,
      queueStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.set(lockRef, {
      activeDocId: job.docId,
      activeWorkerId: workerId,
      leaseUntil,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ...job, workerId };
  });
}

async function releaseExtractPdfQueueLock(docId, workerId) {
  const db = admin.firestore();
  const lockRef = db.doc(EXTRACT_PDF_QUEUE_LOCK_PATH);

  await db.runTransaction(async (transaction) => {
    const lockSnapshot = await transaction.get(lockRef);
    const lockData = lockSnapshot.exists ? lockSnapshot.data() : {};
    if (lockData.activeDocId !== docId || lockData.activeWorkerId !== workerId) return;

    transaction.set(lockRef, {
      activeDocId: null,
      activeWorkerId: null,
      leaseUntil: null,
      // This update wakes the queue worker for the next row.
      queueKickAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function processExtractPdfJob(job) {
  const { docId, data } = job;
  const jobRef = admin.firestore().doc(`${EXTRACT_PDF_COLLECTION_PATH}/${docId}`);

  try {
    const {
      pdfStoragePath,
      page,
      webhookUrl = DEFAULT_EXTRACT_PDF_WEBHOOK_URL,
      fileName,
      totalPages,
      folderId,
    } = data;

    if (!pdfStoragePath) throw new Error("Missing pdfStoragePath");
    const requestedPage = Number(page);
    if (!Number.isInteger(requestedPage) || requestedPage < 1) {
      throw new Error(`Invalid page number: ${page}`);
    }

    // The browser only queues metadata. The worker downloads the source PDF
    // from Firebase Storage and creates the single-page payload server-side.
    console.log(`Downloading PDF for folder ${folderId || "unknown"} from ${pdfStoragePath}`);
    const bucket = admin.storage().bucket();
    const file = bucket.file(pdfStoragePath);
    const [fileBuffer] = await file.download();

    console.log(`Extracting page ${requestedPage}`);
    const pdfDoc = await PDFDocument.load(fileBuffer);
    if (requestedPage > pdfDoc.getPageCount()) {
      throw new Error(`Page ${requestedPage} exceeds PDF page count ${pdfDoc.getPageCount()}`);
    }
    const newPdfDoc = await PDFDocument.create();
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [requestedPage - 1]);
    newPdfDoc.addPage(copiedPage);
    const singlePageBuffer = Buffer.from(await newPdfDoc.save());

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

    const responseText = await response.text();
    if (!response.ok) {
      const responseDetail = responseText ? `: ${responseText.slice(0, 500)}` : "";
      throw new Error(`n8n responded with status ${response.status}: ${response.statusText}${responseDetail}`);
    }

    let responseData = null;
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (error) {
        console.log("n8n returned non-JSON response; preserving it as text.", error.message);
        responseData = responseText.slice(0, 2000);
      }
    }

    const updatedData = {
      calcStatus: "calculated",
      queueStatus: "completed",
      calcResponse: responseData,
      queueFinishedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (responseData && typeof responseData === "object") {
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
    await jobRef.update(updatedData);
  } catch (error) {
    console.error(`Error processing extract PDF job ${docId}:`, error);
    await jobRef.update({
      calcStatus: "calc_error",
      queueStatus: "error",
      calcResponse: error.message || String(error),
      queueFinishedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

// A row update only wakes the queue. It does not process the PDF itself, so
// closing the browser after enqueueing does not interrupt the work.
exports.processExtractPdf = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .region("asia-southeast1")
  .firestore
  .document(`${EXTRACT_PDF_COLLECTION_PATH}/{docId}`)
  .onUpdate(async (change) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    if (afterData.calcStatus !== "WAITING_CLOUD" || beforeData.calcStatus === "WAITING_CLOUD") return;
    await kickExtractPdfQueue();
  });

// Firestore is used as a durable queue and lock. Each invocation claims one
// row, processes it, releases the lock, and wakes the next invocation.
exports.processExtractPdfQueue = functions
  .runWith({ timeoutSeconds: 300, memory: "1GB" })
  .region("asia-southeast1")
  .firestore
  .document(EXTRACT_PDF_QUEUE_LOCK_PATH)
  .onWrite(async (change) => {
    if (!change.after.exists) return;

    const job = await claimNextExtractPdfJob();
    if (!job) return;

    try {
      await processExtractPdfJob(job);
    } finally {
      await releaseExtractPdfQueueLock(job.docId, job.workerId);
    }
  });
