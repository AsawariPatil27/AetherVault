from sentence_transformers import SentenceTransformer
import time

# 🔥 Load model
start = time.time()
model = SentenceTransformer("BAAI/bge-base-en")
end = time.time()

print(f"⏱️ Model load time: {round(end - start, 2)} seconds")

# 🧪 Test text
texts = [
    "Hello world",
    "Narendra Modi is the Prime Minister of India",
    "Machine learning is amazing"
]

# 🔥 Generate embeddings
embeddings = model.encode(texts)

# ✅ Output checks
print("\n✅ Number of embeddings:", len(embeddings))
print("✅ Dimension of one embedding:", len(embeddings[0]))

print("\n🔍 Sample embedding (first 5 values):")
print(embeddings[0][:5])