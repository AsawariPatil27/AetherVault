"""
Reads a JSON array of chunk strings from stdin, outputs a JSON array of embedding vectors (lists of floats).
Logs go to stderr only so stdout stays valid JSON for the Node caller.
"""
import json
import sys

from sentence_transformers import SentenceTransformer

_model = None


def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("BAAI/bge-base-en")
    return _model


def main():
    raw = sys.stdin.read()
    if not raw or not raw.strip():
        print(json.dumps([]))
        return

    texts = json.loads(raw)
    if not isinstance(texts, list):
        print("expected JSON array on stdin", file=sys.stderr)
        sys.exit(1)

    model = get_model()
    vectors = model.encode(texts, show_progress_bar=False)
    out = vectors.tolist()
    print(json.dumps(out))


if __name__ == "__main__":
    main()
