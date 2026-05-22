import { useEffect, useState } from "react"

function App() {

  const [videos, setVideos] = useState([])

  // FETCH VIDEOS
  const fetchVideos = async () => {

    try {

      const response = await fetch(
        "https://l6ifipbuo8.execute-api.ap-south-1.amazonaws.com/dev/videos"
      )

      const data = await response.json()

      console.log("VIDEOS API:", data)

      setVideos(data.videos || [])

    } catch (err) {

      console.error("FETCH ERROR:", err)
    }
  }

  useEffect(() => {

    fetchVideos()

  }, [])

  // HANDLE VIDEO UPLOAD
  const handleUpload = async (event) => {

    const file = event.target.files[0]

    if (!file) return

    try {

      // STEP 1 — CALL UPLOAD API
      const response = await fetch(
        "https://l6ifipbuo8.execute-api.ap-south-1.amazonaws.com/dev/upload",
        {
          method: "POST"
        }
      )

      // STEP 2 — PARSE RESPONSE DIRECTLY
      const data = await response.json()

      console.log("UPLOAD RESPONSE:", data)

      // STEP 3 — GET PRESIGNED URL
      const uploadUrl = data.upload_url

      if (!uploadUrl) {
        throw new Error("upload_url missing from API response")
      }

      console.log("UPLOAD URL:", uploadUrl)

      // STEP 4 — UPLOAD VIDEO TO S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file
      })

      console.log("S3 RESPONSE:", uploadResponse)

      // STEP 5 — CHECK SUCCESS
      if (!uploadResponse.ok) {
        throw new Error("S3 Upload Failed")
      }

      alert("Video uploaded successfully!")

      // STEP 6 — REFRESH VIDEO LIST
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
        fontFamily: "Arial",
      }}
    >

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >

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

        {/* VIDEO LIST */}
        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "30px",
            borderRadius: "16px",
          }}
        >

          <h2>Uploaded Videos</h2>

          {videos.length === 0 ? (

            <p style={{ color: "#94a3b8" }}>
              No videos found
            </p>

          ) : (

            videos.map((video, index) => (

              <div
                key={index}
                style={{
                  padding: "16px",
                  backgroundColor: "#334155",
                  borderRadius: "10px",
                  marginTop: "12px",
                }}
              >
                {typeof video === "string"
                  ? video
                  : video.video_name}
              </div>

            ))

          )}

        </div>

      </div>

    </div>
  )
}

export default App