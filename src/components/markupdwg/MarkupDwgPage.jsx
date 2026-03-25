import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Upload, FileText, Edit2, Save, X, Loader2,
  Square, Circle as CircleIcon, Type, Minus,
  Trash2, Undo, Redo, Download, ZoomIn, ZoomOut,
  Move, MousePointer, Palette
} from 'lucide-react';
import { storage } from '../../config/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import { useApp } from '../../context/AppContext';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const TOOLS = {
  SELECT: 'select',
  PAN: 'pan',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TEXT: 'text',
};

const COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', 
  '#00FFFF', '#FFA500', '#800080', '#000000', '#FFFFFF'
];

export default function MarkupDwgPage() {
  const { selectedProject } = useApp();
  const { canAction } = useMenuPermissions();
  const canEdit = canAction('markup-dwg', 'editMarkup');
  const canSave = canAction('markup-dwg', 'saveMarkup');
  
  // File states
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // PDF/Image states
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [documentDimensions, setDocumentDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [isImage, setIsImage] = useState(false);
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState(TOOLS.SELECT);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(2);
  
  // Drawing states (simplified for now)
  const [shapes, setShapes] = useState([]);
  
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // Handle file upload
  async function handleFileUpload(file) {
    if (!file || !selectedProject) return;
    
    // Detect if file is image or PDF
    const fileType = file.type;
    const isImageFile = fileType.startsWith('image/');
    setIsImage(isImageFile);
    
    setUploading(true);
    try {
      const path = `markup-dwg/${selectedProject.id}/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      const task = uploadBytesResumable(ref, file);
      
      task.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error('Upload error:', error);
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setFileUrl(url);
          setFile(file);
          setUploading(false);
          setUploadProgress(0);
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
  }

  // PDF document load success
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  // PDF page load success
  function onPageLoadSuccess(page) {
    const viewport = page.getViewport({ scale: 1 });
    setDocumentDimensions({
      width: viewport.width,
      height: viewport.height
    });
  }

  // Load image and get dimensions
  function handleImageLoad(e) {
    const img = e.target;
    setDocumentDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  }

  // Placeholder functions for drawing tools
  function addShape(type, props = {}) {
    console.log('Adding shape:', type, props);
    // Drawing functionality will be implemented later
  }

  function undo() {
    console.log('Undo action');
  }

  function redo() {
    console.log('Redo action');
  }

  // Placeholder mouse event handlers
  function handleMouseDown(e) {
    console.log('Mouse down - drawing will be implemented later');
  }

  function handleMouseMove(e) {
    console.log('Mouse move');
  }

  function handleMouseUp(e) {
    console.log('Mouse up');
  }

  // Delete selected shape
  function deleteSelectedShape() {
    console.log('Delete shape - will be implemented later');
  }

  // Save markup
  async function saveMarkup() {
    if (!canSave) return;
    
    // Save to Firebase or your backend
    console.log('Saving markup...', { shapes });
    alert('Markup saved successfully!');
  }


  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-800">Markup DWG</h1>
            {file && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText size={16} />
                <span>{file.name}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {!file ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload DWG/PDF
                  </>
                )}
              </button>
            ) : (
              <>
                {!isEditMode && canEdit && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                )}
                {isEditMode && (
                  <>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    {canSave && (
                      <button
                        onClick={saveMarkup}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                      >
                        <Save size={16} />
                        Save
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.dwg"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
        />
      </div>

      {/* Toolbar */}
      {isEditMode && (
        <div className="bg-white border-b border-slate-200 px-5 py-2">
          <div className="flex items-center justify-between">
            {/* Tools */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedTool(TOOLS.SELECT)}
                  className={`p-2 rounded ${selectedTool === TOOLS.SELECT ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                  title="Select"
                >
                  <MousePointer size={16} />
                </button>
                <button
                  onClick={() => setSelectedTool(TOOLS.PAN)}
                  className={`p-2 rounded ${selectedTool === TOOLS.PAN ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                  title="Pan"
                >
                  <Move size={16} />
                </button>
              </div>
              
              <div className="w-px h-6 bg-slate-300" />
              
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedTool(TOOLS.LINE)}
                  className={`p-2 rounded ${selectedTool === TOOLS.LINE ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                  title="Line"
                >
                  <Minus size={16} />
                </button>
                <button
                  onClick={() => setSelectedTool(TOOLS.RECTANGLE)}
                  className={`p-2 rounded ${selectedTool === TOOLS.RECTANGLE ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                  title="Rectangle"
                >
                  <Square size={16} />
                </button>
                <button
                  onClick={() => setSelectedTool(TOOLS.CIRCLE)}
                  className={`p-2 rounded ${selectedTool === TOOLS.CIRCLE ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                  title="Circle"
                >
                  <CircleIcon size={16} />
                </button>
                <button
                  onClick={() => setSelectedTool(TOOLS.TEXT)}
                  className={`p-2 rounded ${selectedTool === TOOLS.TEXT ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                  title="Text"
                >
                  <Type size={16} />
                </button>
              </div>
              
              <div className="w-px h-6 bg-slate-300" />
              
              {/* Color Picker */}
              <div className="flex items-center gap-2">
                <Palette size={16} className="text-slate-600" />
                <div className="flex gap-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-6 h-6 rounded border-2 ${selectedColor === color ? 'border-slate-800' : 'border-slate-300'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="w-px h-6 bg-slate-300" />
              
              {/* Line Width */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Width:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-slate-600 w-4">{lineWidth}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={undo}
                className="p-2 rounded hover:bg-slate-100"
                title="Undo"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={redo}
                className="p-2 rounded hover:bg-slate-100"
                title="Redo"
              >
                <Redo size={16} />
              </button>
              <button
                onClick={deleteSelectedShape}
                className="p-2 rounded hover:bg-slate-100"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-5" ref={containerRef}>
        {!file ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Upload size={48} className="mx-auto text-slate-400 mb-4" />
              <h2 className="text-lg font-semibold text-slate-700 mb-2">No file uploaded</h2>
              <p className="text-sm text-slate-500 mb-4">Upload a DWG, PDF, or image file to start marking up</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                Choose File
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
            {/* Document Viewer */}
            <div className="absolute inset-0 overflow-auto flex items-center justify-center bg-slate-100">
              <div className="relative">
                {isImage ? (
                  <img
                    src={fileUrl}
                    alt="Markup document"
                    onLoad={handleImageLoad}
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: 'center'
                    }}
                    className="max-w-none"
                  />
                ) : (
                  <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex items-center justify-center"
                  >
                    <Page 
                      pageNumber={pageNumber} 
                      scale={scale}
                      onLoadSuccess={onPageLoadSuccess}
                    />
                  </Document>
                )}
                
                {/* Drawing Overlay Placeholder */}
                {isEditMode && documentDimensions.width > 0 && (
                  <div 
                    className="absolute top-0 left-0 pointer-events-auto"
                    style={{
                      width: documentDimensions.width * scale,
                      height: documentDimensions.height * scale,
                      cursor: selectedTool === TOOLS.PAN ? 'move' : 'crosshair'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    {/* Drawing canvas will be implemented here */}
                    <div className="w-full h-full border-2 border-dashed border-blue-400 bg-blue-50/10 flex items-center justify-center">
                      <div className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">
                        Drawing tools ready - Click to draw
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Page Navigation for PDF */}
            {!isImage && numPages > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-3">
                <button
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                  disabled={pageNumber >= numPages}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
              <button
                onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                className="p-1 rounded hover:bg-slate-100"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-sm font-medium px-2">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(Math.min(2, scale + 0.1))}
                className="p-1 rounded hover:bg-slate-100"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
