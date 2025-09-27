#!/bin/bash

# prod_run.sh - Production script for helm-frontend Angular app
# Builds and runs the application in a Podman container on port 3003

set -e  # Exit on any error

APP_NAME="helm-frontend"
CONTAINER_NAME="helm-frontend-prod"
IMAGE_NAME="helm-frontend:latest"
PORT=3003
DIST_DIR="dist/helm-frontend"

echo "🏗️  Building Angular app for production..."

# Clean previous build
if [ -d "$DIST_DIR" ]; then
    rm -rf "$DIST_DIR"
fi

# Build the Angular app
npm run build --configuration=production

# Check if build was successful
if [ ! -d "$DIST_DIR" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Angular build completed successfully"

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    echo "❌ Podman is not installed. Please install Podman first:"
    echo "   Visit: https://podman.io/getting-started/installation"
    exit 1
fi

echo "🐳 Building Docker image with Podman..."

# Build the container image
podman build -t "$IMAGE_NAME" .

echo "✅ Container image built successfully"

# Stop and remove existing container if it exists
echo "🛑 Stopping existing container (if any)..."
podman stop "$CONTAINER_NAME" 2>/dev/null || true
podman rm "$CONTAINER_NAME" 2>/dev/null || true

echo "🚀 Starting $APP_NAME container on port $PORT..."

# Run the container
podman run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:80" \
    --restart=unless-stopped \
    "$IMAGE_NAME"

echo "✅ $APP_NAME started successfully!"
echo "📊 Application running at: http://localhost:$PORT"
echo "🐳 Container name: $CONTAINER_NAME"
echo ""
echo "📋 Useful commands:"
echo "   📝 View logs: podman logs $CONTAINER_NAME"
echo "   📝 Follow logs: podman logs -f $CONTAINER_NAME"
echo "   📊 Check status: podman ps"
echo "   🛑 Stop container: podman stop $CONTAINER_NAME"
echo "   🗑️  Remove container: podman rm $CONTAINER_NAME"
echo "   🔄 Restart container: podman restart $CONTAINER_NAME"