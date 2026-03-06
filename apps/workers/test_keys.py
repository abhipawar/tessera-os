import os
import json
import traceback
from cryptography.fernet import Fernet
from dotenv import load_dotenv

def main():
    print("--- Starting Decryption Test ---")
    load_dotenv()
    fernet_key = os.environ.get("FERNET_KEY")
    if not fernet_key:
        print("ERROR: FERN_KEY is missing from environment!")
        return

    print(f"Loaded FERNET_KEY of length: {len(fernet_key)}")
    
    raw_payload = "gAAAAABpqFv7av9t8kRfukgf2BB5WQgZJCHywthl7ylbbEXGX1bb4beBBbNTxhj1rZU4HBBS1Agzco6dwcFsQWPRIDYmA=="
    
    try:
        f = Fernet(fernet_key.encode())
        print("Fernet initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Fernet: {e}")
        return

    try:
        print(f"Attempting to decrypt payload of length: {len(raw_payload)}")
        decrypted_bytes = f.decrypt(raw_payload.encode())
        decrypted_str = decrypted_bytes.decode()
        print(f"SUCCESS! Decoded string: {decrypted_str}")
        
        parsed_json = json.loads(decrypted_str)
        print(f"JSON Parsed: {type(parsed_json)}")
        
    except Exception as e:
        print(f"Decryption failed with exception: {type(e).__name__}")
        print(f"Error Message: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
