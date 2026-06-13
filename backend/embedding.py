"""
Reads a JSON array of chunk strings from stdin, outputs a JSON array of embedding vectors (lists of floats).
Logs go to stderr only so stdout stays valid JSON for the Node caller.
"""
import json
import sys

from sentence_transformers import SentenceTransformer

_model = None
_BATCH_SIZE = 32


def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("BAAI/bge-base-en")
    return _model


def sanitize_text(value) -> str:
    """Remove lone UTF-16 surrogates (invalid for HuggingFace tokenizers)."""
    if not isinstance(value, str):
        if value is None:
            return ""
        value = str(value)
    return value.encode("utf-8", "surrogatepass").decode("utf-8", "replace")


def main():
    raw = sys.stdin.read()
    if not raw or not raw.strip():
        print(json.dumps([]))
        return

    texts = json.loads(raw)
    if not isinstance(texts, list):
        print("expected JSON array on stdin", file=sys.stderr)
        sys.exit(1)

    texts = [sanitize_text(t) for t in texts]

    model = get_model()
    all_vectors = []
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i : i + _BATCH_SIZE]
        vectors = model.encode(batch, show_progress_bar=False)
        all_vectors.extend(vectors.tolist())

    print(json.dumps(all_vectors))


if __name__ == "__main__":
    main()
