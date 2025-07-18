# 🐳 N8NPlus - Local n8n Container Manager

N8NPlus is a powerful Electron-based desktop application that simplifies managing multiple n8n (workflow automation) Docker containers locally. With an intuitive React frontend and robust Express backend, it provides dynamic port management, conflict resolution, and seamless container lifecycle management.

## ✨ Features

### Core Functionality
- **Multiple Container Management**: Create, start, stop, and delete n8n Docker containers
- **Dynamic Port Assignment**: Automatically assigns available ports starting from 5678
- **Port Conflict Resolution**: Detects and resolves port conflicts automatically
- **Base Address Configuration**: Customize the base address (localhost by default)
- **Real-time Search**: Filter containers by name or address
- **Window Tracking**: Automatically tracks and manages opened n8n browser windows

### Advanced Features
- **Health Monitoring**: Ping containers to verify accessibility before opening
- **Automatic Window Closure**: Closes associated browser windows when stopping/deleting containers
- **Persistent Configuration**: Saves container and configuration data in JSON files
- **Dark/Light Theme**: Toggle between dark and light UI themes
- **Real-time Updates**: Automatically refreshes container status every 30 seconds

## 🛠️ Technology Stack

- **Frontend**: React 18.2.0 + Electron 27.0.0
- **Backend**: Node.js + Express
- **Container Management**: Docker + Dockerode
- **Styling**: Custom CSS with modal components
- **Data Persistence**: JSON file storage

## 📋 Prerequisites

Before running N8NPlus, ensure you have:

1. **Node.js** (version 14 or higher)
2. **npm** (comes with Node.js)
3. **Docker Desktop** installed and running
4. **Git** (for cloning the repository)

### Docker Requirements
- Docker Desktop must be running before starting the application
- Ensure Docker daemon is accessible (default socket/pipe)
- Available ports starting from 5678 for n8n instances

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/BWolf-16/N8NPlus.git
cd N8NPlus
```

### 2. Install Root Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 5. Start the Application
```bash
npm start
```

This command will:
- Start the Express backend server on port 9999
- Launch the React frontend
- Open the Electron desktop application

## 🎮 Usage Guide

### Creating a New Container
1. Click the **"+ Create Instance"** button
2. Enter a unique container name (e.g., "n8n-production")
3. Click **"Create"** - the system will automatically assign an available port

### Managing Containers
- **Start**: Click "Start" to run the container
- **Open**: Click "Open" to launch n8n in a new browser window (container must be running)
- **Stop**: Click "Stop" to halt the container (automatically closes browser window)
- **Delete**: Click "Delete" to permanently remove the container

### Configuration
- **Base Address**: Click "Edit" next to the base address to change from localhost to another address
- **Search**: Use the search bar to filter containers by name or address
- **Theme**: Toggle between dark and light themes using the "Toggle Theme" button

### Port Conflict Resolution
If port conflicts are detected, N8NPlus will:
1. Display a warning banner with affected containers
2. Provide a "Reassign Port" button for each conflict
3. Automatically find and assign new available ports

## 🏗️ Project Structure

```
N8NPlus/
├── main.js                 # Electron main process
├── preload.js             # Electron preload script
├── package.json           # Root package configuration
├── backend/               # Express API server
│   ├── index.js          # Main backend server
│   ├── package.json      # Backend dependencies
│   ├── containers.json   # Container data storage
│   └── config.json       # App configuration storage
├── frontend/              # React application
│   ├── public/
│   │   └── index.html    # HTML template
│   ├── src/
│   │   ├── index.js      # React entry point
│   │   ├── styles.css    # Application styles
│   │   └── pages/
│   │       └── App.jsx   # Main React component
│   └── package.json      # Frontend dependencies
└── src/
    └── package.json      # Additional configuration
```

## 🔧 API Endpoints

The backend provides the following API endpoints:

### Container Management
- `GET /api/containers` - List all containers
- `POST /api/containers` - Create new container
- `POST /api/start/:name` - Start container
- `POST /api/stop/:name` - Stop container
- `POST /api/delete/:name` - Delete container

### Configuration
- `GET /api/config` - Get current configuration
- `POST /api/config/baseAddress` - Update base address

### Monitoring
- `GET /api/conflicts` - Check for port conflicts
- `POST /api/conflicts/reassign/:name` - Reassign container port
- `GET /api/ping/:name` - Check container accessibility

## 🐛 Troubleshooting

### Common Issues

#### Docker Connection Error
**Error**: `connect ENOENT \\.\pipe\docker_engine`
**Solution**: Start Docker Desktop and ensure it's running

#### Port Already in Use
**Error**: Container fails to start due to port conflict
**Solution**: Use the automatic port conflict resolution or manually reassign ports

#### Container Not Responding
**Error**: "Container is not responding" when clicking Open
**Solutions**:
- Wait a few moments for n8n to fully initialize
- Check if the container is actually running
- Verify Docker container logs

#### npm Install Failures
**Solutions**:
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility

### Debug Mode
To run in development mode with detailed logging:

1. Backend debug:
```bash
cd backend
npm run dev
```

2. Frontend debug:
```bash
cd frontend
npm start
```

3. Electron debug:
```bash
npm run electron-dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information about your problem
4. Include your operating system, Node.js version, and Docker version

## 🎯 Roadmap

- [ ] Container logs viewer
- [ ] Backup/restore functionality
- [ ] Custom Docker image support
- [ ] Environment variable management
- [ ] Container resource monitoring
- [ ] Multi-host support

---

**Made with ❤️ for the n8n community**
