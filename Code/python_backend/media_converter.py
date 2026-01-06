import sys
import os
import json
import subprocess
import shutil

def get_ffmpeg_path():
    # Check if ffmpeg is in PATH
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    
    # Check local folder (if bundled)
    local_ffmpeg = os.path.join(os.path.dirname(sys.executable), "ffmpeg.exe")
    if os.path.exists(local_ffmpeg):
        return local_ffmpeg
        
    return None

def convert_media(input_path, target_format):
    try:
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        ffmpeg_exe = get_ffmpeg_path()
        if not ffmpeg_exe:
            return {
                "success": False, 
                "error": "FFmpeg not found. Please install FFmpeg and add it to your PATH."
            }

        # Determine output path
        directory = os.path.dirname(input_path)
        filename = os.path.basename(input_path)
        name_without_ext = os.path.splitext(filename)[0]
        output_filename = f"{name_without_ext}.{target_format}"
        output_path = os.path.join(directory, output_filename)

        # If output exists, append timestamp or counter
        if os.path.exists(output_path):
            import time
            timestamp = int(time.time())
            output_filename = f"{name_without_ext}_{timestamp}.{target_format}"
            output_path = os.path.join(directory, output_filename)

        # Construct command
        # -y to overwrite (though we handle unique names above, just in case)
        # -i input
        # output
        
        cmd = [ffmpeg_exe, "-y", "-i", input_path]
        
        # Add specific flags based on format if needed
        if target_format == "mp3":
            cmd.extend(["-q:a", "0", "-map", "a"]) # Best quality audio, audio only
        elif target_format == "m4a":
            cmd.extend(["-c:a", "aac", "-b:a", "192k", "-map", "a"])
        elif target_format == "wav":
            cmd.extend(["-map", "a"])
            
        cmd.append(output_path)

        # Run conversion
        process = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True,
            encoding='utf-8',
            errors='replace' # Handle potential encoding issues in ffmpeg output
        )

        if process.returncode != 0:
            return {
                "success": False,
                "error": f"FFmpeg error: {process.stderr}"
            }

        return {
            "success": True,
            "output_path": output_path
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments: input_path target_format"}))
        sys.exit(1)
        
    input_path = sys.argv[1]
    target_format = sys.argv[2]
    
    result = convert_media(input_path, target_format)
    print(json.dumps(result))
