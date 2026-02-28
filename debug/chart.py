import json
import matplotlib.pyplot as plt

# Load file
with open("test.json", "r") as f:
    data = json.load(f)

# Extract Z + confidence
raw_z = [d["raw"]["z"] for d in data]
smooth_z = [d["smooth"]["z"] for d in data]
confidence = [d["raw"]["c"] for d in data]

frames = range(len(data))

# Create figure
fig, ax1 = plt.subplots(figsize=(10, 4))

# ---- Rotation (primary axis) ----
ax1.plot(frames, raw_z, linestyle='--', label="Raw Z")
ax1.plot(frames, smooth_z, label="Smoothed Z")
ax1.set_xlabel("Frame")
ax1.set_ylabel("Rotation Z (rad)")
ax1.set_title("Adaptive Confidence Smoothing (Z Axis)")
ax1.legend(loc="upper left")

# ---- Confidence (secondary axis) ----
ax2 = ax1.twinx()
ax2.plot(frames, confidence, linestyle=':', label="Confidence")
ax2.set_ylabel("Confidence")
ax2.set_ylim(0, 1)

# Combine legends
lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper right")

plt.tight_layout()
plt.show()