import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

try:
    res = sb.auth.admin.create_user({
        'email':'random_test_126@yahoo.com', 
        'password':'test', 
    })
    print('Success:', res)
except Exception as e:
    print('ERROR:', str(e))
