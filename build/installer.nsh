; N8NPlus v1.0.4 Enhanced Installer Script
; This script provides options to install Node.js and Docker Desktop

!macro preInit
    ; Check if Node.js is installed
    ReadRegStr $0 HKLM "SOFTWARE\Node.js" "InstallPath"
    StrCmp $0 "" 0 nodejs_found
    
    ; Check alternate Node.js registry location
    ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{node.js}" "InstallLocation"
    StrCmp $0 "" nodejs_not_found nodejs_found
    
    nodejs_found:
        DetailPrint "Node.js installation found: $0"
        Goto nodejs_check_done
        
    nodejs_not_found:
        DetailPrint "Node.js not found in registry"
        
    nodejs_check_done:
!macroend

!macro customInstall
    ; Display installation options
    DetailPrint "Installing N8NPlus v1.0.4..."
    
    ; Check if Node.js is available
    nsExec::ExecToStack 'node --version'
    Pop $0
    Pop $1
    
    ${If} $0 == 0
        DetailPrint "Node.js is available: $1"
    ${Else}
        DetailPrint "Node.js not found in PATH, offering installation..."
        
        ; Ask user if they want to install Node.js
        MessageBox MB_YESNO|MB_ICONQUESTION \
            "Node.js is required for N8NPlus to function properly.$\r$\n$\r$\nWould you like to download and install Node.js now?$\r$\n$\r$\nNote: You can also install it manually from https://nodejs.org/" \
            IDYES install_nodejs IDNO skip_nodejs
            
        install_nodejs:
            DetailPrint "Downloading Node.js installer..."
            
            ; Create temp directory
            CreateDirectory "$TEMP\n8nplus-deps"
            
            ; Download Node.js LTS installer
            NSISdl::download "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" "$TEMP\n8nplus-deps\nodejs-installer.msi"
            Pop $0
            
            ${If} $0 == "success"
                DetailPrint "Node.js downloaded successfully"
                
                ; Run Node.js installer
                DetailPrint "Installing Node.js... (this may take a few minutes)"
                ExecWait '"msiexec" /i "$TEMP\n8nplus-deps\nodejs-installer.msi" /quiet' $0
                
                ${If} $0 == 0
                    DetailPrint "Node.js installed successfully"
                    MessageBox MB_OK|MB_ICONINFORMATION "Node.js has been installed successfully!"
                ${Else}
                    DetailPrint "Node.js installation failed with code: $0"
                    MessageBox MB_OK|MB_ICONWARNING "Node.js installation failed. Please install it manually from https://nodejs.org/"
                ${EndIf}
                
                ; Clean up
                Delete "$TEMP\n8nplus-deps\nodejs-installer.msi"
            ${Else}
                DetailPrint "Failed to download Node.js: $0"
                MessageBox MB_OK|MB_ICONWARNING "Failed to download Node.js. Please install it manually from https://nodejs.org/"
            ${EndIf}
            
        skip_nodejs:
    ${EndIf}
    
    ; Check for Docker Desktop
    ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop" "InstallLocation"
    StrCmp $0 "" docker_not_found docker_found
    
    ; Check alternate Docker location
    ReadRegStr $0 HKLM "SOFTWARE\Docker Inc.\Docker Desktop" "InstallPath"
    StrCmp $0 "" docker_not_found docker_found
    
    docker_found:
        DetailPrint "Docker Desktop found: $0"
        Goto docker_check_done
        
    docker_not_found:
        DetailPrint "Docker Desktop not detected"
        
        ; Ask user if they want to install Docker Desktop
        MessageBox MB_YESNO|MB_ICONQUESTION \
            "Docker Desktop is required for N8NPlus to manage containers.$\r$\n$\r$\nWould you like to download Docker Desktop now?$\r$\n$\r$\nNote: Docker Desktop requires a restart after installation." \
            IDYES install_docker IDNO skip_docker
            
        install_docker:
            ; Open Docker Desktop download page
            ExecShell "open" "https://www.docker.com/products/docker-desktop/"
            MessageBox MB_OK|MB_ICONINFORMATION "Docker Desktop download page has been opened in your browser.$\r$\n$\r$\nPlease download and install Docker Desktop, then restart your computer before using N8NPlus."
            
        skip_docker:
            
    docker_check_done:
    
    ; Create application data directory
    CreateDirectory "$APPDATA\N8NPlus"
    
    ; Create shortcuts with proper working directory
    CreateShortcut "$DESKTOP\N8NPlus.lnk" "$INSTDIR\N8NPlus.exe" "" "$INSTDIR\assets\icon.ico" 0 SW_SHOWNORMAL "" "N8NPlus - Local n8n Container Manager"
    CreateShortcut "$SMPROGRAMS\N8NPlus.lnk" "$INSTDIR\N8NPlus.exe" "" "$INSTDIR\assets\icon.ico" 0 SW_SHOWNORMAL "" "N8NPlus - Local n8n Container Manager"
    
    ; Install dependencies in the background
    DetailPrint "Installing N8NPlus dependencies..."
    SetOutPath "$INSTDIR"
    
    ; Create a batch file to install dependencies
    FileOpen $0 "$INSTDIR\install-deps.bat" w
    FileWrite $0 "@echo off$\r$\n"
    FileWrite $0 "cd /d $\"$INSTDIR$\"$\r$\n"
    FileWrite $0 "echo Installing N8NPlus dependencies...$\r$\n"
    FileWrite $0 "if exist backend\package.json ($\r$\n"
    FileWrite $0 "    cd backend$\r$\n"
    FileWrite $0 "    npm install --production$\r$\n"
    FileWrite $0 "    cd ..$\r$\n"
    FileWrite $0 ")$\r$\n"
    FileWrite $0 "if exist frontend\package.json ($\r$\n"
    FileWrite $0 "    cd frontend$\r$\n"
    FileWrite $0 "    npm install --production$\r$\n"
    FileWrite $0 "    cd ..$\r$\n"
    FileWrite $0 ")$\r$\n"
    FileWrite $0 "echo Dependencies installation completed.$\r$\n"
    FileClose $0
    
    DetailPrint "N8NPlus installation completed successfully!"
!macroend

!macro customUnInit
    ; Clean up application data on uninstall
    RMDir /r "$APPDATA\N8NPlus"
    
    ; Remove shortcuts
    Delete "$DESKTOP\N8NPlus.lnk"
    Delete "$SMPROGRAMS\N8NPlus.lnk"
    
    ; Remove installation helper files
    Delete "$INSTDIR\install-deps.bat"
!macroend
