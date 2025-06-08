"""
Configuration Manager for Pi Wireless Monitor
Handles .env file updates and service restart
"""
import os
import sys
import shutil
import subprocess
from datetime import datetime
from typing import Dict, Optional

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils.logger import get_logger

logger = get_logger('config_manager')


class ConfigManager:
    """Manages configuration updates and service restart"""
    
    def __init__(self, env_file_path: str = None):
        self.env_file_path = env_file_path or os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            '.env'
        )
        self.backup_suffix = '.backup'
        
    def backup_env_file(self) -> bool:
        """Create a backup of the current .env file"""
        try:
            if os.path.exists(self.env_file_path):
                backup_path = f"{self.env_file_path}{self.backup_suffix}"
                shutil.copy2(self.env_file_path, backup_path)
                logger.info(f"Created backup: {backup_path}")
                return True
            else:
                logger.warning("No .env file found to backup")
                return False
        except Exception as e:
            logger.error(f"Failed to backup .env file: {e}")
            return False
    
    def update_env_file(self, updates: Dict[str, str]) -> bool:
        """Update specific values in the .env file"""
        try:
            if not os.path.exists(self.env_file_path):
                logger.error(f".env file not found: {self.env_file_path}")
                return False
            
            # Create backup first
            if not self.backup_env_file():
                logger.error("Failed to create backup, aborting update")
                return False
            
            # Read current .env file
            with open(self.env_file_path, 'r') as f:
                lines = f.readlines()
            
            # Update the lines
            updated_lines = []
            updated_keys = set()
            
            for line in lines:
                stripped = line.strip()
                if stripped and not stripped.startswith('#') and '=' in stripped:
                    key = stripped.split('=', 1)[0]
                    if key in updates:
                        # Update this line
                        updated_lines.append(f"{key}={updates[key]}\n")
                        updated_keys.add(key)
                        logger.info(f"Updated {key}={updates[key]}")
                    else:
                        # Keep original line
                        updated_lines.append(line)
                else:
                    # Keep comments and empty lines
                    updated_lines.append(line)
            
            # Add any new keys that weren't found
            for key, value in updates.items():
                if key not in updated_keys:
                    updated_lines.append(f"{key}={value}\n")
                    logger.info(f"Added new {key}={value}")
            
            # Write updated .env file
            with open(self.env_file_path, 'w') as f:
                f.writelines(updated_lines)
            
            logger.info(f"Successfully updated .env file with {len(updates)} changes")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update .env file: {e}")
            self.restore_backup()
            return False
    
    def restore_backup(self) -> bool:
        """Restore .env file from backup"""
        try:
            backup_path = f"{self.env_file_path}{self.backup_suffix}"
            if os.path.exists(backup_path):
                shutil.copy2(backup_path, self.env_file_path)
                logger.info("Restored .env file from backup")
                return True
            else:
                logger.error("No backup file found to restore")
                return False
        except Exception as e:
            logger.error(f"Failed to restore backup: {e}")
            return False
    
    def validate_config_update(self, updates: Dict[str, str]) -> bool:
        """Validate configuration updates before applying"""
        try:
            # Check for required fields
            if not updates:
                logger.error("No updates provided")
                return False
            
            # Validate field lengths
            for key, value in updates.items():
                if key == 'MONITOR_NAME' and len(value) > 100:
                    logger.error(f"Monitor name too long: {len(value)} characters")
                    return False
                if key == 'MONITOR_LOCATION' and len(value) > 200:
                    logger.error(f"Monitor location too long: {len(value)} characters")
                    return False
                if not value.strip():
                    logger.error(f"Empty value for {key}")
                    return False
            
            logger.info("Configuration validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Configuration validation failed: {e}")
            return False
    
    def restart_service(self, method: str = 'systemctl') -> bool:
        """Restart the pi-monitor service"""
        try:
            if method == 'systemctl':
                # Use systemctl to restart the service
                result = subprocess.run(
                    ['sudo', 'systemctl', 'restart', 'pi-monitor'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    logger.info("Service restarted successfully via systemctl")
                    return True
                else:
                    logger.error(f"systemctl restart failed: {result.stderr}")
                    return False
                    
            elif method == 'exit':
                # Exit the process and let systemd restart it
                logger.info("Exiting process for systemd auto-restart...")
                sys.exit(0)
                
            else:
                logger.error(f"Unknown restart method: {method}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("Service restart timed out")
            return False
        except Exception as e:
            logger.error(f"Failed to restart service: {e}")
            return False
    
    def sync_configuration(self, config_data: Dict[str, str]) -> bool:
        """Complete configuration sync process"""
        try:
            logger.info(f"Starting configuration sync: {config_data}")
            
            # Validate the updates
            if not self.validate_config_update(config_data):
                return False
            
            # Map server field names to .env variable names
            env_updates = {}
            if 'name' in config_data:
                env_updates['MONITOR_NAME'] = config_data['name']
            if 'location' in config_data:
                env_updates['MONITOR_LOCATION'] = config_data['location']
            
            if not env_updates:
                logger.warning("No valid configuration updates found")
                return False
            
            # Update the .env file
            if self.update_env_file(env_updates):
                logger.info("Configuration sync completed successfully")
                return True
            else:
                logger.error("Configuration sync failed")
                return False
                
        except Exception as e:
            logger.error(f"Configuration sync error: {e}")
            return False
    
    def get_current_config(self) -> Dict[str, str]:
        """Get current configuration from .env file"""
        try:
            config = {}
            if os.path.exists(self.env_file_path):
                with open(self.env_file_path, 'r') as f:
                    for line in f:
                        stripped = line.strip()
                        if stripped and not stripped.startswith('#') and '=' in stripped:
                            key, value = stripped.split('=', 1)
                            config[key] = value
            return config
        except Exception as e:
            logger.error(f"Failed to read current config: {e}")
            return {}