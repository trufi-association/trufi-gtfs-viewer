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

  return (
    <div className="p-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isDragReject ? 'border-red-500 bg-red-50' : ''}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-gray-50'}
        `}
      >
        <input {...getInputProps()} />

        {isLoading ? (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-gray-600 text-sm">{loadingMessage}</p>
            <p className="text-gray-400 text-xs mt-1">{loadingProgress}%</p>
          </div>
        ) : isDragActive ? (
          <div>
            <svg
              className="w-10 h-10 mx-auto mb-2 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-blue-600 font-medium">Drop the GTFS file here...</p>
          </div>
        ) : (
          <div>
            <svg
              className="w-10 h-10 mx-auto mb-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-gray-600 mb-1">
              Drag & drop a GTFS ZIP file here
            </p>
            <p className="text-gray-400 text-sm">or click to select a ZIP</p>
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
        className="hidden"
        disabled={isLoading}
      />

      <button
        type="button"
        onClick={() => folderInputRef.current?.click()}
        disabled={isLoading}
        className={`
          mt-3 w-full py-2 px-4 border border-gray-300 rounded-lg
          text-gray-600 text-sm font-medium
          transition-colors duration-200
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:border-gray-400'}
        `}
      >
        <div className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          Select GTFS Folder
        </div>
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

export default DropZone
