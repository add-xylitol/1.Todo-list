#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -ex

# --- Install Flutter ---
echo "--- Setting up Flutter ---"
# Use the FLUTTER_VERSION from Netlify's environment variables, or default
FLUTTER_VERSION_TO_USE=${FLUTTER_VERSION:-"3.19.0"}
echo "Using Flutter version: $FLUTTER_VERSION_TO_USE"

# We'll install Flutter in a local directory
FLUTTER_DIR="$PWD/.flutter"
rm -rf $FLUTTER_DIR
FLUTTER_SDK_URL="https://storage.flutter-io.cn/flutter_infra_release/releases/stable/macos/flutter_macos_${FLUTTER_VERSION_TO_USE}-stable.zip"

# Download and unzip the Flutter SDK
mkdir -p $FLUTTER_DIR
curl -L $FLUTTER_SDK_URL -o flutter.zip
unzip flutter.zip -d $FLUTTER_DIR
mv $FLUTTER_DIR/flutter $FLUTTER_DIR/flutter-sdk
rm flutter.zip

# Debug: Check Flutter installation
echo "--- Checking Flutter installation ---"
ls -la "$FLUTTER_DIR"
ls -la "$FLUTTER_DIR/flutter-sdk/bin" || echo "Flutter bin directory not found!"

# Add Flutter to the PATH for this script (prepend to prioritize)
export PATH="$FLUTTER_DIR/flutter-sdk/bin:$PATH"
echo "Updated PATH: $PATH"
which flutter || echo "Flutter not found in PATH!"

# Run flutter doctor to verify and download any missing tools
echo "--- Running flutter doctor ---"
flutter doctor
# --- End of Flutter Setup ---


# Debug: List files in the current directory
echo "--- Current directory: $(pwd) ---"
ls -la

# Navigate to the app directory
cd flutter_app

# Set Flutter mirror
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn

# Clean, then install Flutter dependencies
echo "--- Cleaning and installing Flutter dependencies ---"
flutter clean
flutter pub get

# Build the Flutter web application
echo "--- Building Flutter web application ---"
# Add --no-sound-null-safety for older packages if needed
flutter build web --release --verbose --web-renderer html > ../build_log.txt 2>&1

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