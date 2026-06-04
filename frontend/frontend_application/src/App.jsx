import { useEffect, useState } from "react"

function App() {

  const [videos, setVideos] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // ============================================
  // FETCH VIDEOS
  // ============================================
  const fetchVideos = async () => {

    try {

      const response = await fetch(
        "https://l6ifipbuo8.execute-api.ap-south-1.amazonaws.com/dev/videos"
      )

      const data = await response.json()

      console.log("VIDEOS API:", data)

      if (Array.isArray(data)) {

        setVideos(data)

      } else if (data && data.videos) {

        setVideos(data.videos)

      } else {

        setVideos([])
      }

    } catch (error) {

      console.log("FETCH ERROR:", error)
    }
  }

  // ============================================
  // LOAD VIDEOS ON START
  // ============================================
  useEffect(() => {

    fetchVideos()

  }, [])

  // ============================================
  // HANDLE VIDEO UPLOAD
  // ============================================
  const handleUpload = async (event) => {

    const file = event.target.files[0]

    if (!file) return

    try {

      setUploading(true)
      setUploadProgress(0)

      // ============================================
      // STEP 1 — GET PRESIGNED URL
      // ============================================
      const presignedResponse = await fetch(

        `http://localhost:5000/api/generate-upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`

      )

      if (!presignedResponse.ok) {

        throw new Error("Failed to generate upload URL")
      }

      const presignedData = await presignedResponse.json()

      console.log("PRESIGNED URL RESPONSE:", presignedData)

      const { uploadUrl, key } = presignedData

      // ============================================
      // STEP 2 — UPLOAD VIDEO DIRECTLY TO S3
      // ============================================
      await new Promise((resolve, reject) => {

        const xhr = new XMLHttpRequest()

        xhr.open("PUT", uploadUrl)

        xhr.setRequestHeader(
          "Content-Type",
          file.type
        )

        xhr.upload.onprogress = (event) => {

          if (event.lengthComputable) {

            const percent = Math.round(
              (event.loaded / event.total) * 100
            )

            setUploadProgress(percent)
          }
        }

        xhr.onload = () => {

          if (xhr.status === 200) {

            resolve()

          } else {

            reject(new Error("S3 upload failed"))
          }
        }

        xhr.onerror = () => {

          reject(new Error("S3 upload failed"))
        }

        xhr.send(file)
      })

      console.log("VIDEO UPLOADED TO S3 SUCCESSFULLY")

      // ============================================
      // STEP 3 — SAVE METADATA
      // ============================================
      const metadataResponse = await fetch(

        "http://localhost:5000/api/save-video",

        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({

            video_name: file.name,

            video_key: key,

            video_size: file.size,

            status: "UPLOADED",

            uploaded_at: new Date().toISOString(),
          }),
        }
      )

      if (!metadataResponse.ok) {

        throw new Error("Failed to save metadata")
      }

      const metadataData = await metadataResponse.json()

      console.log("METADATA SAVED:", metadataData)

      alert("Video uploaded successfully!")

      // ============================================
      // REFRESH VIDEOS
      // ============================================
      fetchVideos()

    } catch (error) {

      console.log("UPLOAD ERROR:", error)

      alert("Upload failed")

    } finally {

      setUploading(false)
    }
  }

  return (

    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "white",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >

        {/* ========================================= */}
        {/* HEADER */}
        {/* ========================================= */}
        <h1
          style={{
            fontSize: "42px",
            marginBottom: "10px",
          }}
        >
          Mini Video Processing App
        </h1>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: "40px",
          }}
        >
          Upload, process, and stream videos with secure cloud-native architecture.
        </p>

        {/* ========================================= */}
        {/* UPLOAD SECTION */}
        {/* ========================================= */}
        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "30px",
            borderRadius: "16px",
            marginBottom: "30px",
          }}
        >

          <h2>Upload Video</h2>

          <label
            style={{
              display: "inline-block",
              backgroundColor: "#38bdf8",
              color: "#0f172a",
              padding: "12px 24px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              marginTop: "20px",
            }}
          >
            📹 Select Video

            <input
              type="file"
              accept="video/*"
              onChange={handleUpload}
              style={{
                display: "none",
              }}
            />
          </label>

          {uploading && (

            <div
              style={{
                marginTop: "20px",
              }}
            >

              <p
                style={{
                  color: "#38bdf8",
                  marginBottom: "10px",
                }}
              >
                Uploading... {uploadProgress}%
              </p>

              <div
                style={{
                  width: "100%",
                  height: "12px",
                  backgroundColor: "#334155",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >

                <div
                  style={{
                    width: `${uploadProgress}%`,
                    height: "100%",
                    backgroundColor: "#38bdf8",
                    transition: "width 0.2s ease",
                  }}
                />

              </div>

            </div>

          )}

        </div>

        {/* ========================================= */}
        {/* VIDEO LIST */}
        {/* ========================================= */}
        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "30px",
            borderRadius: "16px",
          }}
        >

          <h2>Uploaded Videos</h2>

          {videos.length === 0 ? (

            <p
              style={{
                color: "#94a3b8",
                marginTop: "20px",
              }}
            >
              No videos found
            </p>

          ) : (

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "20px",
                marginTop: "20px",
              }}
            >

              {videos.map((video, index) => {

                console.log("VIDEO OBJECT:", video)

                // ============================================
                // VIDEO DATA
                // ============================================
                const videoName =
                  typeof video === "object"
                    ? (video.video_name || "Unnamed Video")
                    : video

                const videoStatus =
                  typeof video === "object"
                    ? (video.status || "PENDING")
                    : "UNKNOWN"

                // ============================================
                // VIDEO URL
                // TEMPORARY PUBLIC URL
                // LATER WE WILL USE PRESIGNED GET URLS
                // ============================================
                const videoUrl =
                  `https://akshay-video-upload-bucket-2026.s3.ap-south-1.amazonaws.com/${video.video_key || video.video_name}`

                return (

                  <div
                    key={index}
                    style={{
                      backgroundColor: "#334155",
                      borderRadius: "12px",
                      padding: "14px",
                    }}
                  >

                    {/* ========================================= */}
                    {/* THUMBNAIL PREVIEW */}
                    {/* ========================================= */}

                    <img
                      src={video.thumbnail_url}
                      alt="thumbnail"
                      width="100%"
                      height="180"
                      style={{
                        borderRadius: "10px",
                        marginBottom: "12px",
                        objectFit: "cover",
                        cursor: "pointer",
                        backgroundColor: "black",
                      }}
                      onClick={() => setSelectedVideo(videoUrl)}
                    />

                    {/* ========================================= */}
                    {/* VIDEO NAME */}
                    {/* ========================================= */}
                    <h3
                      style={{
                        fontSize: "16px",
                        marginBottom: "8px",
                        wordBreak: "break-word",
                      }}
                    >
                      {videoName}
                    </h3>

                    {/* ========================================= */}
                    {/* STATUS */}
                    {/* ========================================= */}
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "14px",
                      }}
                    >
                      Status:{" "}

                      <span
                        style={{
                          fontWeight: "bold",

                          color:
                            videoStatus === "PROCESSED"
                              ? "#10b981"
                              : "#f59e0b",
                        }}
                      >
                        {videoStatus}
                      </span>

                    </p>

                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "13px",
                        marginTop: "6px",
                      }}
                    >
                      Uploaded:
                      {" "}
                      {video.uploaded_at
                        ? new Date(video.uploaded_at).toLocaleString()
                        : "Unknown"}
                    </p>
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "13px",
                        marginTop: "4px",
                      }}
                    >
                      Size:
                      {" "}
                      {video.video_size
                        ? `${(video.video_size / (1024 * 1024)).toFixed(2)} MB`
                        : "Unknown"}
                    </p>

                    <button
                      style={{
                        marginTop: "12px",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                      onClick={async () => {

                        try {

                          const response = await fetch(

                            "http://localhost:5000/api/delete-video",

                            {
                              method: "DELETE",

                              headers: {
                                "Content-Type": "application/json",
                              },

                              body: JSON.stringify({

                                video_key: video.video_key,

                                thumbnail_url: video.thumbnail_url,
                              }),
                            }
                          )

                          const data = await response.json()

                          console.log(data)

                          fetchVideos()

                        } catch (error) {

                          console.log("DELETE ERROR:", error)
                        }
                      }}
                    >
                      🗑 Delete
                    </button>

                  </div>

                )

              })}

            </div>

          )}

        </div>

      </div>

      {/* ========================================= */}
      {/* FULLSCREEN VIDEO PLAYER */}
      {/* ========================================= */}
      {selectedVideo && (

        <div
          onClick={() => setSelectedVideo(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.92)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >

          <div
            style={{
              width: "90%",
              maxWidth: "1200px",
            }}
          >

            <video
              width="100%"
              controls
              autoPlay
              style={{
                borderRadius: "14px",
                backgroundColor: "black",
              }}
            >

              <source
                src={selectedVideo}
                type="video/mp4"
              />

            </video>

          </div>

        </div>

      )}

    </div>
  )
}

export default App