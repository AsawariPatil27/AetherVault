"""
Persistent server for embeddings (BAAI/bge-base-en) and PDF parsing (Docling).
Start: python embedding_server.py
Requires: pip install flask sentence-transformers docling
Port is controlled by EMBEDDING_PORT env var (default 5002).
"""
import os
import sys
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
_model = None
_BATCH_SIZE = 32


def get_model():
    global _model
    if _model is None:
        print("Loading BAAI/bge-base-en...", file=sys.stderr, flush=True)
        _model = SentenceTransformer("BAAI/bge-base-en")
        print("Model ready.", file=sys.stderr, flush=True)
    return _model


def sanitize(value) -> str:
    if not isinstance(value, str):
        value = "" if value is None else str(value)
    return value.encode("utf-8", "surrogatepass").decode("utf-8", "replace")


_docling_converter = None


def get_docling_converter():
    global _docling_converter
    if _docling_converter is None:
        print("Loading Docling converter...", file=sys.stderr, flush=True)
        from docling.document_converter import DocumentConverter
        _docling_converter = DocumentConverter()
        print("Docling ready.", file=sys.stderr, flush=True)
    return _docling_converter


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/embed", methods=["POST"])
def embed():
    texts = request.get_json(force=True).get("texts", [])
    if not isinstance(texts, list):
        return jsonify({"error": "texts must be a list"}), 400

    texts = [sanitize(t) for t in texts]
    model = get_model()

    embeddings = []
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i : i + _BATCH_SIZE]
        embeddings.extend(model.encode(batch, show_progress_bar=False).tolist())

    return jsonify({"embeddings": embeddings})


@app.route("/parse-pdf", methods=["POST"])
def parse_pdf():
    url = request.get_json(force=True).get("url", "")
    if not url:
        return jsonify({"error": "url is required"}), 400
    try:
        converter = get_docling_converter()
        result = converter.convert(url)
        text = result.document.export_to_markdown()
        return jsonify({"text": text})
    except Exception as e:
        print(f"Docling error: {e}", file=sys.stderr, flush=True)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("EMBEDDING_PORT", 5002))
    get_model()
    app.run(host="0.0.0.0", port=port)
