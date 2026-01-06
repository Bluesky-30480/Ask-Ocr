"""
Media Helper - FFmpeg-powered media operations
Based on FFmpegFreeUI functionality, reimplemented in Python + Tauri

Features:
- Media Conversion (audio/video format conversion)
- Muxing (combine video/audio/subtitle streams)
- Merging (concatenate multiple files)
- Media Info extraction
- Audio extraction from video
- Video compression
"""

import sys
import os
import json
import subprocess
import shutil
import re
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
from pathlib import Path
import time


def get_ffmpeg_path() -> Optional[str]:
    """Get FFmpeg executable path"""
    # Check PATH
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    
    # Check local folder
    local_ffmpeg = os.path.join(os.path.dirname(sys.executable), "ffmpeg.exe")
    if os.path.exists(local_ffmpeg):
        return local_ffmpeg
    
    return None


def get_ffprobe_path() -> Optional[str]:
    """Get FFprobe executable path"""
    if shutil.which("ffprobe"):
        return "ffprobe"
    
    local_ffprobe = os.path.join(os.path.dirname(sys.executable), "ffprobe.exe")
    if os.path.exists(local_ffprobe):
        return local_ffprobe
    
    return None


def run_command(cmd: List[str], capture_output: bool = True) -> Dict[str, Any]:
    """Execute a command and return result"""
    try:
        if capture_output:
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            return {
                "success": process.returncode == 0,
                "stdout": process.stdout,
                "stderr": process.stderr,
                "returncode": process.returncode
            }
        else:
            process = subprocess.Popen(
                cmd,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            process.wait()
            return {
                "success": process.returncode == 0,
                "returncode": process.returncode
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def get_unique_output_path(base_path: str) -> str:
    """Generate unique output path if file exists"""
    if not os.path.exists(base_path):
        return base_path
    
    directory = os.path.dirname(base_path)
    filename = os.path.basename(base_path)
    name, ext = os.path.splitext(filename)
    
    counter = 1
    while True:
        new_path = os.path.join(directory, f"{name}_{counter}{ext}")
        if not os.path.exists(new_path):
            return new_path
        counter += 1


# =============================================================================
# MEDIA INFO
# =============================================================================

def get_media_info(file_path: str) -> Dict[str, Any]:
    """Get detailed media information using ffprobe"""
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File not found: {file_path}"}
        
        ffprobe = get_ffprobe_path()
        if not ffprobe:
            return {"success": False, "error": "FFprobe not found"}
        
        cmd = [
            ffprobe, "-v", "quiet", "-print_format", "json",
            "-show_format", "-show_streams", file_path
        ]
        
        result = run_command(cmd)
        
        if result["success"]:
            info = json.loads(result["stdout"])
            
            # Parse streams
            streams = {
                "video": [],
                "audio": [],
                "subtitle": []
            }
            
            for stream in info.get("streams", []):
                codec_type = stream.get("codec_type", "")
                stream_info = {
                    "index": stream.get("index"),
                    "codec_name": stream.get("codec_name", "unknown"),
                    "codec_long_name": stream.get("codec_long_name", ""),
                }
                
                if codec_type == "video":
                    stream_info.update({
                        "width": stream.get("width"),
                        "height": stream.get("height"),
                        "fps": eval(stream.get("r_frame_rate", "0/1")) if "/" in str(stream.get("r_frame_rate", "0")) else 0,
                        "pix_fmt": stream.get("pix_fmt"),
                        "bit_rate": stream.get("bit_rate"),
                        "duration": stream.get("duration"),
                    })
                    streams["video"].append(stream_info)
                    
                elif codec_type == "audio":
                    stream_info.update({
                        "sample_rate": stream.get("sample_rate"),
                        "channels": stream.get("channels"),
                        "channel_layout": stream.get("channel_layout"),
                        "bit_rate": stream.get("bit_rate"),
                        "duration": stream.get("duration"),
                    })
                    streams["audio"].append(stream_info)
                    
                elif codec_type == "subtitle":
                    stream_info.update({
                        "language": stream.get("tags", {}).get("language", "und"),
                        "title": stream.get("tags", {}).get("title", ""),
                    })
                    streams["subtitle"].append(stream_info)
            
            # Format info
            format_info = info.get("format", {})
            
            return {
                "success": True,
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "file_size": int(format_info.get("size", 0)),
                "duration": float(format_info.get("duration", 0)),
                "bit_rate": int(format_info.get("bit_rate", 0)),
                "format_name": format_info.get("format_name", ""),
                "format_long_name": format_info.get("format_long_name", ""),
                "streams": streams,
                "tags": format_info.get("tags", {}),
            }
        else:
            return {"success": False, "error": result.get("stderr", "Unknown error")}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# MEDIA CONVERSION
# =============================================================================

def convert_media(input_path: str, target_format: str, options: Optional[Dict] = None) -> Dict[str, Any]:
    """Convert media file to different format"""
    try:
        if not os.path.exists(input_path):
            return {"success": False, "error": f"Input file not found: {input_path}"}
        
        ffmpeg = get_ffmpeg_path()
        if not ffmpeg:
            return {"success": False, "error": "FFmpeg not found"}
        
        options = options or {}
        
        # Determine output path
        directory = os.path.dirname(input_path)
        filename = os.path.basename(input_path)
        name_without_ext = os.path.splitext(filename)[0]
        output_path = get_unique_output_path(os.path.join(directory, f"{name_without_ext}.{target_format}"))
        
        # Build command
        cmd = [ffmpeg, "-y", "-i", input_path]
        
        # Audio formats
        if target_format == "mp3":
            quality = options.get("quality", 0)  # 0 = best
            cmd.extend(["-q:a", str(quality), "-map", "a"])
            
        elif target_format == "m4a":
            bitrate = options.get("bitrate", "192k")
            cmd.extend(["-c:a", "aac", "-b:a", bitrate, "-map", "a"])
            
        elif target_format == "wav":
            cmd.extend(["-map", "a"])
            
        elif target_format == "flac":
            cmd.extend(["-c:a", "flac", "-map", "a"])
            
        elif target_format == "ogg":
            quality = options.get("quality", 6)
            cmd.extend(["-c:a", "libvorbis", "-q:a", str(quality), "-map", "a"])
            
        # Video formats
        elif target_format == "mp4":
            video_codec = options.get("video_codec", "libx264")
            crf = options.get("crf", 23)
            preset = options.get("preset", "medium")
            cmd.extend([
                "-c:v", video_codec,
                "-crf", str(crf),
                "-preset", preset,
                "-c:a", "aac",
                "-b:a", "192k"
            ])
            
        elif target_format == "mkv":
            video_codec = options.get("video_codec", "libx264")
            crf = options.get("crf", 23)
            cmd.extend([
                "-c:v", video_codec,
                "-crf", str(crf),
                "-c:a", "copy"
            ])
            
        elif target_format == "webm":
            crf = options.get("crf", 30)
            cmd.extend([
                "-c:v", "libvpx-vp9",
                "-crf", str(crf),
                "-b:v", "0",
                "-c:a", "libopus"
            ])
            
        elif target_format == "gif":
            fps = options.get("fps", 15)
            scale = options.get("scale", 480)
            cmd.extend([
                "-vf", f"fps={fps},scale={scale}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
                "-loop", "0"
            ])
            
        cmd.append(output_path)
        
        result = run_command(cmd)
        
        if result["success"] and os.path.exists(output_path):
            return {
                "success": True,
                "output_path": output_path,
                "file_size": os.path.getsize(output_path)
            }
        else:
            return {"success": False, "error": result.get("stderr", "Conversion failed")}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# MUXING (Combine streams from different files)
# =============================================================================

def mux_streams(
    video_file: Optional[str],
    audio_files: List[str],
    subtitle_files: List[str],
    output_path: str,
    options: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Mux video, audio, and subtitle streams into a single file
    Based on FFmpegFreeUI's 界面_混流.vb
    """
    try:
        ffmpeg = get_ffmpeg_path()
        if not ffmpeg:
            return {"success": False, "error": "FFmpeg not found"}
        
        options = options or {}
        
        # Validate inputs
        if video_file and not os.path.exists(video_file):
            return {"success": False, "error": f"Video file not found: {video_file}"}
        
        for af in audio_files:
            if not os.path.exists(af):
                return {"success": False, "error": f"Audio file not found: {af}"}
        
        for sf in subtitle_files:
            if not os.path.exists(sf):
                return {"success": False, "error": f"Subtitle file not found: {sf}"}
        
        # Build command
        cmd = [ffmpeg, "-y"]
        
        # Add input files
        if video_file:
            cmd.extend(["-i", video_file])
        
        for af in audio_files:
            cmd.extend(["-i", af])
        
        for sf in subtitle_files:
            cmd.extend(["-i", sf])
        
        # Map streams
        input_index = 0
        
        if video_file:
            cmd.extend(["-map", f"{input_index}:v"])
            input_index += 1
        
        for i, _ in enumerate(audio_files):
            cmd.extend(["-map", f"{input_index}:a"])
            input_index += 1
        
        for i, _ in enumerate(subtitle_files):
            cmd.extend(["-map", f"{input_index}:s"])
            input_index += 1
        
        # Codec options
        if video_file:
            video_codec = options.get("video_codec", "copy")
            cmd.extend(["-c:v", video_codec])
        
        audio_codec = options.get("audio_codec", "copy")
        cmd.extend(["-c:a", audio_codec])
        
        if subtitle_files:
            sub_codec = options.get("subtitle_codec", "copy")
            cmd.extend(["-c:s", sub_codec])
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        output_path = get_unique_output_path(output_path)
        
        cmd.append(output_path)
        
        result = run_command(cmd)
        
        if result["success"] and os.path.exists(output_path):
            return {
                "success": True,
                "output_path": output_path,
                "file_size": os.path.getsize(output_path)
            }
        else:
            return {"success": False, "error": result.get("stderr", "Muxing failed")}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# MERGING (Concatenate files)
# =============================================================================

def merge_files(input_files: List[str], output_path: str, options: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Merge/concatenate multiple media files
    Based on FFmpegFreeUI's 界面_合并.vb using concat demuxer
    """
    try:
        if len(input_files) < 2:
            return {"success": False, "error": "Need at least 2 files to merge"}
        
        for f in input_files:
            if not os.path.exists(f):
                return {"success": False, "error": f"File not found: {f}"}
        
        ffmpeg = get_ffmpeg_path()
        if not ffmpeg:
            return {"success": False, "error": "FFmpeg not found"}
        
        options = options or {}
        
        # Create concat list file
        temp_dir = os.path.dirname(output_path) or "."
        concat_file = os.path.join(temp_dir, f"concat_list_{int(time.time())}.txt")
        
        try:
            with open(concat_file, "w", encoding="utf-8") as f:
                for input_file in input_files:
                    # Escape special characters for concat demuxer
                    escaped_path = input_file.replace("\\", "/").replace("'", "'\\''")
                    f.write(f"file '{escaped_path}'\n")
            
            # Build command
            cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", concat_file]
            
            # Codec options
            video_codec = options.get("video_codec", "copy")
            audio_codec = options.get("audio_codec", "copy")
            
            cmd.extend(["-c:v", video_codec, "-c:a", audio_codec])
            
            output_path = get_unique_output_path(output_path)
            cmd.append(output_path)
            
            result = run_command(cmd)
            
            if result["success"] and os.path.exists(output_path):
                return {
                    "success": True,
                    "output_path": output_path,
                    "file_size": os.path.getsize(output_path),
                    "merged_count": len(input_files)
                }
            else:
                return {"success": False, "error": result.get("stderr", "Merge failed")}
                
        finally:
            # Clean up concat file
            if os.path.exists(concat_file):
                os.remove(concat_file)
                
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# EXTRACT AUDIO
# =============================================================================

def extract_audio(input_path: str, output_format: str = "mp3", options: Optional[Dict] = None) -> Dict[str, Any]:
    """Extract audio track from video file"""
    try:
        if not os.path.exists(input_path):
            return {"success": False, "error": f"Input file not found: {input_path}"}
        
        ffmpeg = get_ffmpeg_path()
        if not ffmpeg:
            return {"success": False, "error": "FFmpeg not found"}
        
        options = options or {}
        
        # Determine output path
        directory = os.path.dirname(input_path)
        filename = os.path.basename(input_path)
        name_without_ext = os.path.splitext(filename)[0]
        output_path = get_unique_output_path(os.path.join(directory, f"{name_without_ext}_audio.{output_format}"))
        
        # Build command
        cmd = [ffmpeg, "-y", "-i", input_path, "-vn"]  # -vn = no video
        
        # Audio stream selection
        audio_stream = options.get("audio_stream", 0)
        cmd.extend(["-map", f"0:a:{audio_stream}"])
        
        if output_format == "mp3":
            quality = options.get("quality", 0)
            cmd.extend(["-q:a", str(quality)])
        elif output_format == "m4a":
            bitrate = options.get("bitrate", "192k")
            cmd.extend(["-c:a", "aac", "-b:a", bitrate])
        elif output_format == "flac":
            cmd.extend(["-c:a", "flac"])
        elif output_format == "wav":
            pass  # Default PCM
        else:
            cmd.extend(["-c:a", "copy"])
        
        cmd.append(output_path)
        
        result = run_command(cmd)
        
        if result["success"] and os.path.exists(output_path):
            return {
                "success": True,
                "output_path": output_path,
                "file_size": os.path.getsize(output_path)
            }
        else:
            return {"success": False, "error": result.get("stderr", "Audio extraction failed")}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# VIDEO COMPRESSION
# =============================================================================

def compress_video(
    input_path: str,
    output_path: Optional[str] = None,
    target_size_mb: Optional[float] = None,
    crf: int = 28,
    preset: str = "medium",
    resolution: Optional[str] = None
) -> Dict[str, Any]:
    """Compress video with various options"""
    try:
        if not os.path.exists(input_path):
            return {"success": False, "error": f"Input file not found: {input_path}"}
        
        ffmpeg = get_ffmpeg_path()
        if not ffmpeg:
            return {"success": False, "error": "FFmpeg not found"}
        
        # Determine output path
        if not output_path:
            directory = os.path.dirname(input_path)
            filename = os.path.basename(input_path)
            name_without_ext = os.path.splitext(filename)[0]
            ext = os.path.splitext(filename)[1]
            output_path = os.path.join(directory, f"{name_without_ext}_compressed{ext}")
        
        output_path = get_unique_output_path(output_path)
        
        # Build command
        cmd = [ffmpeg, "-y", "-i", input_path]
        
        # Video filters
        vf_filters = []
        if resolution:
            vf_filters.append(f"scale={resolution}")
        
        if vf_filters:
            cmd.extend(["-vf", ",".join(vf_filters)])
        
        # Codec settings
        cmd.extend([
            "-c:v", "libx264",
            "-crf", str(crf),
            "-preset", preset,
            "-c:a", "aac",
            "-b:a", "128k"
        ])
        
        # Target size calculation (two-pass)
        if target_size_mb:
            # Get video duration
            info = get_media_info(input_path)
            if info["success"]:
                duration = info["duration"]
                if duration > 0:
                    target_bits = target_size_mb * 8 * 1024 * 1024
                    audio_bits = 128 * 1000 * duration
                    video_bitrate = int((target_bits - audio_bits) / duration)
                    if video_bitrate > 0:
                        cmd = [ffmpeg, "-y", "-i", input_path]
                        if vf_filters:
                            cmd.extend(["-vf", ",".join(vf_filters)])
                        cmd.extend([
                            "-c:v", "libx264",
                            "-b:v", str(video_bitrate),
                            "-preset", preset,
                            "-c:a", "aac",
                            "-b:a", "128k"
                        ])
        
        cmd.append(output_path)
        
        result = run_command(cmd)
        
        if result["success"] and os.path.exists(output_path):
            original_size = os.path.getsize(input_path)
            compressed_size = os.path.getsize(output_path)
            
            return {
                "success": True,
                "output_path": output_path,
                "original_size": original_size,
                "compressed_size": compressed_size,
                "compression_ratio": round(compressed_size / original_size * 100, 2)
            }
        else:
            return {"success": False, "error": result.get("stderr", "Compression failed")}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# TRIM/CUT VIDEO
# =============================================================================

def trim_video(
    input_path: str,
    start_time: str,
    end_time: Optional[str] = None,
    duration: Optional[str] = None,
    output_path: Optional[str] = None
) -> Dict[str, Any]:
    """Trim video to specific time range"""
    try:
        if not os.path.exists(input_path):
            return {"success": False, "error": f"Input file not found: {input_path}"}
        
        ffmpeg = get_ffmpeg_path()
        if not ffmpeg:
            return {"success": False, "error": "FFmpeg not found"}
        
        if not end_time and not duration:
            return {"success": False, "error": "Either end_time or duration must be specified"}
        
        # Determine output path
        if not output_path:
            directory = os.path.dirname(input_path)
            filename = os.path.basename(input_path)
            name_without_ext = os.path.splitext(filename)[0]
            ext = os.path.splitext(filename)[1]
            output_path = os.path.join(directory, f"{name_without_ext}_trimmed{ext}")
        
        output_path = get_unique_output_path(output_path)
        
        # Build command
        cmd = [ffmpeg, "-y", "-ss", start_time, "-i", input_path]
        
        if end_time:
            cmd.extend(["-to", end_time])
        elif duration:
            cmd.extend(["-t", duration])
        
        cmd.extend(["-c", "copy"])  # Stream copy for fast trimming
        cmd.append(output_path)
        
        result = run_command(cmd)
        
        if result["success"] and os.path.exists(output_path):
            return {
                "success": True,
                "output_path": output_path,
                "file_size": os.path.getsize(output_path)
            }
        else:
            return {"success": False, "error": result.get("stderr", "Trim failed")}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# BATCH OPERATIONS
# =============================================================================

def batch_convert(
    input_files: List[str],
    target_format: str,
    output_dir: Optional[str] = None,
    options: Optional[Dict] = None
) -> Dict[str, Any]:
    """Convert multiple files"""
    results = []
    success_count = 0
    fail_count = 0
    
    for input_file in input_files:
        if output_dir:
            filename = os.path.basename(input_file)
            name_without_ext = os.path.splitext(filename)[0]
            # Create options with custom output
            file_options = (options or {}).copy()
        
        result = convert_media(input_file, target_format, options)
        results.append({
            "input": input_file,
            "result": result
        })
        
        if result["success"]:
            success_count += 1
        else:
            fail_count += 1
    
    return {
        "success": fail_count == 0,
        "total": len(input_files),
        "success_count": success_count,
        "fail_count": fail_count,
        "results": results
    }


# =============================================================================
# COMMAND LINE INTERFACE
# =============================================================================

def main():
    """CLI interface for the media helper"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: media_helper.py <command> [args...]"
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "info":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Missing file path"}))
                sys.exit(1)
            result = get_media_info(sys.argv[2])
            
        elif command == "convert":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "error": "Usage: convert <input> <format> [options_json]"}))
                sys.exit(1)
            options = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
            result = convert_media(sys.argv[2], sys.argv[3], options)
            
        elif command == "mux":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Usage: mux <params_json>"}))
                sys.exit(1)
            params = json.loads(sys.argv[2])
            result = mux_streams(
                params.get("video_file"),
                params.get("audio_files", []),
                params.get("subtitle_files", []),
                params["output_path"],
                params.get("options")
            )
            
        elif command == "merge":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "error": "Usage: merge <output_path> <files_json> [options_json]"}))
                sys.exit(1)
            files = json.loads(sys.argv[3])
            options = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
            result = merge_files(files, sys.argv[2], options)
            
        elif command == "extract-audio":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Usage: extract-audio <input> [format] [options_json]"}))
                sys.exit(1)
            fmt = sys.argv[3] if len(sys.argv) > 3 else "mp3"
            options = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
            result = extract_audio(sys.argv[2], fmt, options)
            
        elif command == "compress":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Usage: compress <input> [crf] [preset] [resolution]"}))
                sys.exit(1)
            crf = int(sys.argv[3]) if len(sys.argv) > 3 else 28
            preset = sys.argv[4] if len(sys.argv) > 4 else "medium"
            resolution = sys.argv[5] if len(sys.argv) > 5 else None
            result = compress_video(sys.argv[2], crf=crf, preset=preset, resolution=resolution)
            
        elif command == "trim":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "error": "Usage: trim <input> <start> [end|duration]"}))
                sys.exit(1)
            end_time = sys.argv[4] if len(sys.argv) > 4 else None
            result = trim_video(sys.argv[2], sys.argv[3], end_time=end_time)
            
        elif command == "batch-convert":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "error": "Usage: batch-convert <format> <files_json> [options_json]"}))
                sys.exit(1)
            files = json.loads(sys.argv[3])
            options = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
            result = batch_convert(files, sys.argv[2], options=options)
            
        else:
            result = {"success": False, "error": f"Unknown command: {command}"}
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
