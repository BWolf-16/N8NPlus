# 🌐 Network Access Guide

N8NPlus now supports **remote network access**, allowing you to manage n8n containers from different devices on your network!

## 🚀 **What's New**

### **Remote Access Features**
- **Connect to Remote Hosts**: Access N8NPlus running on other devices (e.g., Raspberry Pi, server)
- **Network Discovery**: Automatically find N8NPlus instances on your network
- **Connection Status**: Real-time connection monitoring
- **Cross-Platform**: Works on Windows, macOS, and Linux

### **Network Menu**
New **Network** menu with options:
- `Connect to localhost` - Return to local instance
- `Connect to Remote Host...` - Manual connection dialog
- `Scan Network for N8NPlus` - Auto-discover devices
- `Show Network Info` - Display network configuration

## 📋 **Setup Requirements**

### **On the Host Device (e.g., Raspberry Pi)**
1. **Install N8NPlus** on your host device
2. **Start N8NPlus** normally with `npm start`
3. **Check firewall** - ensure ports 3000 and 9999 are accessible
4. **Note the IP address** of the host device

### **On the Client Device (e.g., Windows PC)**
1. **Install N8NPlus** if you want a local copy (optional)
2. **Open N8NPlus** and use the Network menu to connect

## 🔧 **How to Connect**

### **Method 1: Manual Connection**
1. Open N8NPlus on your client device
2. Go to **Network** → **Connect to Remote Host...**
3. Enter the IP address of your host device (e.g., `192.168.1.100`)
4. Enter port `3000` (or leave default)
5. Click **Connect**

### **Method 2: Network Discovery**
1. Open N8NPlus on your client device
2. Go to **Network** → **Scan Network for N8NPlus**
3. Wait for the scan to complete (30-60 seconds)
4. Click on any discovered device to connect

### **Method 3: Keyboard Shortcuts**
- `Ctrl+Shift+C` (or `Cmd+Shift+C`) - Connect to Remote Host
- `Ctrl+Shift+F` (or `Cmd+Shift+F`) - Find Network Devices

## 🖥️ **Example Setup: Raspberry Pi + Windows PC**

### **Step 1: Setup Raspberry Pi (Host)**
```bash
# On your Raspberry Pi
cd /home/pi/N8NPlus
npm start

# Note the IP address
hostname -I
# Example output: 192.168.1.100
```

### **Step 2: Connect from Windows PC (Client)**
1. Open N8NPlus on your Windows PC
2. Press `Ctrl+Shift+C` to open connection dialog
3. Enter `192.168.1.100` as the host
4. Keep port as `3000`
5. Click **Connect**
6. You're now managing containers on your Raspberry Pi! 🎉

## 🔍 **Network Troubleshooting**

### **Can't Find Devices?**
- Ensure devices are on the same network
- Check firewall settings on the host device
- Verify N8NPlus is running on the host
- Try manual connection with IP address

### **Connection Failed?**
- Check if port 3000 is accessible on the host
- Verify the backend (port 9999) is also accessible
- Ensure no VPN is blocking local network access
- Check Windows Firewall or antivirus software

### **Testing Tools**
Use the built-in network testing commands:

```bash
# Scan for N8NPlus instances
npm run network-scan

# Show network information
npm run network-info

# Test specific connection
node src/network-test.js test 192.168.1.100 3000

# Check if host is running N8NPlus
node src/network-test.js check 192.168.1.100 3000
```

## 📡 **Network Technical Details**

### **Ports Used**
- **3000**: Frontend web interface
- **9999**: Backend API server

### **Security Notes**
- N8NPlus backend now accepts connections from any origin
- Only use on trusted networks (home/office)
- Consider VPN for external access
- Firewall rules should restrict access to trusted devices

### **Performance**
- Network latency may affect responsiveness
- Large container operations may take longer over network
- Local connection is always fastest for intensive tasks

## 🎯 **Status Indicators**

The header now shows connection status:
- 🟢 **Connected** - Successfully connected to host
- 🟡 **Connecting** - Establishing connection
- 🔴 **Disconnected** - Connection lost or failed

## 🔄 **Switching Between Hosts**

You can easily switch between different N8NPlus instances:
1. Use **Network** → **Connect to localhost** for local instance
2. Use **Network** → **Connect to Remote Host** for specific devices
3. Use **Network** → **Scan Network** to rediscover devices
4. The current host is shown in the window title and Network menu

## 💡 **Tips & Best Practices**

1. **Keep Local Copy**: Install N8NPlus locally for offline management
2. **Bookmark Hosts**: Note IP addresses of frequently used hosts
3. **Monitor Status**: Watch the connection indicator for issues
4. **Network Stability**: Use wired connections for better reliability
5. **Regular Scans**: Use network discovery to find new instances

Enjoy remote container management with N8NPlus! 🐳🚀
