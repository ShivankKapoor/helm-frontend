#!/bin/bash

# prod_stop.sh - Stop and cleanup script for helm-frontend Angular app
# Safely removes only helm-frontend related containers and images

set -e  # Exit on any error

APP_NAME="helm-frontend"
CONTAINER_NAME="helm-frontend-prod"
IMAGE_NAME="helm-frontend:latest"

echo "🛑 Stopping and cleaning up $APP_NAME..."

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    echo "❌ Podman is not installed."
    exit 1
fi

# Stop the container if it's running
echo "🔄 Stopping container '$CONTAINER_NAME'..."
if podman ps -q --filter "name=$CONTAINER_NAME" | grep -q .; then
    podman stop "$CONTAINER_NAME"
    echo "✅ Container '$CONTAINER_NAME' stopped"
else
    echo "ℹ️  Container '$CONTAINER_NAME' is not running"
fi

# Remove the container if it exists
echo "🗑️  Removing container '$CONTAINER_NAME'..."
if podman ps -a -q --filter "name=$CONTAINER_NAME" | grep -q .; then
    podman rm "$CONTAINER_NAME"
    echo "✅ Container '$CONTAINER_NAME' removed"
else
    echo "ℹ️  Container '$CONTAINER_NAME' does not exist"
fi

# Remove the image if it exists
echo "🗑️  Removing image '$IMAGE_NAME'..."
if podman images -q "$IMAGE_NAME" | grep -q .; then
    podman rmi "$IMAGE_NAME"
    echo "✅ Image '$IMAGE_NAME' removed"
else
    echo "ℹ️  Image '$IMAGE_NAME' does not exist"
fi

# Clean up any dangling images related to helm-frontend (optional)
echo "🧹 Cleaning up dangling images..."
DANGLING_IMAGES=$(podman images -f "dangling=true" -q --filter "reference=*helm-frontend*" 2>/dev/null || true)
if [ -n "$DANGLING_IMAGES" ]; then
    echo "$DANGLING_IMAGES" | xargs podman rmi
    echo "✅ Dangling helm-frontend images cleaned up"
else
    echo "ℹ️  No dangling helm-frontend images found"
fi

echo ""
echo "✅ Cleanup completed successfully!"
echo "📊 Remaining containers:"
podman ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""
echo "📊 Remaining images:"
podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}"