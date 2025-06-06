"""
Logging utility for Pi Wireless Monitor
"""
import os
import sys
import logging
import logging.handlers
from colorlog import ColoredFormatter
from datetime import datetime

# Import configuration
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import config


class Logger:
    """Custom logger class with colored console output and file logging"""
    
    def __init__(self, name='pi-monitor', log_file=None):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, config.LOG_LEVEL))
        
        # Remove existing handlers
        self.logger.handlers = []
        
        # Console handler with colors
        self._setup_console_handler()
        
        # File handler
        if log_file or config.LOG_FILE:
            self._setup_file_handler(log_file or config.LOG_FILE)
    
    def _setup_console_handler(self):
        """Setup colored console output"""
        console_handler = logging.StreamHandler(sys.stdout)
        
        # Color scheme
        formatter = ColoredFormatter(
            '%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s%(reset)s',
            datefmt='%Y-%m-%d %H:%M:%S',
            log_colors={
                'DEBUG': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            }
        )
        
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
    
    def _setup_file_handler(self, log_file):
        """Setup rotating file handler"""
        # Create log directory if it doesn't exist
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        
        # Rotating file handler
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=config.LOG_MAX_SIZE * 1024 * 1024,  # Convert MB to bytes
            backupCount=config.LOG_BACKUP_COUNT
        )
        
        # File formatter (no colors)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
    
    def debug(self, message, *args, **kwargs):
        """Log debug message"""
        self.logger.debug(message, *args, **kwargs)
    
    def info(self, message, *args, **kwargs):
        """Log info message"""
        self.logger.info(message, *args, **kwargs)
    
    def warning(self, message, *args, **kwargs):
        """Log warning message"""
        self.logger.warning(message, *args, **kwargs)
    
    def error(self, message, *args, **kwargs):
        """Log error message"""
        self.logger.error(message, *args, **kwargs)
    
    def critical(self, message, *args, **kwargs):
        """Log critical message"""
        self.logger.critical(message, *args, **kwargs)
    
    def exception(self, message, *args, **kwargs):
        """Log exception with traceback"""
        self.logger.exception(message, *args, **kwargs)


# Create default logger instance
logger = Logger()


def get_logger(name=None):
    """Get logger instance"""
    if name:
        return Logger(name)
    return logger 