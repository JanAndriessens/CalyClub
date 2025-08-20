// Production-Ready Logging System for CalyBase
// Replaces console statements with environment-aware logging

(function() {
    'use strict';

    // Environment detection
    const Environment = {
        isDevelopment: () => {
            return window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.search.includes('debug=true') ||
                   localStorage.getItem('debug') === 'true';
        },
        
        isProduction: () => {
            return window.location.hostname.includes('caly.club') ||
                   window.location.hostname.includes('calyclub.web.app') ||
                   window.location.hostname.includes('calyclub.firebaseapp.com') ||
                   window.location.hostname.includes('vercel.app');
        },
        
        getEnvironment: () => {
            if (Environment.isDevelopment()) return 'development';
            if (Environment.isProduction()) return 'production';
            return 'staging';
        }
    };

    // Log levels
    const LogLevel = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
        TRACE: 4
    };

    // Configuration based on environment
    const LogConfig = {
        development: {
            level: LogLevel.TRACE,
            console: true,
            remote: false,
            store: true
        },
        staging: {
            level: LogLevel.INFO,
            console: true,
            remote: true,
            store: true
        },
        production: {
            level: LogLevel.WARN,
            console: false,
            remote: true,
            store: false
        }
    };

    // Get current config
    const currentEnv = Environment.getEnvironment();
    const config = LogConfig[currentEnv];

    // Local storage for logs (development/staging only)
    const LogStorage = {
        maxEntries: 1000,
        key: 'calybase_logs',
        
        store(entry) {
            if (!config.store) return;
            
            try {
                const logs = this.getLogs();
                logs.push(entry);
                
                // Keep only recent entries
                if (logs.length > this.maxEntries) {
                    logs.splice(0, logs.length - this.maxEntries);
                }
                
                localStorage.setItem(this.key, JSON.stringify(logs));
            } catch (error) {
                // Storage failed, continue silently
            }
        },
        
        getLogs() {
            try {
                const stored = localStorage.getItem(this.key);
                return stored ? JSON.parse(stored) : [];
            } catch (error) {
                return [];
            }
        },
        
        clearLogs() {
            try {
                localStorage.removeItem(this.key);
            } catch (error) {
                // Ignore errors
            }
        },
        
        exportLogs() {
            const logs = this.getLogs();
            const blob = new Blob([JSON.stringify(logs, null, 2)], 
                                 { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `calybase-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Remote logging (for production error tracking)
    const RemoteLogger = {
        async send(entry) {
            if (!config.remote || entry.level > LogLevel.WARN) return;
            
            try {
                // In a real implementation, this would send to Sentry, LogRocket, etc.
                // For now, we'll just prepare the structure
                const payload = {
                    timestamp: entry.timestamp,
                    level: entry.levelName,
                    message: entry.message,
                    data: entry.data,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    userId: window.auth?.currentUser?.uid || 'anonymous'
                };
                
                // TODO: Implement actual remote logging service
                console.warn('Remote logging payload prepared:', payload);
            } catch (error) {
                // Remote logging failed, continue silently
            }
        }
    };

    // Main Logger class
    class Logger {
        constructor(module = 'App') {
            this.module = module;
        }
        
        log(level, message, data = null, error = null) {
            if (level > config.level) return;
            
            const entry = {
                timestamp: new Date().toISOString(),
                level,
                levelName: Object.keys(LogLevel)[level],
                module: this.module,
                message,
                data,
                error: error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                } : null
            };
            
            // Console logging
            if (config.console) {
                this.logToConsole(entry);
            }
            
            // Store locally
            LogStorage.store(entry);
            
            // Send to remote service
            RemoteLogger.send(entry);
        }
        
        logToConsole(entry) {
            const prefix = `[${entry.timestamp.split('T')[1].split('.')[0]}] ${entry.module}:`;
            const style = this.getConsoleStyle(entry.level);
            
            switch (entry.level) {
                case LogLevel.ERROR:
                    console.error(prefix, entry.message, entry.data, entry.error);
                    break;
                case LogLevel.WARN:
                    console.warn(prefix, entry.message, entry.data);
                    break;
                case LogLevel.INFO:
                    console.info(prefix, entry.message, entry.data);
                    break;
                case LogLevel.DEBUG:
                    console.log(prefix, entry.message, entry.data);
                    break;
                case LogLevel.TRACE:
                    console.trace(prefix, entry.message, entry.data);
                    break;
            }
        }
        
        getConsoleStyle(level) {
            const styles = {
                [LogLevel.ERROR]: 'color: #e74c3c; font-weight: bold',
                [LogLevel.WARN]: 'color: #f39c12; font-weight: bold',
                [LogLevel.INFO]: 'color: #3498db',
                [LogLevel.DEBUG]: 'color: #95a5a6',
                [LogLevel.TRACE]: 'color: #7f8c8d; font-size: 0.9em'
            };
            return styles[level] || '';
        }
        
        // Convenience methods
        error(message, data = null, error = null) {
            this.log(LogLevel.ERROR, message, data, error);
        }
        
        warn(message, data = null) {
            this.log(LogLevel.WARN, message, data);
        }
        
        info(message, data = null) {
            this.log(LogLevel.INFO, message, data);
        }
        
        debug(message, data = null) {
            this.log(LogLevel.DEBUG, message, data);
        }
        
        trace(message, data = null) {
            this.log(LogLevel.TRACE, message, data);
        }
        
        // Performance logging
        time(label) {
            if (config.level >= LogLevel.DEBUG) {
                this.startTimes = this.startTimes || {};
                this.startTimes[label] = performance.now();
            }
        }
        
        timeEnd(label) {
            if (config.level >= LogLevel.DEBUG && this.startTimes && this.startTimes[label]) {
                const duration = performance.now() - this.startTimes[label];
                this.debug(`${label}: ${duration.toFixed(2)}ms`);
                delete this.startTimes[label];
            }
        }
        
        // Group logging
        group(label) {
            if (config.console && config.level >= LogLevel.DEBUG) {
                console.group(`[${this.module}] ${label}`);
            }
        }
        
        groupEnd() {
            if (config.console && config.level >= LogLevel.DEBUG) {
                console.groupEnd();
            }
        }
    }

    // Global logger instance
    const logger = new Logger('CalyBase');

    // Export logger
    window.Logger = Logger;
    window.logger = logger;
    window.LogStorage = LogStorage;
    
    // Debug utilities for development
    if (Environment.isDevelopment()) {
        window.debugCalyBase = {
            logs: () => LogStorage.getLogs(),
            exportLogs: () => LogStorage.exportLogs(),
            clearLogs: () => LogStorage.clearLogs(),
            setLevel: (level) => { config.level = level; },
            enableDebug: () => { localStorage.setItem('debug', 'true'); },
            disableDebug: () => { localStorage.removeItem('debug'); }
        };
    }
    
    // Initialize logging system
    logger.info('Logging system initialized', {
        environment: currentEnv,
        config: config,
        userAgent: navigator.userAgent.substring(0, 50) + '...'
    });

})();