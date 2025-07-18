import React, { useState, useEffect } from 'react';

const UpdateNotification = () => {
    const [updateStatus, setUpdateStatus] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Listen for update status messages from main process
        const handleUpdateStatus = (event, status) => {
            setUpdateStatus(status);
            setIsVisible(true);
            
            // Auto-hide after 5 seconds for non-critical messages
            if (!status.includes('available') && !status.includes('downloaded')) {
                setTimeout(() => {
                    setIsVisible(false);
                }, 5000);
            }
        };

        // Check if we're running in Electron
        if (window.electronAPI) {
            window.electronAPI.onUpdateStatus(handleUpdateStatus);
        }

        return () => {
            // Cleanup if needed
            if (window.electronAPI && window.electronAPI.removeUpdateStatusListener) {
                window.electronAPI.removeUpdateStatusListener(handleUpdateStatus);
            }
        };
    }, []);

    const getStatusColor = () => {
        if (updateStatus.includes('available')) return '#4CAF50'; // Green
        if (updateStatus.includes('downloading') || updateStatus.includes('Downloading')) return '#2196F3'; // Blue
        if (updateStatus.includes('downloaded')) return '#FF9800'; // Orange
        if (updateStatus.includes('Error') || updateStatus.includes('error')) return '#F44336'; // Red
        return '#607D8B'; // Gray
    };

    const getStatusIcon = () => {
        if (updateStatus.includes('available')) return '🎉';
        if (updateStatus.includes('downloading') || updateStatus.includes('Downloading')) return '⬇️';
        if (updateStatus.includes('downloaded')) return '✅';
        if (updateStatus.includes('Error') || updateStatus.includes('error')) return '❌';
        if (updateStatus.includes('up to date')) return '✨';
        return '🔄';
    };

    if (!isVisible || !updateStatus) {
        return null;
    }

    return (
        <div 
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 1000,
                backgroundColor: getStatusColor(),
                color: 'white',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                maxWidth: '300px',
                opacity: 0.95,
                transition: 'all 0.3s ease'
            }}
        >
            <span style={{ fontSize: '16px' }}>{getStatusIcon()}</span>
            <span>{updateStatus}</span>
            <button
                onClick={() => setIsVisible(false)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    marginLeft: '8px',
                    padding: '0',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                ×
            </button>
        </div>
    );
};

export default UpdateNotification;
