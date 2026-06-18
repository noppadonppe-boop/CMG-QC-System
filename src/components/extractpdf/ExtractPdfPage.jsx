import { useState, useRef, useCallback, useEffect } from 'react';
import { FileUp, Send, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, FileText, FolderOpen, ArrowLeft, Plus, Download, ArrowUp, ArrowDown, X, Pencil, RefreshCw, Check, ZoomIn, ZoomOut, Maximize, Expand } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';
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
  
  // Selection state
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // Modal download state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null); // { current, total, status, message }
  const [needsPdfFile, setNeedsPdfFile] = useState(false); // true = ต้องให้ผู้ใช้เลือกไฟล์ PDF ก่อนดาวน์โหลด
  const [namingFields, setNamingFields] = useState([
    { id: 'dwgNo', label: 'DWG NO.', enabled: true },
    { id: 'title', label: 'TITLE', enabled: true },
    { id: 'rev', label: 'REV.', enabled: true }
  ]);
  const [namingSeparator, setNamingSeparator] = useState('_');
  const downloadPdfInputRef = useRef(null); // ref สำหรับ input เลือกไฟล์ PDF เพื่อดาวน์โหลด

  // UI state
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [reviewRowId, setReviewRowId] = useState(null); // ID แถวที่กำลังรีวิวใน Modal
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [calcProgress, setCalcProgress] = useState({ current: 0, total: 0 });
  const [thumbnailProgress, setThumbnailProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);
  const pdfFileRef = useRef(null); // เก็บไฟล์ PDF ดั้งเดิมไว้ในหน่วยความจำ

  // Deletion states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');

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
            pdfStoragePath: item.pdfStoragePath,
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
    setSelectedRowIds([]); // Reset selection when changing folders
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
      
      // 5. เก็บไฟล์ PDF ไว้ในหน่วยความจำเพื่อใช้ตอนคำนวน
      pdfFileRef.current = file;
      
      // 6. เข้าสู่โฟลเดอร์ที่สร้าง
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

  // ── ลบโฟลเดอร์และข้อมูลทั้งหมด ──────────────────────────────────────────
  async function handleDeleteFolder(folder) {
    setIsDeleting(true);
    setDeleteStatus('กำลังลบไฟล์ PDF ใน Storage...');
    try {
      // 1. ลบ PDF ใน Storage
      const storagePath = folder.pdfStoragePath || `extract-pdf/${selectedProjectId}/${folder.id}/${folder.fileName}`;
      const fileRef = storageRef(storage, storagePath);
      await deleteObject(fileRef).catch(err => {
        console.warn('Failed to delete file from Storage or file does not exist:', err);
      });

      setDeleteStatus('กำลังลบข้อมูลในฐานข้อมูล Firebase...');
      // 2. ลบเอกสารที่เกี่ยวข้องทั้งหมดใน Firestore (ทั้ง folder และ pages ของมัน)
      const itemsToDelete = extractPdfItems.filter(item => item.folderId === folder.id);
      await Promise.all(itemsToDelete.map(item => deleteExtractPdf(item.id)));

      console.log('✅ ลบโฟลเดอร์สำเร็จ');
    } catch (err) {
      console.error('Error during deletion:', err);
      alert('เกิดข้อผิดพลาดในการลบโฟลเดอร์: ' + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteStatus('');
      setDeleteTarget(null);
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

  // ── จัดการการเลือกแถว (Row Selection) ──────────────────────────────────────
  const handleToggleRow = (rowId) => {
    setSelectedRowIds(prev => 
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };

  const handleToggleAll = () => {
    if (selectedRowIds.length === rows.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(rows.map(r => r.id));
    }
  };

  // ── จัดการลำดับการตั้งชื่อไฟล์ ─────────────────────────────────────────────────
  const moveField = (index, direction) => {
    const newFields = [...namingFields];
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      const temp = newFields[index];
      newFields[index] = newFields[targetIndex];
      newFields[targetIndex] = temp;
      setNamingFields(newFields);
    }
  };

  const toggleFieldEnabled = (index) => {
    const newFields = [...namingFields];
    newFields[index].enabled = !newFields[index].enabled;
    setNamingFields(newFields);
  };

  // ── สร้างตัวอย่างชื่อไฟล์สำหรับ Live Preview ──────────────────────────────────
  const getPreviewFilename = () => {
    const previewRow = rows.find(r => selectedRowIds.includes(r.id)) || rows[0];
    if (!previewRow) return 'example.pdf';

    const parts = namingFields
      .filter(f => f.enabled)
      .map(f => {
        if (f.id === 'dwgNo') return previewRow.dwgNo || 'DWG-001';
        if (f.id === 'title') return previewRow.title || 'FLOOR-PLAN';
        if (f.id === 'rev') return previewRow.rev || 'A';
        return '';
      })
      .filter(val => val !== '');

    if (parts.length === 0) {
      return `${(currentFolder?.name || 'document')}_Page_${previewRow.page}.pdf`;
    }

    return parts.join(namingSeparator) + '.pdf';
  };

  // ── สร้างชื่อไฟล์สำหรับดาวน์โหลดจริง ──────────────────────────────────────────
  const buildFilename = (row) => {
    const parts = namingFields
      .filter(f => f.enabled)
      .map(f => {
        if (f.id === 'dwgNo') return (row.dwgNo || '').trim();
        if (f.id === 'title') return (row.title || '').trim();
        if (f.id === 'rev') return (row.rev || '').trim();
        return '';
      })
      .filter(val => val !== '');

    if (parts.length === 0) {
      return `${(currentFolder?.name || 'document')}_Page_${row.page}`;
    }

    return parts.join(namingSeparator);
  };

  const sanitizeFilename = (filename) => {
    return filename.replace(/[\\/:*?"<>|]/g, '_');
  };

  // ── ฟังก์ชันดาวน์โหลด PDF แยกหน้าตามรายการที่เลือก ─────────────────────────────
  async function handleDownloadSelected() {
    if (selectedRowIds.length === 0) return;

    // ตรวจสอบว่ามีไฟล์ PDF ในหน่วยความจำหรือไม่
    let pdfFile = pdfFileRef.current;

    // ถ้าไม่มีไฟล์ในหน่วยความจำ → โหลดจาก Firebase Storage โดยตรงผ่าน SDK (ไม่ติด CORS)
    if (!pdfFile) {
      // หา Storage Path ของไฟล์ PDF
      const storagePath = currentFolder?.pdfStoragePath
        || (currentFolder?.id && currentFolder?.fileName
          ? `extract-pdf/${selectedProjectId}/${currentFolder.id}/${currentFolder.fileName}`
          : null);

      if (storagePath) {
        setDownloadProgress({
          current: 0,
          total: selectedRowIds.length,
          status: 'fetching_pdf',
          message: 'กำลังโหลดไฟล์ PDF ต้นฉบับจาก Storage...'
        });
        try {
          const fileRef = storageRef(storage, storagePath);
          
          // ใช้ Promise.race ร่วมกับ setTimeout เพื่อบังคับให้หยุดรอถ้า Firebase SDK retries นานเกินไป (กรณีติด CORS)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT_CORS')), 10000)
          );
          
          const blob = await Promise.race([
            getBlob(fileRef),
            timeoutPromise
          ]);
          
          pdfFile = new File([blob], currentFolder.fileName || 'document.pdf', { type: 'application/pdf' });
          pdfFileRef.current = pdfFile;
          console.log('✅ PDF downloaded from Firebase Storage via SDK');
        } catch (storageErr) {
          if (storageErr.message === 'TIMEOUT_CORS') {
            console.warn('⚠️ Download timeout: Firebase Storage is blocking the request (CORS issue).');
          } else {
            console.warn('⚠️ Failed to download PDF from Storage:', storageErr);
          }
        }
        setDownloadProgress(null);
      }
    }

    // ถ้ายังไม่มีไฟล์ PDF → แสดง UI ให้ผู้ใช้เลือกไฟล์ในหน้า Modal (เป็น fallback สำรอง)
    if (!pdfFile) {
      setNeedsPdfFile(true);
      return;
    }

    // มีไฟล์ PDF แล้ว → เริ่มดาวน์โหลด
    setNeedsPdfFile(false);
    await executeDownload(pdfFile);
  }

  // ── ฟังก์ชันที่ผู้ใช้เลือกไฟล์ PDF จากปุ่มใน Modal (มี user activation) ────────────────
  function handlePdfFileForDownload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input

    pdfFileRef.current = file;
    setNeedsPdfFile(false);

    // เริ่มดาวน์โหลดอัตโนมัติหลังเลือกไฟล์
    executeDownload(file);
  }

  // ── ฟังก์ชันหลักในการแยกหน้าและดาวน์โหลด ─────────────────────────────────────────
  async function executeDownload(pdfFile) {
    try {
      setDownloadProgress({
        current: 0,
        total: selectedRowIds.length,
        status: 'downloading',
        message: 'กำลังเริ่มต้นดาวน์โหลดไฟล์...'
      });

      const selectedPages = rows.filter(r => selectedRowIds.includes(r.id));

      for (let i = 0; i < selectedPages.length; i++) {
        const row = selectedPages[i];
        
        setDownloadProgress({
          current: i + 1,
          total: selectedPages.length,
          status: 'downloading',
          message: `กำลังดาวน์โหลด: หน้า ${row.page} (${i + 1}/${selectedPages.length})`
        });

        // แยกหน้า PDF เป็น 1 หน้า
        const singlePageBytes = await extractSinglePagePdfFromBlob(pdfFile, row.page);

        // กำหนดชื่อไฟล์ตามโครงสร้างที่เลือก
        const customBaseName = buildFilename(row);
        const finalFilename = sanitizeFilename(customBaseName) + '.pdf';

        // ทริกเกอร์การดาวน์โหลดในบราวเซอร์
        const blob = new Blob([singlePageBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        
        // ล้างความจำ
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        // หยุดพักเล็กน้อย (250ms) เพื่อป้องกันบราวเซอร์บล็อกการโหลดหลายไฟล์พร้อมกัน
        if (i < selectedPages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }

      setDownloadProgress({
        current: selectedPages.length,
        total: selectedPages.length,
        status: 'completed',
        message: 'ดาวน์โหลดไฟล์ทั้งหมดเสร็จสิ้น!'
      });

      setTimeout(() => {
        setShowDownloadModal(false);
        setDownloadProgress(null);
        setSelectedRowIds([]); // รีเซ็ตการเลือก
      }, 1500);

    } catch (err) {
      console.error('Download error:', err);
      setDownloadProgress({
        current: 0,
        total: selectedRowIds.length,
        status: 'error',
        message: `เกิดข้อผิดพลาดในการดาวน์โหลด: ${err.message || 'ไม่ทราบสาเหตุ'}`
      });
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

  // ── คำนวน — ใช้ไฟล์ PDF ในหน่วยความจำ (ถ้ามี) หรือให้เลือกไฟล์ใหม่ ──
  async function calculateAll() {
    if (!N8N_WEBHOOK_URL) {
      alert('กรุณาตั้งค่า VITE_N8N_WEBHOOK_URL ใน .env ก่อน');
      return;
    }

    const waitingRows = rows.filter(r =>
      r.calcStatus === CALC_STATUS.WAITING ||
      r.calcStatus === CALC_STATUS.WAITING_CLOUD ||
      r.calcStatus === CALC_STATUS.CALC_ERROR
    );
    if (!waitingRows.length) {
      alert('ไม่มีรายการที่รอคำนวน');
      return;
    }

    // 1. หาไฟล์ PDF ที่ใช้งาน
    let pdfFile = pdfFileRef.current;

    if (!pdfFile) {
      // ไม่มีไฟล์ในหน่วยความจำ (เช่น เปิดโฟลเดอร์เก่า) → ให้ผู้ใช้เลือกไฟล์ PDF อีกครั้ง
      const confirmed = window.confirm(
        'ไฟล์ PDF ไม่ได้อยู่ในหน่วยความจำ (อาจเป็นเพราะเปิดโฟลเดอร์เก่า)\n\n' +
        'กรุณาเลือกไฟล์ PDF เดิมอีกครั้งเพื่อใช้ในการคำนวน\n\n' +
        `ไฟล์ที่ต้องการ: ${currentFolder?.fileName || 'PDF file'}`
      );
      if (!confirmed) return;

      pdfFile = await new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = (e) => resolve(e.target.files?.[0] || null);
        input.click();
      });

      if (!pdfFile) {
        alert('ไม่ได้เลือกไฟล์ PDF');
        return;
      }

      // เก็บไว้ใช้ครั้งถัดไปโดยไม่ต้องเลือกใหม่
      pdfFileRef.current = pdfFile;
    }

    setIsCalculating(true);
    setCalcProgress({ current: 0, total: waitingRows.length });

    const TIMEOUT_MS = 120_000; // 120 วินาที ต่อรายการ
    let calcSuccessCount = 0;
    let calcErrorCount = 0;

    // 2. วนลูปทีละ 1 รายการ (queue)
    for (let i = 0; i < waitingRows.length; i++) {
      const row = waitingRows[i];

      // อัปเดตสถานะ → กำลังคำนวน
      const statusCalcing = { calcStatus: CALC_STATUS.CALCULATING, updatedAt: new Date().toISOString() };
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...statusCalcing } : r));
      await updateExtractPdf(row.id, statusCalcing).catch(() => {});

      try {
        // A. แยกหน้า PDF เดี่ยวจากไฟล์ในหน่วยความจำ
        const singlePageBytes = await extractSinglePagePdfFromBlob(pdfFile, row.page);
        const singlePageFileName = `${(row.fileName || 'page').replace('.pdf', '')}_page_${row.page}.pdf`;

        // B. เตรียม FormData
        const formData = new FormData();
        formData.append('file', new Blob([singlePageBytes], { type: 'application/pdf' }), singlePageFileName);
        formData.append('fileName', row.fileName || '');
        formData.append('page', String(row.page));
        formData.append('total', String(row.totalPages || 0));
        formData.append('pageNumber', String(row.page));

        // C. ส่งไปยัง n8n พร้อม timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`n8n responded ${res.status}: ${res.statusText}`);

        let responseData = null;
        try { responseData = await res.json(); } catch { /* non-json */ }

        const resp = responseData || {};
        const dwgNo = resp.dwgNo || resp.dwgno || resp.DWG_NO || '';
        const title = resp.title || resp.TITLE || '';
        const rev   = resp.rev   || resp.REV   || '';

        // D. สำเร็จ → อัปเดต local + Firestore
        const ok = {
          calcStatus: CALC_STATUS.CALCULATED,
          dwgNo, title, rev,
          calcResponse: responseData || null,
          updatedAt: new Date().toISOString(),
        };
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...ok } : r));
        await updateExtractPdf(row.id, ok);
        calcSuccessCount++;
        console.log(`✅ Page ${row.page} OK:`, { dwgNo, title, rev });

      } catch (err) {
        // Skip & ไปรายการถัดไป
        const errMsg = err.name === 'AbortError' ? 'Timeout (120s)' : err.message;
        console.warn(`⏭️ Page ${row.page} skipped:`, errMsg);
        const fail = {
          calcStatus: CALC_STATUS.CALC_ERROR,
          calcResponse: errMsg,
          updatedAt: new Date().toISOString(),
        };
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...fail } : r));
        await updateExtractPdf(row.id, fail).catch(() => {});
        calcErrorCount++;
      }

      setCalcProgress({ current: i + 1, total: waitingRows.length });
    }

    setIsCalculating(false);
    alert(`คำนวนเสร็จสิ้น!\nสำเร็จ: ${calcSuccessCount} รายการ\nล้มเหลว/Timeout: ${calcErrorCount} รายการ`);
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                        {folder.pages?.length || folder.totalPages || 0} หน้า
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(folder);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="ลบโฟลเดอร์"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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
                {isCalculating && (
                  <div className="text-xs font-medium text-purple-600">
                    คำนวน: {calcProgress.current} / {calcProgress.total}
                  </div>
                )}
                {/* Summary badges */}
                {!isCalculating && (
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
                  </>
                )}

                <button
                  onClick={() => setShowDownloadModal(true)}
                  disabled={selectedRowIds.length === 0 || isCalculating || isSending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Download size={14} />
                  ดาวน์โหลด ({selectedRowIds.length})
                </button>

                <button
                  onClick={calculateAll}
                  disabled={isCalculating || !N8N_WEBHOOK_URL || waitingCalcCount === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {isCalculating
                    ? <><Loader2 size={14} className="animate-spin" /> กำลังคำนวน…</>
                    : <><AlertCircle size={14} /> คำนวน ({waitingCalcCount})</>
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
              <table className="w-full text-xs" style={{ tableLayout: 'auto' }}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 font-semibold text-center" style={{ width: '36px' }}>
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && selectedRowIds.length === rows.length}
                        ref={el => {
                          if (el) {
                            el.indeterminate = selectedRowIds.length > 0 && selectedRowIds.length < rows.length;
                          }
                        }}
                        onChange={handleToggleAll}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="px-2 py-2 font-semibold text-center whitespace-nowrap">หน้า</th>
                    <th className="px-2 py-2 font-semibold text-center whitespace-nowrap">Thumbnail</th>
                    <th className="px-2 py-2 font-semibold whitespace-nowrap">DWG NO.</th>
                    <th className="px-2 py-2 font-semibold">TITLE</th>
                    <th className="px-2 py-2 font-semibold whitespace-nowrap">REV.</th>
                    <th className="px-2 py-2 font-semibold text-center whitespace-nowrap">สถานะการคำนวน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      onClick={(e) => {
                        // ไม่เปิด Modal ถ้ากด checkbox หรือปุ่มอื่นๆ ด้านใน
                        if (!e.target.closest('input') && !e.target.closest('button')) {
                          setReviewRowId(row.id);
                        }
                      }}
                      className={`transition-colors cursor-pointer ${
                        selectedRowIds.includes(row.id) ? 'bg-orange-50/30 hover:bg-orange-50/50 border-l-2 border-orange-500' :
                        row.isApproved ? 'bg-emerald-50 hover:bg-emerald-100 border-l-2 border-emerald-500' :
                        index % 2 === 0 ? 'bg-white hover:bg-orange-50/50' : 'bg-slate-50/60 hover:bg-orange-50/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(row.id)}
                          onChange={() => handleToggleRow(row.id)}
                          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Page number */}
                      <td className="px-2 py-1 text-center text-slate-500 font-mono whitespace-nowrap">
                        {row.page}
                      </td>

                      {/* Thumbnail */}
                      <td className="px-2 py-1">
                        <div className="flex items-center justify-center">
                          {row.thumbnail ? (
                            <div className="relative group">
                              <img
                                src={row.thumbnail}
                                alt={`Page ${row.page}`}
                                className="w-20 h-auto rounded border border-slate-200 shadow-sm transition-all group-hover:border-orange-400 group-hover:shadow-md cursor-pointer"
                                onClick={() => {
                                  const win = window.open();
                                  win.document.write(`<img src="${row.thumbnail}" style="max-width:100%; height:auto;" />`);
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-14 rounded border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                              <Loader2 size={12} className="animate-spin text-slate-400" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* DWG NO. */}
                      <td className="px-2 py-1">
                        <span className={`text-xs ${row.dwgNo ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>
                          {row.dwgNo || '-'}
                        </span>
                      </td>

                      {/* TITLE */}
                      <td className="px-2 py-1">
                        <span className={`text-xs ${row.title ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>
                          {row.title || '-'}
                        </span>
                      </td>

                      {/* REV. */}
                      <td className="px-2 py-1">
                        <span className={`text-xs ${row.rev ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>
                          {row.rev || '-'}
                        </span>
                      </td>

                      {/* Calc Status */}
                      <td className="px-2 py-1 text-center">
                        <CalcStatusBadge calcStatus={row.calcStatus} message={row.calcResponse} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

        {/* ── Confirm Delete Modal ── */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteTarget(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  {isDeleting ? (
                    <Loader2 size={18} className="text-red-600 animate-spin" />
                  ) : (
                    <Trash2 size={18} className="text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-800">ยืนยันการลบโฟลเดอร์งาน?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    การดำเนินการนี้จะลบหน้าทั้งหมดในระบบรวมถึงไฟล์ในคลาวด์และไม่สามารถกู้คืนได้
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <div className="text-xs font-semibold text-slate-700 truncate" title={deleteTarget.name}>
                  ชื่อโฟลเดอร์: {deleteTarget.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  จำนวน: {deleteTarget.pages?.length || deleteTarget.totalPages || 0} หน้า · {deleteTarget.fileName}
                </div>
              </div>

              {isDeleting && (
                <div className="flex items-center gap-2 text-xs font-medium text-red-600 justify-center py-1">
                  <Loader2 size={14} className="animate-spin" />
                  <span>{deleteStatus}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleDeleteFolder(deleteTarget)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? 'กำลังลบ...' : 'ลบโฟลเดอร์'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Download Config Modal ── */}
        {showDownloadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => !downloadProgress && setShowDownloadModal(false)} 
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Download size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">ตั้งค่าและดาวน์โหลด PDF แยกหน้า</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      เลือกรูปแบบและลำดับในการตั้งชื่อไฟล์ PDF ที่จะทำการดาวน์โหลด
                    </p>
                  </div>
                </div>
                {!downloadProgress && (
                  <button 
                    onClick={() => setShowDownloadModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {downloadProgress ? (
                // หน้าจอแสดงความคืบหน้าการดาวน์โหลด
                <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
                  {downloadProgress.status === 'downloading' || downloadProgress.status === 'fetching_pdf' ? (
                    <Loader2 size={36} className="text-blue-500 animate-spin" />
                  ) : downloadProgress.status === 'completed' ? (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
                      <CheckCircle2 size={24} />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                      <AlertCircle size={24} />
                    </div>
                  )}

                  <div className="space-y-1 px-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {downloadProgress.message}
                    </p>
                    {downloadProgress.total > 0 && downloadProgress.status !== 'fetching_pdf' && (
                      <p className="text-xs text-slate-500">
                        {downloadProgress.current} จากทั้งหมด {downloadProgress.total} รายการ
                      </p>
                    )}
                  </div>

                  {downloadProgress.total > 0 && downloadProgress.status !== 'fetching_pdf' && (
                    <div className="w-full max-w-xs bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          downloadProgress.status === 'completed' ? 'bg-emerald-500' :
                          downloadProgress.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                      />
                    </div>
                  )}

                  {downloadProgress.status === 'error' && (
                    <button
                      onClick={() => setDownloadProgress(null)}
                      className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      ลองใหม่
                    </button>
                  )}
                </div>
              ) : (
                // หน้าจอตั้งค่าชื่อไฟล์
                <>
                  <div className="space-y-4">
                    {/* ส่วนเลือกและสลับลำดับคอลัมน์ */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700">เลือกลำดับและการใช้งานคอลัมน์ในการตั้งชื่อไฟล์</label>
                      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 overflow-hidden">
                        {namingFields.map((field, idx) => (
                          <div key={field.id} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                id={`check-${field.id}`}
                                checked={field.enabled}
                                onChange={() => toggleFieldEnabled(idx)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                              />
                              <label htmlFor={`check-${field.id}`} className={`text-xs font-semibold cursor-pointer ${field.enabled ? 'text-slate-800' : 'text-slate-400'}`}>
                                {field.label}
                              </label>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => moveField(idx, -1)}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
                                title="เลื่อนขึ้น"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                onClick={() => moveField(idx, 1)}
                                disabled={idx === namingFields.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
                                title="เลื่อนลง"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* เลือกตัวเชื่อม Separator */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="separator-select" className="text-xs font-semibold text-slate-700">ตัวเชื่อมชื่อไฟล์ (Separator)</label>
                        <select
                          id="separator-select"
                          value={namingSeparator}
                          onChange={(e) => setNamingSeparator(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="_">Under Score ( _ )</option>
                          <option value="-">Dash ( - )</option>
                          <option value=" ">Space (   )</option>
                          <option value="">ไม่มีตัวเชื่อม</option>
                        </select>
                      </div>

                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 flex flex-col justify-center">
                        <span className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">ดาวน์โหลดทั้งหมด</span>
                        <span className="text-sm font-bold text-blue-700 mt-0.5">{selectedRowIds.length} ไฟล์ PDF</span>
                      </div>
                    </div>

                    {/* แสดงตัวอย่างชื่อไฟล์ (Live Preview) */}
                    <div className="bg-slate-900 text-slate-200 rounded-xl px-4 py-3 border border-slate-800 font-mono text-[11px] space-y-1 shadow-inner">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">ตัวอย่างชื่อไฟล์ (Live Preview)</div>
                      <div className="text-emerald-400 font-semibold truncate mt-1">
                        {getPreviewFilename()}
                      </div>
                    </div>
                  </div>

                  {/* แสดง UI เลือกไฟล์ PDF เมื่อจำเป็น */}
                  {needsPdfFile && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-amber-800">ต้องเลือกไฟล์ PDF ต้นฉบับ</p>
                          <p className="text-[11px] text-amber-700">
                            ไม่พบไฟล์ PDF ในหน่วยความจำ กรุณาเลือกไฟล์ PDF เดิมเพื่อแยกหน้าสำหรับดาวน์โหลด
                          </p>
                          <p className="text-[11px] text-amber-600 font-mono">
                            ไฟล์ที่ต้องการ: {currentFolder?.fileName || 'PDF file'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadPdfInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                      >
                        <FileUp size={14} />
                        เลือกไฟล์ PDF ต้นฉบับ
                      </button>
                    </div>
                  )}

                  {/* ปุ่มควบคุม */}
                  <div className="flex gap-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => { setShowDownloadModal(false); setNeedsPdfFile(false); setDownloadProgress(null); }}
                      className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleDownloadSelected}
                      disabled={needsPdfFile}
                      className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      เริ่มดาวน์โหลด
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Hidden file input for download PDF source selection */}
        <input
          ref={downloadPdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handlePdfFileForDownload}
        />
      {/* ── Review Modal ── */}
      {reviewRowId && (
        <ReviewModal
          row={rows.find(r => r.id === reviewRowId)}
          onClose={() => setReviewRowId(null)}
          updateRow={updateRow}
        />
      )}
    </div>
  );
}

// ── Review Modal Component ──────────────────────────────────────────────────────────
function ReviewModal({ row, onClose, updateRow }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Viewer state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [highResImageUrl, setHighResImageUrl] = useState(null);

  // Render PDF page to high-res image
  useEffect(() => {
    let isMounted = true;
    
    const renderPdf = async () => {
      if (!row || !row.pdfUrl) return;
      setIsLoading(true);
      try {
        // Fetch the PDF file
        const response = await fetch(row.pdfUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        // Load the PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(row.page);
        
        // Render at a high scale (e.g., 3x for high resolution)
        const renderScale = 3;
        const viewport = page.getViewport({ scale: renderScale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        if (isMounted) {
          setHighResImageUrl(canvas.toDataURL('image/jpeg', 0.9));
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error rendering high-res PDF page:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    renderPdf();
    
    return () => {
      isMounted = false;
    };
  }, [row]);

  // Handle zoom and fit
  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.1));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  const handleFitWidth = () => {
    if (containerRef.current && canvasRef.current) {
      const containerWidth = containerRef.current.clientWidth - 40; // padding
      const imageWidth = canvasRef.current.naturalWidth;
      const newScale = containerWidth / imageWidth;
      setScale(newScale);
      setPosition({ x: 0, y: 0 });
    }
  };
  const handleFitPage = () => {
    if (containerRef.current && canvasRef.current) {
      const containerHeight = containerRef.current.clientHeight - 40;
      const imageHeight = canvasRef.current.naturalHeight;
      const newScale = containerHeight / imageHeight;
      setScale(newScale);
      setPosition({ x: 0, y: 0 });
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      setScale(s => Math.min(Math.max(s + delta, 0.1), 5));
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  // Drag to pan
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (!row) return null;

  const handleRecalculate = () => {
    updateRow(row.id, 'dwgNo', '');
    updateRow(row.id, 'title', '');
    updateRow(row.id, 'rev', '');
    updateRow(row.id, 'calcStatus', CALC_STATUS.WAITING);
    updateRow(row.id, 'isApproved', false);
    onClose();
  };

  const handleApprove = () => {
    updateRow(row.id, 'isApproved', true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800">ตรวจสอบความถูกต้อง (หน้า {row.page})</h3>
            <p className="text-sm text-slate-500 mt-0.5">คุณสามารถซูมและเลื่อนดูรายละเอียดจากรูปต้นฉบับได้</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - 2 Columns */}
        <div className="flex flex-1 overflow-hidden bg-slate-50">
          
          {/* Left Column (Interactive Image Viewer) - 70% */}
          <div className="w-[70%] border-r border-slate-200 relative bg-slate-100 flex flex-col overflow-hidden">
            
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shadow-sm z-10">
              <div className="flex items-center space-x-1">
                <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Zoom Out"><ZoomOut size={18} /></button>
                <span className="text-xs font-mono w-12 text-center text-slate-600">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Zoom In"><ZoomIn size={18} /></button>
              </div>
              <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
                <button onClick={handleFitWidth} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded" title="Fit Width">
                  <Expand size={14} /> Fit Width
                </button>
                <button onClick={handleFitPage} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded" title="Fit Page">
                  <Maximize size={14} /> Fit Page
                </button>
                <button onClick={handleReset} className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded" title="Reset Zoom & Pan">
                  Reset
                </button>
              </div>
            </div>

            {/* Viewport */}
            <div 
              ref={containerRef}
              className={`flex-1 relative overflow-hidden bg-slate-200/50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100/50">
                  <Loader2 size={32} className="animate-spin mb-3 text-blue-500" />
                  <p className="text-sm font-medium">กำลังโหลดเอกสารความละเอียดสูง...</p>
                </div>
              ) : highResImageUrl ? (
                <div 
                  className="absolute origin-center transition-transform duration-100 ease-out flex items-center justify-center"
                  style={{ 
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    left: '50%',
                    top: '50%',
                    width: '0',
                    height: '0',
                  }}
                >
                  <img 
                    ref={canvasRef}
                    src={highResImageUrl} 
                    alt={`Page ${row.page}`}
                    className="max-w-none shadow-xl border border-slate-200 bg-white pointer-events-none select-none"
                    style={{ 
                      transform: 'translate(-50%, -50%)',
                      width: 'auto',
                      height: 'auto',
                    }}
                    onLoad={handleFitWidth}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400">
                  <AlertCircle size={32} className="mb-2" />
                  <p className="text-sm">ไม่สามารถโหลดเอกสารได้</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Data Fields) - 30% */}
          <div className="w-[30%] bg-white p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              
              {/* Field: DWG NO */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  DWG NO.
                  <Pencil size={12} className="text-slate-300" />
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={row.dwgNo || ''}
                    onChange={e => updateRow(row.id, 'dwgNo', e.target.value)}
                    placeholder="DWG-XXXX"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-medium shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-blue-300"
                  />
                </div>
              </div>

              {/* Field: TITLE */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  TITLE
                  <Pencil size={12} className="text-slate-300" />
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={row.title || ''}
                    onChange={e => updateRow(row.id, 'title', e.target.value)}
                    placeholder="Drawing Title"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-medium shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-blue-300"
                  />
                </div>
              </div>

              {/* Field: REV */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  REV.
                  <Pencil size={12} className="text-slate-300" />
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={row.rev || ''}
                    onChange={e => updateRow(row.id, 'rev', e.target.value)}
                    placeholder="A0"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-medium shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-blue-300"
                  />
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={handleRecalculate}
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl transition-colors border border-amber-200"
              >
                <RefreshCw size={16} />
                คำนวนใหม่
              </button>
              
              <button
                onClick={handleApprove}
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-sm shadow-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/40"
              >
                <Check size={18} />
                ถูกต้อง
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
