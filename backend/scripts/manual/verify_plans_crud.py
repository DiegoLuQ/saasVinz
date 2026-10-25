import urllib.request
import urllib.parse
import urllib.error
import json
import os

# Configuration
BASE_URL = "http://localhost:8000"
CREATOR_EMAIL = "creador@saas.com"  # Adjust as needed (admin@System.com might be loopback?)
CREATOR_PASSWORD = "admin"      # Adjust as needed

def make_request(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    encoded_data = None
    if data:
        encoded_data = json.dumps(data).encode("utf-8")
    
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            response_body = response.read().decode("utf-8")
            try:
                json_body = json.loads(response_body)
            except:
                json_body = response_body
            return {"status": status, "body": json_body}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
           json_body = json.loads(error_body)
        except:
           json_body = error_body
        return {"status": e.code, "body": json_body}
    except Exception as e:
        print(f"Request Error: {e}")
        return None

def login_creator():
    """Login as creator to get token"""
    url = f"{BASE_URL}/api/internal/creator/auth/login"
    # Try JSON login first (if supported)
    data = {"username": CREATOR_EMAIL, "password": CREATOR_PASSWORD}
    
    print(f"Attempting login to {url}...")
    # OAuth2 form data is usually sent as application/x-www-form-urlencoded
    # But let's try JSON if router supports it, or I need to implement urlencoding.
    
    # Trying URL Encoded first as it is standard OAuth2
    form_data = urllib.parse.urlencode(data).encode("utf-8")
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    req = urllib.request.Request(url, data=form_data, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            body = json.loads(response.read().decode("utf-8"))
            return body.get("access_token")
    except urllib.error.HTTPError as e:
        print(f"Login Failed ({e.code}): {e.read().decode('utf-8')}")
        return None
    except Exception as e:
        print(f"Login Connection Error: {e}")
        return None

def verify_plans_crud():
    print("Starting Verification...")
    token = login_creator()
    if not token:
        print("Skipping tests due to login failure")
        return # Try to proceed? No, endpoints are protected.

    print(f"Got Token: {token[:10]}...")
    
    print("\n--- 1. Testing GET All Plans ---")
    res = make_request(f"{BASE_URL}/api/internal/creator/plans", "GET", token=token)
    print(f"Status: {res['status']}")
    if res['status'] == 200:
        print(f"Found {len(res['body'])} plans")
    else:
        print(f"Error: {res['body']}")

    print("\n--- 2. Testing CREATE Plan ---")
    new_plan = {
        "name": "Test Plan Auto Lib",
        "monthly_price": 99.99,
        "annual_price": 999.99,
        "max_pets": 50,
        "max_users": 5,
        "features": [{"name": "Support", "included": True}],
        "is_active": True
    }
    
    res = make_request(f"{BASE_URL}/api/internal/creator/plans", "POST", data=new_plan, token=token)
    print(f"Create Status: {res['status']}")
    
    if res['status'] in [200, 201]:
        plan_id = res['body'].get("id")
        print(f"Created Plan ID: {plan_id}")
        
        print("\n--- 3. Testing GET Single Plan ---")
        res = make_request(f"{BASE_URL}/api/internal/creator/plans/{plan_id}", "GET", token=token)
        print(f"Get Single Status: {res['status']}")
        
        print("\n--- 4. Testing UPDATE Plan ---")
        update_data = {"name": "Test Plan Updated Lib", "monthly_price": 199.99}
        res = make_request(f"{BASE_URL}/api/internal/creator/plans/{plan_id}", "PUT", data=update_data, token=token)
        print(f"Update Status: {res['status']}")
        if res['status'] == 200:
            print(f"Updated Name: {res['body'].get('name')}")
            
        print("\n--- 5. Testing DELETE Plan ---")
        res = make_request(f"{BASE_URL}/api/internal/creator/plans/{plan_id}", "DELETE", token=token)
        print(f"Delete Status: {res['status']}")
        
        # Verify it's gone
        res = make_request(f"{BASE_URL}/api/internal/creator/plans/{plan_id}", "GET", token=token)
        print(f"Get Deleted Status: {res['status']}") # Should be 200 (if soft deleted and allowed) or 404
        
    else:
        print(f"Create Failed: {res['body']}")

if __name__ == "__main__":
    verify_plans_crud()
