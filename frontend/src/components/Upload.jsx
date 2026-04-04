import { useState } from "react";
import axios from "axios";
import { supabase } from "../services/supabase";

const API_BASE = "http://localhost:5000";

function Upload() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [chatId, setChatId] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) {
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  };

  const handleCreateChat = async () => {
    try {
      setCreatingChat(true);
      setMessage("Creating chat...");

      const headers = await getAuthHeaders();
      if (!headers) {
        setMessage("User not authenticated");
        return;
      }

      const res = await axios.post(`${API_BASE}/chat`, {}, { headers });
      setChatId(res.data.chatId);
      setMessage(`Chat ready. ID: ${res.data.chatId}`);
    } catch (error) {
      console.error(error);
      setMessage("Failed to create chat ❌");
    } finally {
      setCreatingChat(false);
    }
  };

  const handleUpload = async () => {
    if (!chatId) {
      setMessage("Create a chat first, then upload files");
      return;
    }

    if (!files.length) {
      setMessage("Please select files");
      return;
    }

    try {
      setLoading(true);
      setMessage("Uploading...");

      const headers = await getAuthHeaders();
      if (!headers) {
        setMessage("User not authenticated");
        return;
      }

      const formData = new FormData();
      formData.append("chatId", chatId);

      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          ...headers
        }
      });

      console.log(res.data);

      setMessage("Upload successful ✅");
      setFiles([]);
    } catch (error) {
      console.error(error);
      const apiMsg =
        error.response?.data?.error ||
        error.message ||
        "Upload failed ❌";
      setMessage(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Upload Files</h2>

      <p>
        <strong>Chat:</strong>{" "}
        {chatId || "None — create a chat before uploading"}
      </p>

      <button
        type="button"
        onClick={handleCreateChat}
        disabled={creatingChat}
        style={{ marginBottom: "12px" }}
      >
        {creatingChat ? "Creating..." : "Create new chat"}
      </button>

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