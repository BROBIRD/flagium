#!/bin/bash

# Create directories for different PNG sizes
mkdir -p flags_png/16
mkdir -p flags_png/32
mkdir -p flags_png/48
mkdir -p flags_png/128

echo "Converting SVG flags to PNG format..."

# Counter for progress
total=$(ls flags/*.svg | wc -l)
current=0

# Convert each SVG to multiple PNG sizes
for svg in flags/*.svg; do
    filename=$(basename "$svg" .svg)
    current=$((current + 1))

    echo "[$current/$total] Converting $filename..."

    # Convert to different sizes
    convert "$svg" -resize 16x16 "flags_png/16/${filename}.png"
    convert "$svg" -resize 32x32 "flags_png/32/${filename}.png"
    convert "$svg" -resize 48x48 "flags_png/48/${filename}.png"
    convert "$svg" -resize 128x128 "flags_png/128/${filename}.png"
done

echo "Conversion complete! Created PNG flags in flags_png/ directory"
echo "Sizes created: 16x16, 32x32, 48x48, 128x128"