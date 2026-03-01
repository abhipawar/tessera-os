import os
import json
from cryptography.fernet import Fernet

def get_fernet():
    key = os.environ.get("FERNET_KEY")
    if not key:
        print("WARNING: No FERNET_KEY found. Generating a temporary one for this session.")
        key = Fernet.generate_key()
        os.environ["FERNET_KEY"] = key.decode()
    return Fernet(key)

def encrypt_credentials(creds_dict: dict) -> str:
    """Encrypts a dictionary of credentials into a string format."""
    if not creds_dict:
        return ""
    f = get_fernet()
    json_str = json.dumps(creds_dict)
    return f.encrypt(json_str.encode()).decode()

def decrypt_credentials(creds_data) -> dict:
    """Decrypts either an encrypted string or a legacy JSON object."""
    if not creds_data:
        return {}
        
    # If it's already a dictionary (unencrypted or legacy JSON)
    if isinstance(creds_data, dict):
        return creds_data
        
    f = get_fernet()
    try:
        # Try decrypting
        decrypted_str = f.decrypt(str(creds_data).encode()).decode()
        return json.loads(decrypted_str)
    except Exception as e:
        # Fallback in case the DB has plain text strings saved
        try:
            val = json.loads(creds_data)
            if isinstance(val, dict):
                return val
        except Exception:
            pass
        return {} # Safe fallback
