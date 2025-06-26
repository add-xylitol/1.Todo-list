#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -ex

# --- Install Flutter ---
echo "--- Setting up Flutter ---"
# Use the FLUTTER_VERSION from Netlify's environment variables, or default
FLUTTER_VERSION_TO_USE=${FLUTTER_VERSION:-"3.10.0"}
echo "Using Flutter version: $FLUTTER_VERSION_TO_USE"

# We'll install Flutter in a temporary directory within the build environment
FLUTTER_DIR="/opt/build/flutter"
mkdir -p $FLUTTER_DIR

# Download and extract the specified version of Flutter
FLUTTER_SDK_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_${FLUTTER_VERSION_TO_USE}-stable.zip"
wget -O flutter.zip $FLUTTER_SDK_URL
unzip flutter.zip -d /opt/build/
mv /opt/build/flutter $FLUTTER_DIR
rm flutter.zip

# Add Flutter to the PATH for this script
export PATH="$PATH:$FLUTTER_DIR/bin"

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
flutter build web --web-renderer html --verbose

# Debug: Check if the build/web directory exists and list its contents
echo "--- Checking build/web directory ---"
if [ -d "build/web" ]; then
  echo "--- build/web directory exists. Contents: ---"
  ls -la build/web
else
  echo "--- ERROR: build/web directory does not exist after build! ---"
  # Debug: List the contents of the build directory to see what's there
  if [ -d "build" ]; then
    echo "--- Contents of build directory: ---"
    ls -la build
  else
    echo "--- ERROR: build directory does not even exist! ---"
  fi
  exit 1
fi

# Navigate back to the root directory
echo "--- Navigating back to the root directory ---"
cd ..

# Debug: List files in the root directory again
echo "--- Current directory: $(pwd) ---"
ls -la

echo "Build script finished successfully."