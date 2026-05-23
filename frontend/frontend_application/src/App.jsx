import { useEffect, useState } from "react"

function App() {

  const [videos, setVideos] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)

  // FETCH VIDEOS
  const fetchVideos = async () => {

    try {

      const response = await fetch(
        "https://l6ifipbuo8.execute-api.ap-south-1.amazonaws.com/dev/videos"
      )

      const data = await response.json()

      console.log("VIDEOS API:", data)

      // HANDLE DIFFERENT API STRUCTURES
      if (Array.isArray(data)) {

        setVideos(data)

      } else if (data && data.videos) {

        setVideos(data.videos)

      } else {

        setVideos([])
      }

    } catch (err) {

      console.error("FETCH ERROR:", err)
    }
  }

  // LOAD VIDEOS ON PAGE START
  useEffect(() => {

    fetchVideos()

  }, [])

  // HANDLE VIDEO UPLOAD
  const handleUpload = async (event) => {

    const file = event.target.files[0]

    if (!file) return

    try {

      // STEP 1 — GET PRESIGNED URL
      const response = await fetch(
        "https://l6ifipbuo8.execute-api.ap-south-1.amazonaws.com/dev/upload",
        {
          method: "POST"
        }
      )

      const data = await response.json()

      console.log("UPLOAD RESPONSE:", data)

      const uploadUrl = data.upload_url

      if (!uploadUrl) {

        throw new Error("upload_url missing from API response")
      }

      console.log("UPLOAD URL:", uploadUrl)

      // STEP 2 — UPLOAD VIDEO TO S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": "video/mp4"
        }
      })

      console.log("S3 RESPONSE:", uploadResponse)

      // STEP 3 — VERIFY SUCCESS
      if (!uploadResponse.ok) {

        throw new Error("S3 Upload Failed")
      }

      alert("Video uploaded successfully!")

      // STEP 4 — REFRESH VIDEO LIST
      fetchVideos()

    } catch (err) {

      console.error("FULL UPLOAD ERROR:", err)

      alert(err.message)
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

        {/* HEADER */}
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
          Upload, manage, and stream videos using AWS serverless architecture.
        </p>

        {/* UPLOAD SECTION */}
        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "30px",
            borderRadius: "16px",
            marginBottom: "30px",
          }}
        >

          <h2>Upload Video</h2>

          <input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            style={{
              marginTop: "20px",
              color: "white",
            }}
          />

        </div>

        {/* VIDEO LIST SECTION */}
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

                // EXTRACT VIDEO DATA
                const videoName =
                  typeof video === "object"
                    ? (video.video_name || "Unnamed Video")
                    : video

                const videoStatus =
                  typeof video === "object"
                    ? (video.status || "PENDING")
                    : "UNKNOWN"

                // DIRECT VIDEO URL
                const videoUrl =
                  `https://akshay-video-upload-bucket-2026.s3.ap-south-1.amazonaws.com/${videoName}`

                return (

                  <div
                    key={index}
                    style={{
                      padding: "14px",
                      backgroundColor: "#334155",
                      borderRadius: "12px",
                    }}
                  >

                    <video
                    width="100%"
                    height="180"
                    style={{
                      borderRadius: "10px",
                      marginBottom: "12px",
                      backgroundColor: "black",
                      objectFit: "cover",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedVideo(videoUrl)}
                  >

                    <source
                      src={videoUrl}
                      type="video/mp4"
                    />

                  </video>

                    {/* VIDEO NAME */}
                    <h3
                      style={{
                        marginBottom: "8px",
                        wordBreak: "break-word",
                        fontSize: "16px",
                      }}
                    >
                      {videoName}
                    </h3>

                    {/* VIDEO STATUS */}
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

                  </div>

                )

              })}

            </div>

          )}

          {/* FULLSCREEN VIDEO MODAL */}
{selectedVideo && (

  <div
    onClick={() => setSelectedVideo(null)}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.9)",
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
          borderRadius: "12px",
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

      </div>

    </div>
  )
}

export default App