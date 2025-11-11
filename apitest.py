#!/usr/bin/env python3
"""
Simple Gemini API Test Script
Tests the Google Gemini API connection and basic functionality
"""

import os
import sys
import json
from datetime import datetime

try:
    import google.generativeai as genai
except ImportError:
    print("Error: google-generativeai package not installed.")
    print("Install it with: pip install google-generativeai")
    sys.exit(1)


def get_api_key():
    """Get API key from environment variable"""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        print("Set it with: export GEMINI_API_KEY='your-api-key-here'")
        sys.exit(1)
    return api_key


def test_connection(api_key, model_name='gemini-2.5-pro'):
    """Test basic API connection"""
    print(f"\n{'='*60}")
    print(f"Testing Gemini API Connection")
    print(f"{'='*60}")
    print(f"Model: {model_name}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    try:
        # Configure the API
        genai.configure(api_key=api_key)
        
        # Get the model
        model = genai.GenerativeModel(model_name)
        
        # Simple test request
        test_prompt = "Say 'Hello, API test successful!' and nothing else."
        print(f"Test Prompt: {test_prompt}\n")
        
        print("Sending request to Gemini API...")
        response = model.generate_content(test_prompt)
        
        if response and response.text:
            print(f"✅ SUCCESS!\n")
            print(f"Response:")
            print(f"{'-'*60}")
            print(response.text)
            print(f"{'-'*60}\n")
            return True
        else:
            print("❌ FAILED: Empty response received")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}\n")
        print(f"Error Type: {type(e).__name__}")
        if hasattr(e, '__dict__'):
            print(f"Error Details: {json.dumps(e.__dict__, indent=2, default=str)}")
        return False


def test_complex_request(api_key, model_name='gemini-2.5-pro'):
    """Test a more complex request"""
    print(f"\n{'='*60}")
    print(f"Testing Complex Request")
    print(f"{'='*60}\n")
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        
        complex_prompt = """
        Explain the concept of recursion in programming in 2-3 sentences.
        Provide a simple example.
        """
        
        print(f"Complex Prompt: {complex_prompt.strip()}\n")
        print("Sending request...")
        
        response = model.generate_content(complex_prompt)
        
        if response and response.text:
            print(f"✅ SUCCESS!\n")
            print(f"Response:")
            print(f"{'-'*60}")
            print(response.text)
            print(f"{'-'*60}\n")
            return True
        else:
            print("❌ FAILED: Empty response")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


def test_with_config(api_key, model_name='gemini-2.5-pro'):
    """Test with custom generation config"""
    print(f"\n{'='*60}")
    print(f"Testing with Custom Config")
    print(f"{'='*60}\n")
    
    try:
        genai.configure(api_key=api_key)
        
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 1024,
        }
        
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config
        )
        
        prompt = "Write a haiku about programming."
        print(f"Prompt: {prompt}\n")
        print("Sending request with custom config...")
        
        response = model.generate_content(prompt)
        
        if response and response.text:
            print(f"✅ SUCCESS!\n")
            print(f"Response:")
            print(f"{'-'*60}")
            print(response.text)
            print(f"{'-'*60}\n")
            return True
        else:
            print("❌ FAILED: Empty response")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


def main():
    """Main test function"""
    print("\n" + "="*60)
    print("Gemini API Test Script")
    print("="*60)
    
    # Get API key
    api_key = get_api_key()
    print(f"✅ API Key found (length: {len(api_key)})\n")
    
    # Model name (can be changed)
    model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-pro')
    
    # Run tests
    results = []
    
    # Test 1: Basic connection
    results.append(("Basic Connection", test_connection(api_key, model_name)))
    
    # Test 2: Complex request
    results.append(("Complex Request", test_complex_request(api_key, model_name)))
    
    # Test 3: Custom config
    results.append(("Custom Config", test_with_config(api_key, model_name)))
    
    # Summary
    print(f"\n{'='*60}")
    print("Test Summary")
    print(f"{'='*60}")
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:20} : {status}")
    print(f"{'='*60}\n")
    
    # Exit code
    all_passed = all(result for _, result in results)
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()

