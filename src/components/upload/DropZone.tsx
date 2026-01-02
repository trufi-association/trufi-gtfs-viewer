import { useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useGtfsStore } from '../../store/gtfsStore'
import { isGtfsFolder } from '../../services/gtfs/folderHandler'

export function DropZone() {
  const { loadGtfsFile, isLoading, loadingProgress, loadingMessage, error } =
    useGtfsStore()
  const folderInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        // Check if it's a folder (multiple .txt files) or a ZIP
        if (acceptedFiles.length > 1 && isGtfsFolder(acceptedFiles)) {
          loadGtfsFile(acceptedFiles)
        } else {
          loadGtfsFile(acceptedFiles[0])
        }
      }
    },
    [loadGtfsFile]
  )

  const handleFolderSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        const fileArray = Array.from(files)
        if (isGtfsFolder(fileArray)) {
          loadGtfsFile(fileArray)
        }
      }
    },
    [loadGtfsFile]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'text/plain': ['.txt'],
    },
    disabled: isLoading,
  })

  const dropzoneClass = [
    'dropzone',
    isDragActive ? 'active' : '',
    isDragReject ? 'reject' : '',
    isLoading ? 'disabled' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="dropzone-container">
      <div {...getRootProps()} className={dropzoneClass}>
        <input {...getInputProps()} />

        {isLoading ? (
          <div className="loading-indicator">
            {/* Circular progress */}
            <div className="progress-ring">
              <svg width="100%" height="100%" viewBox="0 0 36 36">
                <defs>
                  <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <path
                  className="progress-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="progress-bar"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  strokeDasharray={`${loadingProgress}, 100`}
                />
              </svg>
              <span className="progress-text">{loadingProgress}%</span>
            </div>
            <p className="loading-message">{loadingMessage}</p>
          </div>
        ) : isDragActive ? (
          <div className="dropzone-content">
            <div className="dropzone-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="dropzone-title">Drop file here...</p>
          </div>
        ) : (
          <div className="dropzone-content">
            <div className="dropzone-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="dropzone-title">Drop a GTFS ZIP file</p>
            <p className="dropzone-subtitle">or click to select</p>
          </div>
        )}
      </div>

      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is not in types
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="visually-hidden"
        disabled={isLoading}
      />

      <button
        type="button"
        onClick={() => folderInputRef.current?.click()}
        disabled={isLoading}
        className="folder-button"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Select GTFS folder
      </button>

      {error && (
        <div className="error-message animate-slide-up">
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

export default DropZone
