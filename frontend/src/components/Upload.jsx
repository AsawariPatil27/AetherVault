import { useState } from "react";
import axios from "axios";
import { supabase } from "../services/supabase";

function Upload() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!files.length) {
      setMessage("Please select files");
      return;
    }

    try {
      setLoading(true);
      setMessage("Uploading...");

      // 🔐 Get session (NOT just user)
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        setMessage("User not authenticated");
        return;
      }

      const formData = new FormData();

      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await axios.post(
        "http://localhost:5000/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`, // 🔥 IMPORTANT
            "Content-Type": "multipart/form-data"
          }
        }
      );

      console.log(res.data);

      setMessage("Upload successful ✅");
      setFiles([]);

    } catch (error) {
      console.error(error);
      setMessage("Upload failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Upload Files</h2>

      <input
        type="file"
        multiple
        accept=".pdf,image/*,audio/*,video/*"
        onChange={handleFileChange}
      />

      <br /><br />

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>

      <p>{message}</p>
    </div>
  );
}

export default Upload;