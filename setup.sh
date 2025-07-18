#!/bin/bash

# N8NPlus Auto-Setup Script (Unix/Linux/macOS)
echo ""
echo "========================================"
echo "   N8NPlus Auto-Setup Script"
echo "========================================"
echo ""

echo "🚀 Starting N8NPlus setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Node.js is installed
echo -e "${YELLOW}🔍 Checking for Node.js...${NC}"
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js first:${NC}"
    
    # Platform-specific installation instructions
    case "$OSTYPE" in
        linux*)
            echo -e "${YELLOW}    👉 Ubuntu/Debian: sudo apt install nodejs npm${NC}"
            echo -e "${YELLOW}    👉 Fedora: sudo dnf install nodejs npm${NC}"
            echo -e "${YELLOW}    👉 Arch: sudo pacman -S nodejs npm${NC}"
            echo -e "${YELLOW}    👉 Or visit: https://nodejs.org/en/download/${NC}"
            ;;
        darwin*)
            echo -e "${YELLOW}    👉 Homebrew: brew install node${NC}"
            echo -e "${YELLOW}    👉 Or visit: https://nodejs.org/en/download/${NC}"
            ;;
        *)
            echo -e "${YELLOW}    👉 Visit: https://nodejs.org/en/download/${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if npm is installed
echo -e "${YELLOW}🔍 Checking for npm...${NC}"
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm found: v$NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found. Please install npm first.${NC}"
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if Git is installed
echo -e "${YELLOW}🔍 Checking for Git...${NC}"
if command_exists git; then
    GIT_VERSION=$(git --version)
    echo -e "${GREEN}✅ $GIT_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️ Git not found. Installing Git...${NC}"
    
    case "$OSTYPE" in
        linux*)
            if command_exists apt; then
                sudo apt update && sudo apt install -y git
            elif command_exists dnf; then
                sudo dnf install -y git
            elif command_exists pacman; then
                sudo pacman -S --noconfirm git
            else
                echo -e "${RED}❌ Unable to install Git automatically. Please install manually.${NC}"
                exit 1
            fi
            ;;
        darwin*)
            if command_exists brew; then
                brew install git
            else
                echo -e "${YELLOW}⚠️ Homebrew not found. Please install Git manually or install Homebrew first.${NC}"
                echo -e "${YELLOW}    Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
                exit 1
            fi
            ;;
        *)
            echo -e "${RED}❌ Unable to install Git automatically on this platform.${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Git installed successfully!${NC}"
fi

# Check if Docker is installed
echo -e "${YELLOW}🔍 Checking for Docker...${NC}"
if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ $DOCKER_VERSION${NC}"
    
    # Check if Docker daemon is running
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker daemon is running${NC}"
    else
        echo -e "${YELLOW}⚠️ Docker daemon is not running. Attempting to start...${NC}"
        
        case "$OSTYPE" in
            linux*)
                sudo systemctl start docker
                if docker info >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ Docker daemon started successfully${NC}"
                else
                    echo -e "${RED}❌ Failed to start Docker daemon. Please start it manually.${NC}"
                fi
                ;;
            darwin*)
                echo -e "${YELLOW}⚠️ Please start Docker Desktop manually from Applications folder.${NC}"
                ;;
        esac
    fi
else
    echo -e "${YELLOW}⚠️ Docker not found. Please install Docker:${NC}"
    
    case "$OSTYPE" in
        linux*)
            echo -e "${YELLOW}    👉 Ubuntu/Debian: https://docs.docker.com/engine/install/ubuntu/${NC}"
            echo -e "${YELLOW}    👉 Fedora: https://docs.docker.com/engine/install/fedora/${NC}"
            echo -e "${YELLOW}    👉 CentOS: https://docs.docker.com/engine/install/centos/${NC}"
            ;;
        darwin*)
            echo -e "${YELLOW}    👉 macOS: https://docs.docker.com/desktop/mac/install/${NC}"
            ;;
        *)
            echo -e "${YELLOW}    👉 Visit: https://docs.docker.com/get-docker/${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue without Docker (you can install it later)..."
fi

echo ""
echo -e "${BLUE}📦 Running full setup...${NC}"
echo ""

# Run the setup manager
npm run setup

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Setup completed successfully!${NC}"
    echo ""
    echo -e "${CYAN}🎉 You can now run N8NPlus with: npm start${NC}"
    echo ""
    
    # Ask if user wants to start the application
    read -p "Would you like to start N8NPlus now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${GREEN}🚀 Starting N8NPlus...${NC}"
        npm start
    else
        echo ""
        echo -e "${GREEN}👍 Setup complete. Run 'npm start' when you're ready to use N8NPlus.${NC}"
    fi
else
    echo ""
    echo -e "${RED}❌ Setup failed. Please check the error messages above.${NC}"
    echo -e "${YELLOW}    You can also try running: npm install${NC}"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi
