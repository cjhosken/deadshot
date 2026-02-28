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
ax1.set_ylabel("Translation Z (m)")
ax1.set_title("Adaptive Velocity-Confidence Smoothing (Z Axis)")
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

import numpy as np

# Convert to numpy arrays
raw_z = np.array(raw_z)
smooth_z = np.array(smooth_z)

# ---- Standard Deviation ----
sigma_raw = np.std(raw_z)
sigma_smoothed = np.std(smooth_z)

# ---- Maximum Absolute Consecutive Change ----
delta_raw = np.max(np.abs(np.diff(raw_z)))
delta_smoothed = np.max(np.abs(np.diff(smooth_z)))

print(f"σ_raw = {sigma_raw:.6f}")
print(f"σ_smoothed = {sigma_smoothed:.6f}")
print(f"Δ_max, raw = {delta_raw:.6f}")
print(f"Δ_max, smoothed = {delta_smoothed:.6f}")

std_reduction = (1 - sigma_smoothed / sigma_raw) * 100
delta_reduction = (1 - delta_smoothed / delta_raw) * 100

print(f"Std reduction: {std_reduction:.2f}%")
print(f"Max step reduction: {delta_reduction:.2f}%")