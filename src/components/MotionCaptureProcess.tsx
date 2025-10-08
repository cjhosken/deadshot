import { useState, useRef } from "react";
import "./MotionCapture.css";
import Viewport from "./Viewport";

interface ProcessingFile {
  id: string;
  name: string;
  progress: number;
  status: 'queued' | 'processing' | 'completed' | 'error';
  size: string;
  duration: string;
  previewUrl: string;
}

export default function MotionCaptureProcess({ onGoHome }: { onGoHome: () => void }) {
  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showViewport, setShowViewport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    const newFiles: ProcessingFile[] = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
      const duration = `${Math.floor(Math.random() * 50) + 10}s`;
      const previewUrl = URL.createObjectURL(file);

      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        progress: 0,
        status: 'queued',
        size: `${sizeInMB} MB`,
        duration: duration,
        previewUrl: previewUrl
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = ""; // reset input
  };

  const removeFile = (id: string) => {
    const fileToRemove = files.find(file => file.id === id);
    if (fileToRemove && fileToRemove.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleProcessClips = () => {
    setProcessing(true);
    // Simulate a 2-second processing delay
    setTimeout(() => {
      setProcessing(false);
      setShowViewport(true);
    }, 2000);
  };

  return (
    <div id="mocap-container">
      <div className="header">
        <button onClick={onGoHome} id="home-button">Exit</button>
      </div>

      {!showViewport && (
        <div className="upload-section">
          <div 
            className="upload-area"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-placeholder">
              <h3>Click to upload clips</h3>
              <p>Supported formats: MP4, MOV, AVI</p>

              {files.length > 0 && (
                <div className="uploaded-files">
                  <div className="video-grid">
                    {files.map(file => (
                      <div key={file.id} className="video-preview">
                        <button
                          className="remove-btn"
                          onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                        >×</button>
                        <div className="video-thumbnail">
                          <video>
                            <source src={file.previewUrl} type="video/mp4" />
                          </video>
                        </div>
                        <div className="video-info">
                          <span className="video-name">{file.name}</span>
                          <span className="video-details">{file.size} • {file.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="video/mp4,video/x-m4v,video/*"
              style={{ display: 'none' }}
            />
          </div>

          {files.length > 0 && (
            <button className="process-btn" onClick={handleProcessClips}>
              Process Clips
            </button>
          )}
        </div>
      )}

      {/* Fullscreen loader overlay */}
      {processing && (
        <div className="fullscreen-overlay">
          <span className="loader"></span>
        </div>
      )}

      {/* Show viewport after processing */}
      {showViewport && (
        <div className="viewport-container">
          <Viewport showTimeline={true} />
        </div>
      )}
    </div>
  );
}
