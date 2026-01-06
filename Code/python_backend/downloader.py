import sys
import os
import json
import subprocess

def download_spotify(url, output_dir):
    try:
        # Ensure output directory exists
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Run spot-dl
        # --output format to ensure we can predict filenames or just scan the dir after
        # spot-dl downloads to the current working directory by default or specified output
        
        # We will run spot-dl and capture the output to see what files were downloaded
        # Or simpler: list files before and after.
        
        # Determine spot-dl executable path
        # Try to find spot-dl in the same directory as the python executable (venv/Scripts)
        spotdl_exe = os.path.join(os.path.dirname(sys.executable), "spot-dl.exe" if sys.platform == "win32" else "spot-dl")
        
        if not os.path.exists(spotdl_exe):
             # Fallback to just "spot-dl" and hope it's in PATH
             spotdl_exe = "spot-dl"

        cmd = [
            spotdl_exe,
            url,
            "--output",
            os.path.join(output_dir, "{artist} - {title}.{ext}")
        ]
        
        # Run the command
        process = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # For now, since spot-dl doesn't easily output a JSON list of downloaded files,
        # we might need to rely on scanning the directory. 
        # However, since we are passing a specific output dir for this batch, 
        # we can just list all files in that dir.
        
        files = []
        for root, dirs, filenames in os.walk(output_dir):
            for filename in filenames:
                if filename.endswith(('.mp3', '.wav', '.flac', '.m4a', '.ogg')):
                    files.append(os.path.join(root, filename))
                    
        print(json.dumps({"success": True, "files": files}))
        
    except subprocess.CalledProcessError as e:
        print(json.dumps({"success": False, "error": str(e), "stderr": e.stderr}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments: url output_dir"}))
        sys.exit(1)
        
    url = sys.argv[1]
    output_dir = sys.argv[2]
    
    download_spotify(url, output_dir)
