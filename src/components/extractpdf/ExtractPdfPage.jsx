import { useState, useRef, useCallback, useEffect } from 'react';
import { FileUp, Send, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, FileText, FolderOpen, ArrowLeft, Plus, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { useApp } from '../../context/AppContext';

// ใช้ worker จาก unpkg (รองรับ pdfjs-dist v5+)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// สถานะของแต่ละ row
const STATUS = {
  PENDING:  'pending',
  SENDING:  'sending',
  SUCCESS:  'success',
  ERROR:    'error',
};

// สถานะการคำนวน
const CALC_STATUS = {
  WAITING:    'waiting',       // รอคำนวน
  WAITING_CLOUD: 'WAITING_CLOUD', // รอคำนวนบนคลาวด์
  CALCULATING: 'calculating',   // กำลังคำนวน
  CALCULATED:  'calculated',    // คำนวนแล้ว
  CALC_ERROR:  'calc_error',    // คำนวนผิดพลาด
};

function StatusBadge({ status, message }) {
  if (status === STATUS.PENDING)
    return <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-sm">รอส่ง</span>;
  if (status === STATUS.SENDING)
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
        <Loader2 size={12} className="animate-spin" /> กำลังส่ง…
      </span>
    );
  if (status === STATUS.SUCCESS)
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 size={12} /> สำเร็จ
      </span>
    );
  if (status === STATUS.ERROR)
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700" title={message}>
        <XCircle size={12} /> ผิดพลาด
      </span>
    );
  return null;
}

function CalcStatusBadge({ calcStatus, message }) {
  if (calcStatus === CALC_STATUS.WAITING)
    return <span className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 shadow-sm">รอคำนวน</span>;
  if (calcStatus === CALC_STATUS.WAITING_CLOUD)
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
        <Loader2 size={12} className="animate-spin" /> ส่งคลาวด์แล้ว…
      </span>
    );
  if (calcStatus === CALC_STATUS.CALCULATING)
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
        <Loader2 size={12} className="animate-spin" /> กำลังคำนวน…
      </span>
    );
  if (calcStatus === CALC_STATUS.CALCULATED)
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
        <CheckCircle2 size={12} /> คำนวนแล้ว
      </span>
    );
  if (calcStatus === CALC_STATUS.CALC_ERROR)
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700" title={message}>
        <XCircle size={12} /> คำนวนผิดพลาด
      </span>
    );
  return null;
}

export default function ExtractPdfPage() {
  const { selectedProjectId, extractPdfItems, addExtractPdf, updateExtractPdf, deleteExtractPdf } = useApp();
  
  // View state
  const [currentView, setCurrentView] = useState('folders'); // 'folders' | 'pages'
  const [currentFolder, setCurrentFolder] = useState(null);
  
  // Data state
  const [folders, setFolders] = useState([]);
  const [rows, setRows] = useState([]);
  
  // UI state
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [calcProgress, setCalcProgress] = useState({ current: 0, total: 0 });
  const [thumbnailProgress, setThumbnailProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);

  // โหลดข้อมูลจาก Firestore
  useEffect(() => {
    if (!selectedProjectId || !extractPdfItems) return;
    
    // กรองเฉพาะ project ปัจจุบัน
    const projectItems = extractPdfItems.filter(item => item.projectId === selectedProjectId);
    
    // แยกเป็นโฟลเดอร์ (group by folderId)
    const folderMap = {};
    projectItems.forEach(item => {
      if (item.folderId) {
        if (!folderMap[item.folderId]) {
          folderMap[item.folderId] = {
            id: item.folderId,
            name: item.folderName,
            fileName: item.fileName,
            totalPages: item.totalPages || 0,
            pdfUrl: item.pdfUrl,
            createdAt: item.createdAt,
            pages: [],
          };
        }
        if (item.page) {
          folderMap[item.folderId].pages.push(item);
        }
      }
    });
    
    setFolders(Object.values(folderMap).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    ));
  }, [extractPdfItems, selectedProjectId]);

  // โหลดหน้าของโฟลเดอร์ปัจจุบัน
  useEffect(() => {
    if (!currentFolder || !extractPdfItems) return;
    
    const folderPages = extractPdfItems
      .filter(item => item.folderId === currentFolder.id && item.page)
      .sort((a, b) => a.page - b.page);
    
    setRows(folderPages);
  }, [currentFolder, extractPdfItems]);

  async function renderPageThumbnail(page) {
    const baseViewport = page.getViewport({ scale: 1 });
    const fitScale = Math.min(180 / baseViewport.width, 128 / baseViewport.height);
    const scale = fitScale * Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  // ── แปลง PDF เป็น list of rows ──────────────────────────────────────────
  async function processPdf(file) {
    setIsProcessing(true);
    setFileName(file.name);
    setProgress({ current: 0, total: 0 });
    setThumbnailProgress({ current: 0, total: 0 });

    try {
      // 1. อัปโหลด PDF ไปยัง Firebase Storage
      const folderId = `pdf-${Date.now()}`;
      const pdfPath = `extract-pdf/${selectedProjectId}/${folderId}/${file.name}`;
      const pdfStorageRef = storageRef(storage, pdfPath);
      
      console.log('📤 Uploading PDF to Storage...');
      await uploadBytes(pdfStorageRef, file);
      const pdfUrl = await getDownloadURL(pdfStorageRef);
      console.log('✅ PDF uploaded:', pdfUrl);

      // 2. แยกหน้า PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      // 3. สร้างโฟลเดอร์ใน Firestore
      const folderData = {
        id: folderId,
        projectId: selectedProjectId,
        folderId: folderId,
        folderName: file.name.replace('.pdf', ''),
        fileName: file.name,
        totalPages: totalPages,
        pdfUrl: pdfUrl,
        pdfStoragePath: pdfPath,
        createdAt: new Date().toISOString(),
      };
      
      await addExtractPdf(folderData);
      console.log('📁 Folder created in Firestore');

      // 4. สร้างรายการหน้า
      const newRows = [];
      setThumbnailProgress({ current: 0, total: totalPages });

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const thumbnail = await renderPageThumbnail(page);
        
        const pageData = {
          id: `${folderId}-page-${pageNum}`,
          projectId: selectedProjectId,
          folderId: folderId,
          folderName: file.name.replace('.pdf', ''),
          fileName: file.name,
          totalPages: totalPages,
          pdfUrl: pdfUrl,
          pdfStoragePath: pdfPath,
          page: pageNum,
          thumbnail: thumbnail,
          dwgNo: '',
          title: '',
          rev: '',
          calcStatus: CALC_STATUS.WAITING,
          status: STATUS.PENDING,
          createdAt: new Date().toISOString(),
        };
        
        newRows.push(pageData);
        
        // บันทึกลง Firestore
        await addExtractPdf(pageData);
        
        setThumbnailProgress({ current: pageNum, total: totalPages });
      }

      console.log(`✅ Created ${totalPages} pages in Firestore`);
      
      // 5. เข้าสู่โฟลเดอร์ที่สร้าง
      setCurrentFolder({
        id: folderId,
        name: file.name.replace('.pdf', ''),
        fileName: file.name,
        totalPages: totalPages,
        pdfUrl: pdfUrl,
        createdAt: folderData.createdAt,
        pages: newRows,
      });
      setCurrentView('pages');
      setRows(newRows);
      
    } catch (err) {
      console.error('Failed to process PDF', err);
      alert('ไม่สามารถแยกหน้า PDF ได้ กรุณาลองไฟล์อื่น');
      setFileName('');
      setThumbnailProgress({ current: 0, total: 0 });
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === 'application/pdf') await processPdf(file);
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (file?.type === 'application/pdf') await processPdf(file);
    e.target.value = '';
  }, []);

  // ── อัปเดต field ใน row ──────────────────────────────────────────────────
  async function updateRow(id, field, value) {
    // อัปเดต local state
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    
    // อัปเดต Firebase
    try {
      await updateExtractPdf(id, {
        [field]: value,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to update Firebase:', err);
    }
  }

  // ── แปลง PDF page เป็น base64 PNG ────────────────────────────────────────
  async function renderPageToBase64(pdfFile, pageNum) {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png').split(',')[1]; // base64 only
  }

  // ── แยก PDF เป็นหน้าเดียวและคืนค่าเป็น Uint8Array ────────────────────────────────
  async function extractSinglePagePdfFromBlob(pdfBlob, pageNum) {
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      
      // โหลด PDF ด้วย pdf-lib
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // สร้าง PDF ใหม่
      const newPdfDoc = await PDFDocument.create();
      
      // คัดลอกหน้าที่ต้องการ (pageNum - 1 เพราะ pdf-lib ใช้ zero-based index)
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
      newPdfDoc.addPage(copiedPage);
      
      // บันทึกเป็น bytes
      const pdfBytes = await newPdfDoc.save();
      
      return pdfBytes; // คืนค่า Uint8Array โดยตรง
    } catch (error) {
      console.error('Error extracting single page PDF:', error);
      throw error;
    }
  }

  // ── ส่งทีละ row ──────────────────────────────────────────────────────────
  async function sendAll() {
    if (!N8N_WEBHOOK_URL) {
      alert('กรุณาตั้งค่า VITE_N8N_WEBHOOK_URL ใน .env ก่อน');
      return;
    }
    if (!rows.length) return;

    setIsSending(true);
    setProgress({ current: 0, total: rows.length });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // mark sending
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: STATUS.SENDING } : r));

      try {
        const base64Image = await renderPageToBase64(row.pdfFile, row.page);

        const payload = {
          fileName,
          page:     row.page,
          total:    row.total,
          dwgNo:    row.dwgNo,
          title:    row.title,
          rev:      row.rev,
          image:    base64Image,   // PNG base64 ของหน้านั้น
        };

        const res = await fetch(N8N_WEBHOOK_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        let responseData = null;
        try { responseData = await res.json(); } catch { /* no body */ }

        setRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, status: STATUS.SUCCESS, response: responseData } : r
        ));
      } catch (err) {
        setRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, status: STATUS.ERROR, response: err.message } : r
        ));
      }

      setProgress({ current: i + 1, total: rows.length });
    }

    setIsSending(false);
  }

  // ── คำนวน (ส่งเฉพาะรายการที่รอคำนวน) ────────────────────────────────────
  async function calculateAll() {
    if (!N8N_WEBHOOK_URL) {
      alert('กรุณาตั้งค่า VITE_N8N_WEBHOOK_URL ใน .env ก่อน');
      return;
    }

    const waitingRows = rows.filter(r => r.calcStatus === CALC_STATUS.WAITING);
    if (!waitingRows.length) {
      alert('ไม่มีรายการที่รอคำนวน');
      return;
    }

    setIsCalculating(true);
    setCalcProgress({ current: 0, total: waitingRows.length });

    // Update Firestore statuses so Cloud Functions can pick them up
    for (let i = 0; i < waitingRows.length; i++) {
      const row = waitingRows[i];

      const updateData = {
        calcStatus: CALC_STATUS.WAITING_CLOUD,
        webhookUrl: N8N_WEBHOOK_URL,
        updatedAt: new Date().toISOString(),
      };

      // Fallback for old items without pdfStoragePath
      if (!row.pdfStoragePath && currentFolder?.id) {
        updateData.pdfStoragePath = `extract-pdf/${selectedProjectId}/${currentFolder.id}/${currentFolder.fileName}`;
      }

      // Update local state immediately
      setRows(prev => prev.map(r =>
        r.id === row.id ? { ...r, ...updateData } : r
      ));

      try {
        await updateExtractPdf(row.id, updateData);
        console.log(`✅ Page ${row.page} sent to cloud queue`);
      } catch (err) {
        console.error('❌ Failed to update Firebase:', err);
        // Revert local state on error
        setRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, calcStatus: CALC_STATUS.CALC_ERROR, calcResponse: err.message } : r
        ));
      }

      setCalcProgress({ current: i + 1, total: waitingRows.length });
    }

    setIsCalculating(false);
    alert('ส่งรายการไปคำนวนบนคลาวด์แล้ว คุณสามารถปิดเบราว์เซอร์หรือไปทำอย่างอื่นได้เลยครับ ระบบจะทำการประมวลผลอยู่เบื้องหลัง');
  }

  // ── Clear ────────────────────────────────────────────────────────────────
  function clearAll() {
    setRows([]);
    setFileName('');
    setProgress({ current: 0, total: 0 });
    setCalcProgress({ current: 0, total: 0 });
  }

  const successCount = rows.filter(r => r.status === STATUS.SUCCESS).length;
  const errorCount   = rows.filter(r => r.status === STATUS.ERROR).length;
  const waitingCalcCount = rows.filter(r => r.calcStatus === CALC_STATUS.WAITING).length;
  const waitingCloudCount = rows.filter(r => r.calcStatus === CALC_STATUS.WAITING_CLOUD || r.calcStatus === CALC_STATUS.CALCULATING).length;
  const calculatedCount = rows.filter(r => r.calcStatus === CALC_STATUS.CALCULATED).length;

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {currentView === 'pages' && (
            <button
              onClick={() => {
                setCurrentView('folders');
                setCurrentFolder(null);
                setRows([]);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              กลับ
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              {currentView === 'folders' ? 'Extract PDF - โฟลเดอร์' : `${currentFolder?.name || 'รายการหน้า'}`}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {currentView === 'folders' 
                ? 'อัปโหลด PDF เพื่อสร้างโฟลเดอร์ใหม่ หรือเลือกโฟลเดอร์เพื่อดูรายการ'
                : `${currentFolder?.totalPages || 0} หน้า - คลิก "เพิ่มไฟล์" เพื่ออัปโหลด PDF เพิ่มเติม`
              }
            </p>
          </div>
        </div>
        {currentView === 'pages' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={15} />
            เพิ่มไฟล์
          </button>
        )}
      </div>

      {/* ── Webhook URL warning ── */}
      {!N8N_WEBHOOK_URL && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 text-xs">
          <AlertCircle size={14} className="shrink-0" />
          <span>ยังไม่ได้ตั้งค่า <code className="font-mono bg-amber-500/20 px-1 rounded">VITE_N8N_WEBHOOK_URL</code> ใน .env</span>
        </div>
      )}

      {/* ── Folders View ── */}
      {currentView === 'folders' && (
        <>
          {/* Drop Zone */}
          {folders.length === 0 && !isProcessing && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-16 cursor-pointer transition-colors
                ${isDragging
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-orange-400 hover:bg-slate-50'
                }`}
            >
              <FileUp size={36} className={isDragging ? 'text-orange-500' : 'text-slate-400'} />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">ลากไฟล์ PDF มาวางที่นี่</p>
                <p className="text-xs text-slate-500 mt-1">หรือคลิกเพื่อเลือกไฟล์ · รองรับ PDF เท่านั้น</p>
              </div>
            </div>
          )}

          {/* Folders Grid */}
          {folders.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Add New Folder Card */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50 rounded-xl cursor-pointer transition-colors group"
              >
                <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                  <Plus size={28} className="text-slate-400 group-hover:text-orange-500" />
                </div>
                <p className="text-sm font-medium text-slate-600 group-hover:text-orange-600">อัปโหลด PDF ใหม่</p>
              </div>

              {/* Folder Cards */}
              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => {
                    setCurrentFolder(folder);
                    setCurrentView('pages');
                  }}
                  className="flex flex-col p-5 bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                      <FolderOpen size={24} className="text-orange-500" />
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {folder.pages?.length || folder.totalPages || 0} หน้า
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 truncate mb-1" title={folder.name}>
                    {folder.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate" title={folder.fileName}>
                    {folder.fileName}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(folder.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Pages View ── */}
      {currentView === 'pages' && (
        <>
          {/* File info + Action buttons */}
          {rows.length > 0 && (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{currentFolder?.fileName}</p>
                  <p className="text-xs text-slate-500">{rows.length} หน้า</p>
                </div>
                {currentFolder?.pdfUrl && (
                  <a
                    href={currentFolder.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 ml-2"
                  >
                    <Download size={12} />
                    ดาวน์โหลด PDF
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Progress */}
                {isSending && (
                  <div className="text-xs font-medium text-slate-500">
                    ส่ง: {progress.current} / {progress.total}
                  </div>
                )}
                {isCalculating && (
                  <div className="text-xs font-medium text-purple-600">
                    คำนวน: {calcProgress.current} / {calcProgress.total}
                  </div>
                )}
                {/* Summary badges */}
                {!isSending && !isCalculating && (
                  <>
                    {waitingCalcCount > 0 && (
                      <span className="text-xs text-amber-600 font-medium">{waitingCalcCount} รอคำนวน</span>
                    )}
                    {waitingCloudCount > 0 && (
                      <span className="text-xs text-blue-600 font-medium">{waitingCloudCount} กำลังประมวลผลบนคลาวด์</span>
                    )}
                    {calculatedCount > 0 && (
                      <span className="text-xs text-green-600 font-medium">{calculatedCount} คำนวนแล้ว</span>
                    )}
                    {successCount > 0 && (
                      <span className="text-xs text-emerald-600 font-medium">{successCount} ส่งสำเร็จ</span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-xs text-red-600 font-medium">{errorCount} ผิดพลาด</span>
                    )}
                  </>
                )}

                <button
                  onClick={calculateAll}
                  disabled={isCalculating || isSending || !N8N_WEBHOOK_URL || waitingCalcCount === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {isCalculating
                    ? <><Loader2 size={14} className="animate-spin" /> กำลังคำนวน…</>
                    : <><AlertCircle size={14} /> คำนวน ({waitingCalcCount})</>
                  }
                </button>

                <button
                  onClick={sendAll}
                  disabled={isSending || isCalculating || !N8N_WEBHOOK_URL}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {isSending
                    ? <><Loader2 size={14} className="animate-spin" /> กำลังส่ง…</>
                    : <><Send size={14} /> ส่งทั้งหมด ({rows.length})</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Progress bars */}
          {isCalculating && calcProgress.total > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700 font-medium">กำลังคำนวน...</span>
                <span className="text-purple-600">{calcProgress.current} / {calcProgress.total}</span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(calcProgress.current / calcProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {isSending && progress.total > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-700 font-medium">กำลังส่งข้อมูล...</span>
                <span className="text-orange-600">{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-orange-100 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Thumbnail generation progress */}
          {isProcessing && thumbnailProgress.total > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-800">กำลังสร้าง Thumbnails...</p>
                <p className="text-[11px] text-blue-600 mt-0.5">
                  {thumbnailProgress.current} / {thumbnailProgress.total} หน้า
                </p>
              </div>
              <div className="w-48 bg-blue-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(thumbnailProgress.current / thumbnailProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Table */}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold w-16 text-center">หน้า</th>
                    <th className="px-4 py-3 font-semibold w-48 text-center">Thumbnail</th>
                    <th className="px-4 py-3 font-semibold w-48">DWG NO.</th>
                    <th className="px-4 py-3 font-semibold">TITLE</th>
                    <th className="px-4 py-3 font-semibold w-28">REV.</th>
                    <th className="px-4 py-3 font-semibold w-36 text-center">สถานะการคำนวน</th>
                    <th className="px-4 py-3 font-semibold w-32 text-center">สถานะการส่ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        row.status === STATUS.SUCCESS ? 'bg-emerald-50/50 hover:bg-emerald-50' :
                        row.status === STATUS.ERROR   ? 'bg-red-50/50 hover:bg-red-50' :
                        row.status === STATUS.SENDING ? 'bg-blue-50/50 hover:bg-blue-50' :
                        index % 2 === 0 ? 'bg-white hover:bg-orange-50/50' : 'bg-slate-50/60 hover:bg-orange-50/50'
                      }`}
                    >
                      {/* Page number */}
                      <td className="px-4 py-3 text-center text-slate-500 font-mono">
                        {row.page}
                      </td>

                      {/* Thumbnail */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          {row.thumbnail ? (
                            <div className="relative group">
                              <img
                                src={row.thumbnail}
                                alt={`Page ${row.page}`}
                                className="w-32 h-auto rounded-lg border-2 border-slate-200 shadow-sm transition-all group-hover:border-orange-400 group-hover:shadow-md cursor-pointer"
                                onClick={() => {
                                  const win = window.open();
                                  win.document.write(`<img src="${row.thumbnail}" style="max-width:100%; height:auto;" />`);
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors pointer-events-none">
                                <span className="text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 bg-slate-900/80 px-2 py-1 rounded">
                                  คลิกเพื่อดูขนาดเต็ม
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-32 h-20 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                              <Loader2 size={16} className="animate-spin text-slate-400" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* DWG NO. */}
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={row.dwgNo || ''}
                          onChange={e => updateRow(row.id, 'dwgNo', e.target.value)}
                          disabled={isSending || isCalculating}
                          placeholder="DWG-XXXX"
                          className={`w-full rounded-md border px-3 py-2 text-xs shadow-sm placeholder:text-slate-400 transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/15 disabled:bg-slate-100 disabled:text-slate-400 ${
                            row.calcStatus === CALC_STATUS.CALCULATED && row.dwgNo
                              ? 'border-green-300 bg-green-50 text-green-900 font-medium'
                              : 'border-slate-200 bg-white text-slate-800'
                          }`}
                        />
                      </td>

                      {/* TITLE */}
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={row.title || ''}
                          onChange={e => updateRow(row.id, 'title', e.target.value)}
                          disabled={isSending || isCalculating}
                          placeholder="Drawing Title"
                          className={`w-full rounded-md border px-3 py-2 text-xs shadow-sm placeholder:text-slate-400 transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/15 disabled:bg-slate-100 disabled:text-slate-400 ${
                            row.calcStatus === CALC_STATUS.CALCULATED && row.title
                              ? 'border-green-300 bg-green-50 text-green-900 font-medium'
                              : 'border-slate-200 bg-white text-slate-800'
                          }`}
                        />
                      </td>

                      {/* REV. */}
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={row.rev || ''}
                          onChange={e => updateRow(row.id, 'rev', e.target.value)}
                          disabled={isSending || isCalculating}
                          placeholder="A0"
                          className={`w-full rounded-md border px-3 py-2 text-xs shadow-sm placeholder:text-slate-400 transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/15 disabled:bg-slate-100 disabled:text-slate-400 ${
                            row.calcStatus === CALC_STATUS.CALCULATED && row.rev
                              ? 'border-green-300 bg-green-50 text-green-900 font-medium'
                              : 'border-slate-200 bg-white text-slate-800'
                          }`}
                        />
                      </td>

                      {/* Calc Status */}
                      <td className="px-4 py-2.5 text-center">
                        <CalcStatusBadge calcStatus={row.calcStatus} message={row.calcResponse} />
                      </td>

                      {/* Send Status */}
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={row.status} message={row.response} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
