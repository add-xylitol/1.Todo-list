#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -ex

# --- Install Flutter ---
echo "--- Setting up Flutter ---"
# Use the FLUTTER_VERSION from Netlify's environment variables, or default
FLUTTER_VERSION_TO_USE=${FLUTTER_VERSION:-"3.10.0"}
echo "Using Flutter version: $FLUTTER_VERSION_TO_USE"

# We'll install Flutter in /opt/build/flutter
FLUTTER_DIR="/opt/build/flutter"

# Clone the Flutter repository from GitHub
git clone https://github.com/flutter/flutter.git --depth 1 --branch $FLUTTER_VERSION_TO_USE $FLUTTER_DIR

# Debug: Check Flutter installation
echo "--- Checking Flutter installation ---"
ls -la "$FLUTTER_DIR"
ls -la "$FLUTTER_DIR/bin" || echo "Flutter bin directory not found!"

# Add Flutter to the PATH for this script (prepend to prioritize)
export PATH="$FLUTTER_DIR/bin:$PATH"
echo "Updated PATH: $PATH"
which flutter || echo "Flutter not found in PATH!"

# Run flutter doctor to verify and download any missing tools
echo "--- Running flutter doctor ---"
flutter doctor
# --- End of Flutter Setup ---


# Debug: List files in the current directory
echo "--- Current directory: $(pwd) ---"
ls -la

# Navigate to the flutter_app directory
echo "--- Navigating to flutter_app ---"
cd flutter_app

# Debug: List files in the flutter_app directory
echo "--- Current directory: $(pwd) ---"
ls -la

# Clean, then install Flutter dependencies
echo "--- Cleaning and installing Flutter dependencies ---"
flutter clean
flutter pub get

# Build the Flutter web application
echo "--- Building Flutter web application ---"
# Add --no-sound-null-safety for older packages if needed
flutter build web --release

# Debug: List build output
echo "--- Listing build output in build/web ---"
ls -la build/web

# Navigate back to the root directory
echo "--- Navigating back to root ---"
cd ..

# --- Netlify Redirects --- (Optional but good practice for SPAs)
echo "--- Creating Netlify redirects file ---"
# The publish directory is set in netlify.toml, so we just need to make sure the app is built.

echo "--- Build script finished ---"