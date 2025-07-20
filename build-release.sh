#!/bin/bash

# N8NPlus v1.0.4 Build Script for macOS/Linux
# This script builds N8NPlus for distribution

echo "🚀 N8NPlus v1.0.4 Build Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm version: $NPM_VERSION"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -rf frontend/build/
print_success "Previous builds cleaned"

# Install root dependencies
print_status "Installing root dependencies..."
if npm install; then
    print_success "Root dependencies installed"
else
    print_error "Failed to install root dependencies"
    exit 1
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
if npm install; then
    print_success "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi
cd ..

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
if npm install; then
    print_success "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Build frontend
print_status "Building frontend..."
if npm run build; then
    print_success "Frontend built successfully"
else
    print_error "Failed to build frontend"
    exit 1
fi
cd ..

# Install electron-builder if not present
print_status "Checking electron-builder..."
if ! npm list electron-builder --depth=0 &> /dev/null; then
    print_status "Installing electron-builder..."
    npm install --save-dev electron-builder
fi

# Determine platform and build accordingly
PLATFORM=$(uname)
print_status "Detected platform: $PLATFORM"

if [[ "$PLATFORM" == "Darwin" ]]; then
    # macOS
    print_status "Building for macOS..."
    if npm run build-mac; then
        print_success "macOS build completed!"
        print_status "Output: dist/N8NPlus-1.0.4-mac.dmg"
    else
        print_error "macOS build failed"
        exit 1
    fi
elif [[ "$PLATFORM" == "Linux" ]]; then
    # Linux
    print_status "Building for Linux..."
    if npm run build-linux; then
        print_success "Linux build completed!"
        print_status "Output: dist/N8NPlus-1.0.4-linux.AppImage"
    else
        print_error "Linux build failed"
        exit 1
    fi
else
    print_warning "Unknown platform: $PLATFORM"
    print_status "Attempting generic build..."
    if npm run build; then
        print_success "Build completed!"
    else
        print_error "Build failed"
        exit 1
    fi
fi

# Show build results
print_success "🎉 Build process completed!"
echo ""
print_status "Built files:"
if [ -d "dist" ]; then
    ls -la dist/
else
    print_warning "dist/ directory not found"
fi

echo ""
print_status "Next steps:"
echo "1. Test the built application"
echo "2. Upload to GitHub release"
echo "3. Update release notes"

print_success "✅ Ready for distribution!"
