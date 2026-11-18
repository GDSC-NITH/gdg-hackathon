#!/usr/bin/env sh
# Prepare the page view's hero background loop from a generated clip.
#
#   sh tools/hero-video.sh <desktop.mp4> <mobile.mp4 | -> [desktop logo box x:y:w:h] [mobile logo box | none]
#
# Pass - as the mobile clip to keep the current tall files. Clips are scaled
# first, the desktop one to WIDE_W pixels wide (default 1920) and the mobile one
# to TALL_W (default 720); logo boxes are given in those scaled pixels.
#
# For each clip it:
#   1. removes the generator's watermark (ffmpeg delogo over the given box),
#   2. makes the loop seamless: the last second cross-fades into the first, so the
#      final frame flows into frame 0 (the output is 1 s shorter than the input),
#   3. drops the audio track and writes H.264 MP4 (+faststart) and VP9 WebM,
#   4. writes a WebP poster from the first frame of the loop.
# Output: assets/hero/bg-{wide,tall}.{mp4,webm} and bg-{wide,tall}.webp
set -eu
WIDE=${1:?desktop clip}; TALL=${2:?mobile clip or -}; LOGO=${3:-1696:856:90:90}; TALL_LOGO=${4:-570:1129:62:62}
WIDE_W=${WIDE_W:-1920}; TALL_W=${TALL_W:-720}
box() { echo "delogo=x=${1%%:*}:y=$(echo "$1" | cut -d: -f2):w=$(echo "$1" | cut -d: -f3):h=$(echo "$1" | cut -d: -f4)"; }
OUT=assets/hero
mkdir -p "$OUT"

loop() { # <in> <name> <extra filter or empty>
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")
  pre=${3:+$3,}
  graph="[0:v]${pre}fps=24,settb=AVTB,split[a][b];[a]trim=start=1,setpts=PTS-STARTPTS,fps=24[main];[b]trim=0:1,setpts=PTS-STARTPTS,fps=24[head];[main][head]xfade=transition=fade:duration=1:offset=$(awk "BEGIN{print $dur - 2}"),format=yuv420p[v]"
  ffmpeg -v error -y -i "$1" -filter_complex "$graph" -map "[v]" -an \
    -c:v libx264 -preset slow -crf 26 -profile:v high -pix_fmt yuv420p -movflags +faststart "$OUT/bg-$2.mp4"
  ffmpeg -v error -y -i "$OUT/bg-$2.mp4" -an -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 "$OUT/bg-$2.webm"
  ffmpeg -v error -y -i "$OUT/bg-$2.mp4" -frames:v 1 -c:v libwebp -quality 58 "$OUT/bg-$2.webp"
}

loop "$WIDE" wide "scale=${WIDE_W}:-2:flags=lanczos,$(box "$LOGO")"
# Mobile: scaled to TALL_W wide; pass "none" as the fourth argument for a clip without a watermark.
[ "$TALL" = - ] || loop "$TALL" tall "scale=${TALL_W}:-2:flags=lanczos$([ "$TALL_LOGO" = none ] || echo ",$(box "$TALL_LOGO")")"
ls -la "$OUT"
