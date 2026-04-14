import json
import matplotlib.pyplot as plt

# Load file
with open("test.json", "r") as f:
    data = json.load(f)

# Extract base data
raw_z = [d["raw"]["z"] for d in data]
smooth_z = [d["smooth"]["z"] for d in data]
confidence = [d["raw"]["c"] for d in data]

frames = list(range(len(data)))

import math

class OneEuroFilter:
    def __init__(self, min_cutoff=0.1, beta=0.02, d_cutoff=1.0):
        """
        min_cutoff: base smoothing (lower = smoother)
        beta: speed coefficient (higher = reacts faster to motion)
        d_cutoff: cutoff for derivative (velocity smoothing)
        """
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff

        self.prev_x = None
        self.prev_dx = 0.0

    def alpha(self, cutoff):
        """Compute smoothing factor alpha"""
        # Assuming dt = 1 (frame-based)
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + tau)

    def filter(self, x):
        """Filter a single value"""
        if self.prev_x is None:
            self.prev_x = x
            return x

        # ---- Estimate velocity (derivative) ----
        dx = x - self.prev_x

        # ---- Smooth velocity ----
        alpha_d = self.alpha(self.d_cutoff)
        dx_hat = alpha_d * dx + (1 - alpha_d) * self.prev_dx

        # ---- Adaptive cutoff ----
        cutoff = self.min_cutoff + self.beta * abs(dx_hat)

        # ---- Filter signal ----
        alpha = self.alpha(cutoff)
        x_hat = alpha * x + (1 - alpha) * self.prev_x

        # ---- Store state ----
        self.prev_x = x_hat
        self.prev_dx = dx_hat

        return x_hat


# ---- Example placeholders (replace with your actual algorithms) ----
one_euro = OneEuroFilter(min_cutoff=0.1, beta=0.02)

one_euro_z = []
for z in raw_z:
    filtered = one_euro.filter(z)
    one_euro_z.append(filtered)


def confidence_weighted_filter(values, confidences, alpha_min=0.05, alpha_max=0.8):
    """
    alpha_min: minimum responsiveness (strong smoothing)
    alpha_max: maximum responsiveness (low smoothing)
    """
    filtered = []
    prev = values[0]

    for x, c in zip(values, confidences):
        alpha = alpha_min + (alpha_max - alpha_min) * c

        x_hat = alpha * x + (1 - alpha) * prev

        filtered.append(x_hat)
        prev = x_hat

    return filtered


conf_weighted_z = confidence_weighted_filter(raw_z, confidence)



import math

def hybrid_filter(positions, confidences,
                  alpha_min=0.1,
                  alpha_max=0.6,
                  k=10.0,
                  v0=0.9):
    """
    positions: list of (x, y, z) tuples
    confidences: list of confidence values [0, 1]

    returns: list of filtered (x, y, z)
    """

    def clamp(val, min_val, max_val):
        return max(min_val, min(max_val, val))

    filtered = []
    S_prev = positions[0]
    P_prev = positions[0]

    for P, c in zip(positions, confidences):
        # ---- Velocity magnitude ----
        vx = P - P_prev

        v = math.sqrt(vx*vx)

        # ---- Velocity-based alpha (sigmoid) ----
        alpha_vel = alpha_min + (alpha_max - alpha_min) * (
            1.0 / (1.0 + math.exp(k * (v - v0)))
        )

        # ---- Confidence alpha ----
        alpha_conf = clamp(c, 0.2, 1.0)

        # ---- Final alpha ----
        alpha_final = alpha_vel * alpha_conf

        # ---- Filtering step ----
        Sx = S_prev + alpha_final * (P - S_prev)

        S = (Sx)

        filtered.append(S)

        # Update state
        S_prev = S
        P_prev = P

    return filtered


novel_filter = hybrid_filter(raw_z, confidence, 0.1, 0.5, 10, 0.7)


import statistics

def compute_metrics(signal):
    # Standard deviation
    std_dev = statistics.stdev(signal)

    # Frame-to-frame absolute differences
    diffs = [abs(signal[i] - signal[i-1]) for i in range(1, len(signal))]

    # Maximum step change
    max_step = max(diffs)

    return std_dev, max_step

raw_std, raw_max = compute_metrics(raw_z)
euro_std, euro_max = compute_metrics(one_euro_z)
conf_std, conf_max = compute_metrics(conf_weighted_z)
hybrid_std, hybrid_max = compute_metrics(novel_filter)

def to_percent(value, baseline):
    return (value / baseline) * 100

def improvement(value, baseline):
    return (1 - value / baseline) * 100

print("\n=== Improvement vs Raw ===")

print(f"One Euro         | Std ↓ {improvement(euro_std, raw_std):.1f}% | Max Step ↓ {improvement(euro_max, raw_max):.1f}%")
print(f"Confidence       | Std ↓ {improvement(conf_std, raw_std):.1f}% | Max Step ↓ {improvement(conf_max, raw_max):.1f}%")
print(f"Hybrid (Ours)    | Std ↓ {improvement(hybrid_std, raw_std):.1f}% | Max Step ↓ {improvement(hybrid_max, raw_max):.1f}%")
# ---- Create 4 stacked plots ----
fig, axs = plt.subplots(4, 1, figsize=(10, 10), sharex=True)

# 1. Noisy (Raw)
axs[0].plot(frames, raw_z, color="red", label="Raw Z")
axs[0].set_title("Noisy (Raw Z)")
axs[0].set_ylabel("Z (rad)")

# Secondary axis for confidence
ax_conf = axs[0].twinx()
ax_conf.plot(frames, confidence, color="black", linestyle=":", label="Confidence")
ax_conf.set_ylabel("Confidence")
ax_conf.set_ylim(0, 1)

# Combine legends
lines1, labels1 = axs[0].get_legend_handles_labels()
lines2, labels2 = ax_conf.get_legend_handles_labels()
axs[0].legend(lines1 + lines2, labels1 + labels2)

# 2. 1 Euro Filter
axs[1].plot(frames, one_euro_z, color="blue")
axs[1].set_title("1 Euro Filter")
axs[1].set_ylabel("Z (rad)")

# 3. Confidence Weighted
axs[2].plot(frames, conf_weighted_z, color="green")
axs[2].set_title("Confidence Weighted")
axs[2].set_ylabel("Z (rad)")

# 4. Smoothed Z (existing)
axs[3].plot(frames, novel_filter, color="purple")
axs[3].set_title("Our Method")
axs[3].set_ylabel("Z (rad)")
axs[3].set_xlabel("Frame")

plt.tight_layout()
plt.show()

