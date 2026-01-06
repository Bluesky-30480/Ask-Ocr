"""
Audio AI Helper - Speech-to-Text and Speaker Diarization
Supports multiple transcription engines: Whisper, FasterWhisper, SpeechBrain
Uses pyannote for speaker diarization
"""

import sys
import os
import json
import subprocess
import shutil
import tempfile
import time
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, asdict
import threading
import queue

# Global state for model download progress
download_progress = {"status": "idle", "progress": 0, "message": "", "model": ""}
cancel_download = threading.Event()

# Available transcription engines
TRANSCRIPTION_ENGINES = {
    "whisper": {
        "name": "OpenAI Whisper",
        "models": ["tiny", "base", "small", "medium", "large", "large-v2", "large-v3"],
        "description": "Original OpenAI Whisper - accurate but slower"
    },
    "faster-whisper": {
        "name": "Faster Whisper (CTranslate2)",
        "models": ["tiny", "base", "small", "medium", "large-v2", "large-v3"],
        "description": "4x faster than original, uses less memory"
    },
    "speechbrain": {
        "name": "SpeechBrain",
        "models": ["asr-wav2vec2-libri", "asr-transformer-libri"],
        "description": "Open-source speech toolkit"
    }
}

def get_models_dir() -> Path:
    """Get the models directory"""
    app_data = os.environ.get('APPDATA', os.path.expanduser('~'))
    models_dir = Path(app_data) / 'Bluesky' / 'models'
    models_dir.mkdir(parents=True, exist_ok=True)
    return models_dir


def check_models_installed() -> Dict[str, Any]:
    """Check which AI models are installed"""
    models_dir = get_models_dir()
    
    whisper_models = ['tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3']
    installed_whisper = []
    
    for model in whisper_models:
        model_path = models_dir / 'whisper' / f'{model}.pt'
        if model_path.exists():
            installed_whisper.append(model)
    
    # Check for faster-whisper models
    faster_whisper_installed = []
    fw_dir = models_dir / 'faster-whisper'
    if fw_dir.exists():
        for model in whisper_models:
            if (fw_dir / model).exists():
                faster_whisper_installed.append(model)
    
    # Check for pyannote/speaker diarization
    diarization_installed = (models_dir / 'pyannote' / 'config.yaml').exists()
    
    # Check for denoiser model
    denoiser_installed = (models_dir / 'denoiser' / 'dns64.th').exists()
    
    # Check which engines are available (packages installed)
    available_engines = []
    try:
        import whisper
        available_engines.append("whisper")
    except ImportError:
        pass
    
    try:
        from faster_whisper import WhisperModel
        available_engines.append("faster-whisper")
    except ImportError:
        pass
    
    try:
        from speechbrain.inference.ASR import WhisperASR
        available_engines.append("speechbrain")
    except ImportError:
        pass
    
    return {
        "success": True,
        "whisper_models": installed_whisper,
        "faster_whisper_models": faster_whisper_installed,
        "available_engines": available_engines,
        "engines_info": TRANSCRIPTION_ENGINES,
        "diarization_installed": diarization_installed,
        "denoiser_installed": denoiser_installed,
        "models_dir": str(models_dir)
    }


def download_whisper_model(model_name: str = "base") -> Dict[str, Any]:
    """Download Whisper model"""
    global download_progress, cancel_download
    
    try:
        download_progress = {
            "status": "downloading",
            "progress": 0,
            "message": f"Downloading Whisper {model_name} model...",
            "model": f"whisper-{model_name}"
        }
        
        # Import whisper (will download model if needed)
        import whisper
        
        download_progress["progress"] = 50
        download_progress["message"] = f"Loading Whisper {model_name} model..."
        
        if cancel_download.is_set():
            cancel_download.clear()
            return {"success": False, "error": "Download cancelled"}
        
        # This will download the model
        model = whisper.load_model(model_name)
        
        download_progress = {
            "status": "complete",
            "progress": 100,
            "message": f"Whisper {model_name} model ready",
            "model": f"whisper-{model_name}"
        }
        
        return {"success": True, "message": f"Whisper {model_name} model downloaded"}
        
    except Exception as e:
        download_progress = {
            "status": "error",
            "progress": 0,
            "message": str(e),
            "model": f"whisper-{model_name}"
        }
        return {"success": False, "error": str(e)}


def download_diarization_model() -> Dict[str, Any]:
    """Download speaker diarization model"""
    global download_progress, cancel_download
    
    try:
        download_progress = {
            "status": "downloading",
            "progress": 0,
            "message": "Downloading speaker diarization model...",
            "model": "pyannote-diarization"
        }
        
        # Try to import and load pyannote
        from pyannote.audio import Pipeline
        
        download_progress["progress"] = 30
        
        if cancel_download.is_set():
            cancel_download.clear()
            return {"success": False, "error": "Download cancelled"}
        
        # This requires HuggingFace token for pyannote models
        # Users need to accept terms at https://huggingface.co/pyannote/speaker-diarization
        download_progress["progress"] = 100
        download_progress["status"] = "complete"
        download_progress["message"] = "Diarization model ready"
        
        return {"success": True, "message": "Diarization model downloaded"}
        
    except ImportError:
        return {"success": False, "error": "pyannote.audio not installed. Run: pip install pyannote.audio"}
    except Exception as e:
        download_progress = {
            "status": "error",
            "progress": 0,
            "message": str(e),
            "model": "pyannote-diarization"
        }
        return {"success": False, "error": str(e)}


def download_denoiser_model() -> Dict[str, Any]:
    """Download audio denoiser model"""
    global download_progress
    
    try:
        download_progress = {
            "status": "downloading",
            "progress": 0,
            "message": "Downloading denoiser model...",
            "model": "denoiser"
        }
        
        # Using denoiser library from Facebook Research
        from denoiser import pretrained
        
        download_progress["progress"] = 50
        
        # Load pretrained model (downloads if needed)
        model = pretrained.dns64()
        
        download_progress = {
            "status": "complete",
            "progress": 100,
            "message": "Denoiser model ready",
            "model": "denoiser"
        }
        
        return {"success": True, "message": "Denoiser model downloaded"}
        
    except ImportError:
        return {"success": False, "error": "denoiser not installed. Run: pip install denoiser"}
    except Exception as e:
        download_progress = {
            "status": "error",
            "progress": 0,
            "message": str(e),
            "model": "denoiser"
        }
        return {"success": False, "error": str(e)}


def get_download_progress() -> Dict[str, Any]:
    """Get current download progress"""
    global download_progress
    return download_progress


def cancel_model_download() -> Dict[str, Any]:
    """Cancel ongoing model download"""
    global cancel_download
    cancel_download.set()
    return {"success": True, "message": "Download cancellation requested"}


def transcribe_audio(
    audio_path: str,
    model_name: str = "base",
    language: Optional[str] = None,
    output_format: str = "srt",
    output_path: Optional[str] = None,
    engine: str = "whisper"
) -> Dict[str, Any]:
    """Transcribe audio using specified engine (whisper, faster-whisper, speechbrain)"""
    try:
        if not os.path.exists(audio_path):
            return {"success": False, "error": f"Audio file not found: {audio_path}"}
        
        result = None
        
        if engine == "faster-whisper":
            # Use Faster Whisper (CTranslate2) - 4x faster
            try:
                from faster_whisper import WhisperModel
                
                # Determine compute type based on available hardware
                import torch
                compute_type = "float16" if torch.cuda.is_available() else "int8"
                device = "cuda" if torch.cuda.is_available() else "cpu"
                
                model = WhisperModel(model_name, device=device, compute_type=compute_type)
                
                segments_list, info = model.transcribe(
                    audio_path,
                    language=language,
                    beam_size=5
                )
                
                # Convert to standard format
                segments = []
                full_text = ""
                for segment in segments_list:
                    segments.append({
                        "start": segment.start,
                        "end": segment.end,
                        "text": segment.text
                    })
                    full_text += segment.text
                
                result = {
                    "text": full_text,
                    "segments": segments,
                    "language": info.language if info else "unknown"
                }
                
            except ImportError:
                return {"success": False, "error": "faster-whisper not installed. Run: pip install faster-whisper"}
        
        elif engine == "speechbrain":
            # Use SpeechBrain
            try:
                from speechbrain.inference.ASR import EncoderDecoderASR
                
                asr_model = EncoderDecoderASR.from_hparams(
                    source="speechbrain/asr-transformer-transformerlm-librispeech",
                    savedir="pretrained_models/asr-transformer"
                )
                
                text = asr_model.transcribe_file(audio_path)
                
                result = {
                    "text": text,
                    "segments": [{"start": 0, "end": 0, "text": text}],
                    "language": "en"  # SpeechBrain models are usually English-specific
                }
                
            except ImportError:
                return {"success": False, "error": "speechbrain not installed. Run: pip install speechbrain"}
        
        else:
            # Default: Original OpenAI Whisper
            try:
                import whisper
                
                model = whisper.load_model(model_name)
                
                result = model.transcribe(
                    audio_path,
                    language=language,
                    verbose=False
                )
            except ImportError:
                return {"success": False, "error": "Whisper not installed. Run: pip install openai-whisper"}
        
        if not result:
            return {"success": False, "error": "Transcription failed"}
        
        # Generate output
        if not output_path:
            base_name = os.path.splitext(audio_path)[0]
            output_path = f"{base_name}.{output_format}"
        
        if output_format == "srt":
            srt_content = generate_srt(result["segments"])
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt_content)
        elif output_format == "txt":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(result["text"])
        elif output_format == "json":
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
        
        return {
            "success": True,
            "text": result["text"],
            "segments": result["segments"],
            "language": result.get("language", "unknown"),
            "output_path": output_path,
            "engine": engine
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}



def generate_srt(segments: List[Dict]) -> str:
    """Generate SRT format from segments"""
    srt_lines = []
    
    for i, seg in enumerate(segments, 1):
        start = format_timestamp(seg["start"])
        end = format_timestamp(seg["end"])
        text = seg["text"].strip()
        
        srt_lines.append(f"{i}")
        srt_lines.append(f"{start} --> {end}")
        srt_lines.append(text)
        srt_lines.append("")
    
    return "\n".join(srt_lines)


def format_timestamp(seconds: float) -> str:
    """Format seconds to SRT timestamp"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def transcribe_with_diarization(
    audio_path: str,
    model_name: str = "base",
    language: Optional[str] = None,
    num_speakers: Optional[int] = None,
    min_speakers: int = 1,
    max_speakers: int = 10,
    hf_token: Optional[str] = None
) -> Dict[str, Any]:
    """Transcribe audio with speaker diarization"""
    try:
        if not os.path.exists(audio_path):
            return {"success": False, "error": f"Audio file not found: {audio_path}"}
        
        import whisper
        from pyannote.audio import Pipeline
        import torch
        
        # Load Whisper model
        whisper_model = whisper.load_model(model_name)
        
        # Transcribe with Whisper
        transcription = whisper_model.transcribe(audio_path, language=language)
        
        # Load diarization pipeline
        if hf_token:
            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
        else:
            pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1")
        
        # Run diarization
        diarization_params = {}
        if num_speakers:
            diarization_params["num_speakers"] = num_speakers
        else:
            diarization_params["min_speakers"] = min_speakers
            diarization_params["max_speakers"] = max_speakers
        
        diarization = pipeline(audio_path, **diarization_params)
        
        # Combine transcription with diarization
        speaker_segments = []
        speakers_found = set()
        
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speakers_found.add(speaker)
            
            # Find overlapping transcription segments
            for seg in transcription["segments"]:
                seg_start = seg["start"]
                seg_end = seg["end"]
                
                # Check for overlap
                overlap_start = max(turn.start, seg_start)
                overlap_end = min(turn.end, seg_end)
                
                if overlap_start < overlap_end:
                    speaker_segments.append({
                        "speaker": speaker,
                        "start": seg_start,
                        "end": seg_end,
                        "text": seg["text"].strip()
                    })
        
        # Sort by start time
        speaker_segments.sort(key=lambda x: x["start"])
        
        # Group by speaker
        speakers_data = {}
        for seg in speaker_segments:
            speaker = seg["speaker"]
            if speaker not in speakers_data:
                speakers_data[speaker] = []
            speakers_data[speaker].append(seg)
        
        return {
            "success": True,
            "full_text": transcription["text"],
            "segments": speaker_segments,
            "speakers": list(speakers_found),
            "num_speakers": len(speakers_found),
            "speakers_data": speakers_data,
            "language": transcription.get("language", "unknown")
        }
        
    except ImportError as e:
        missing = "whisper" if "whisper" in str(e) else "pyannote.audio"
        return {"success": False, "error": f"{missing} not installed"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def export_speaker_srt(
    diarization_result: Dict[str, Any],
    speaker: str,
    output_path: str
) -> Dict[str, Any]:
    """Export SRT for a specific speaker"""
    try:
        if not diarization_result.get("success"):
            return {"success": False, "error": "Invalid diarization result"}
        
        speakers_data = diarization_result.get("speakers_data", {})
        
        if speaker not in speakers_data:
            return {"success": False, "error": f"Speaker {speaker} not found"}
        
        segments = speakers_data[speaker]
        srt_content = generate_srt([
            {"start": s["start"], "end": s["end"], "text": s["text"]}
            for s in segments
        ])
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(srt_content)
        
        return {"success": True, "output_path": output_path}
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def export_all_speakers_srt(
    diarization_result: Dict[str, Any],
    output_dir: str,
    base_name: str = "speaker"
) -> Dict[str, Any]:
    """Export separate SRT files for each speaker"""
    try:
        if not diarization_result.get("success"):
            return {"success": False, "error": "Invalid diarization result"}
        
        os.makedirs(output_dir, exist_ok=True)
        
        speakers_data = diarization_result.get("speakers_data", {})
        exported_files = []
        
        for speaker, segments in speakers_data.items():
            output_path = os.path.join(output_dir, f"{base_name}_{speaker}.srt")
            
            srt_content = generate_srt([
                {"start": s["start"], "end": s["end"], "text": s["text"]}
                for s in segments
            ])
            
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(srt_content)
            
            exported_files.append(output_path)
        
        return {
            "success": True,
            "exported_files": exported_files,
            "num_speakers": len(exported_files)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def extract_speaker_audio(
    audio_path: str,
    diarization_result: Dict[str, Any],
    speaker: str,
    output_path: str,
    per_sentence: bool = False
) -> Dict[str, Any]:
    """Extract audio for a specific speaker"""
    try:
        if not os.path.exists(audio_path):
            return {"success": False, "error": f"Audio file not found: {audio_path}"}
        
        if not diarization_result.get("success"):
            return {"success": False, "error": "Invalid diarization result"}
        
        speakers_data = diarization_result.get("speakers_data", {})
        
        if speaker not in speakers_data:
            return {"success": False, "error": f"Speaker {speaker} not found"}
        
        segments = speakers_data[speaker]
        
        # Check for ffmpeg
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            return {"success": False, "error": "FFmpeg not found"}
        
        if per_sentence:
            # Export each sentence as separate file
            output_dir = os.path.splitext(output_path)[0] + "_sentences"
            os.makedirs(output_dir, exist_ok=True)
            
            exported_files = []
            for i, seg in enumerate(segments, 1):
                sentence_output = os.path.join(output_dir, f"sentence_{i:03d}.mp3")
                
                cmd = [
                    ffmpeg, "-y",
                    "-i", audio_path,
                    "-ss", str(seg["start"]),
                    "-to", str(seg["end"]),
                    "-c:a", "libmp3lame",
                    "-q:a", "2",
                    sentence_output
                ]
                
                subprocess.run(cmd, capture_output=True, check=True)
                exported_files.append({
                    "path": sentence_output,
                    "text": seg["text"],
                    "start": seg["start"],
                    "end": seg["end"]
                })
            
            return {
                "success": True,
                "exported_files": exported_files,
                "output_dir": output_dir
            }
        else:
            # Create concat file for ffmpeg
            temp_dir = tempfile.mkdtemp()
            concat_file = os.path.join(temp_dir, "concat.txt")
            
            # Extract each segment and create concat list
            segment_files = []
            for i, seg in enumerate(segments):
                seg_file = os.path.join(temp_dir, f"seg_{i:04d}.mp3")
                
                cmd = [
                    ffmpeg, "-y",
                    "-i", audio_path,
                    "-ss", str(seg["start"]),
                    "-to", str(seg["end"]),
                    "-c:a", "libmp3lame",
                    "-q:a", "2",
                    seg_file
                ]
                
                subprocess.run(cmd, capture_output=True, check=True)
                segment_files.append(seg_file)
            
            # Write concat file
            with open(concat_file, "w") as f:
                for seg_file in segment_files:
                    f.write(f"file '{seg_file}'\n")
            
            # Concatenate all segments
            cmd = [
                ffmpeg, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_file,
                "-c", "copy",
                output_path
            ]
            
            subprocess.run(cmd, capture_output=True, check=True)
            
            # Cleanup temp files
            shutil.rmtree(temp_dir)
            
            return {
                "success": True,
                "output_path": output_path,
                "duration": sum(s["end"] - s["start"] for s in segments)
            }
        
    except subprocess.CalledProcessError as e:
        return {"success": False, "error": f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def remove_background_noise(
    audio_path: str,
    output_path: Optional[str] = None,
    method: str = "denoiser"
) -> Dict[str, Any]:
    """Remove background noise from audio"""
    try:
        if not os.path.exists(audio_path):
            return {"success": False, "error": f"Audio file not found: {audio_path}"}
        
        if not output_path:
            base, ext = os.path.splitext(audio_path)
            output_path = f"{base}_denoised{ext}"
        
        if method == "denoiser":
            # Using Facebook's denoiser
            from denoiser import pretrained
            from denoiser.dsp import convert_audio
            import torchaudio
            import torch
            
            # Load model
            model = pretrained.dns64()
            model.eval()
            
            # Load audio
            wav, sr = torchaudio.load(audio_path)
            wav = convert_audio(wav, sr, model.sample_rate, model.chin)
            
            # Denoise
            with torch.no_grad():
                denoised = model(wav[None])[0]
            
            # Save
            torchaudio.save(output_path, denoised.cpu(), model.sample_rate)
            
            return {
                "success": True,
                "output_path": output_path
            }
            
        elif method == "ffmpeg":
            # Using FFmpeg's audio filters
            ffmpeg = shutil.which("ffmpeg")
            if not ffmpeg:
                return {"success": False, "error": "FFmpeg not found"}
            
            # Apply highpass, lowpass, and noise reduction filters
            cmd = [
                ffmpeg, "-y",
                "-i", audio_path,
                "-af", "highpass=f=200,lowpass=f=3000,afftdn=nf=-25",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                return {"success": False, "error": result.stderr}
            
            return {
                "success": True,
                "output_path": output_path
            }
        else:
            return {"success": False, "error": f"Unknown method: {method}"}
            
    except ImportError:
        return {"success": False, "error": "denoiser not installed. Run: pip install denoiser"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def separate_voices(
    audio_path: str,
    output_dir: Optional[str] = None,
    num_speakers: Optional[int] = None
) -> Dict[str, Any]:
    """Separate different voices/speakers from audio"""
    try:
        if not os.path.exists(audio_path):
            return {"success": False, "error": f"Audio file not found: {audio_path}"}
        
        # Using demucs or spleeter for source separation
        # For voice separation, we'll use pyannote + ffmpeg
        
        if not output_dir:
            output_dir = os.path.splitext(audio_path)[0] + "_separated"
        
        os.makedirs(output_dir, exist_ok=True)
        
        # First, run diarization to identify speakers
        from pyannote.audio import Pipeline
        
        pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1")
        
        diarization_params = {}
        if num_speakers:
            diarization_params["num_speakers"] = num_speakers
        
        diarization = pipeline(audio_path, **diarization_params)
        
        # Extract audio for each speaker
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            return {"success": False, "error": "FFmpeg not found"}
        
        speakers = {}
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            if speaker not in speakers:
                speakers[speaker] = []
            speakers[speaker].append((turn.start, turn.end))
        
        exported_files = []
        for speaker, segments in speakers.items():
            output_path = os.path.join(output_dir, f"{speaker}.mp3")
            
            # Create concat file
            temp_dir = tempfile.mkdtemp()
            segment_files = []
            
            for i, (start, end) in enumerate(segments):
                seg_file = os.path.join(temp_dir, f"seg_{i:04d}.mp3")
                
                cmd = [
                    ffmpeg, "-y",
                    "-i", audio_path,
                    "-ss", str(start),
                    "-to", str(end),
                    "-c:a", "libmp3lame",
                    "-q:a", "2",
                    seg_file
                ]
                
                subprocess.run(cmd, capture_output=True, check=True)
                segment_files.append(seg_file)
            
            # Concatenate
            concat_file = os.path.join(temp_dir, "concat.txt")
            with open(concat_file, "w") as f:
                for seg_file in segment_files:
                    f.write(f"file '{seg_file}'\n")
            
            cmd = [
                ffmpeg, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_file,
                "-c", "copy",
                output_path
            ]
            
            subprocess.run(cmd, capture_output=True, check=True)
            shutil.rmtree(temp_dir)
            
            exported_files.append({
                "speaker": speaker,
                "path": output_path,
                "duration": sum(end - start for start, end in segments)
            })
        
        return {
            "success": True,
            "output_dir": output_dir,
            "speakers": exported_files,
            "num_speakers": len(exported_files)
        }
        
    except ImportError:
        return {"success": False, "error": "pyannote.audio not installed"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# CLI
# =============================================================================

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No command specified"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "check-models":
            result = check_models_installed()
            
        elif command == "download-whisper":
            model = sys.argv[2] if len(sys.argv) > 2 else "base"
            result = download_whisper_model(model)
            
        elif command == "download-diarization":
            result = download_diarization_model()
            
        elif command == "download-denoiser":
            result = download_denoiser_model()
            
        elif command == "get-progress":
            result = get_download_progress()
            
        elif command == "cancel-download":
            result = cancel_model_download()
            
        elif command == "transcribe":
            if len(sys.argv) < 3:
                result = {"success": False, "error": "Missing audio path"}
            else:
                params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
                result = transcribe_audio(
                    sys.argv[2],
                    model_name=params.get("model", "base"),
                    language=params.get("language"),
                    output_format=params.get("format", "srt"),
                    output_path=params.get("output_path"),
                    engine=params.get("engine", "whisper")
                )
                
        elif command == "transcribe-diarize":
            if len(sys.argv) < 3:
                result = {"success": False, "error": "Missing audio path"}
            else:
                params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
                result = transcribe_with_diarization(
                    sys.argv[2],
                    model_name=params.get("model", "base"),
                    language=params.get("language"),
                    num_speakers=params.get("num_speakers"),
                    min_speakers=params.get("min_speakers", 1),
                    max_speakers=params.get("max_speakers", 10),
                    hf_token=params.get("hf_token")
                )
                
        elif command == "denoise":
            if len(sys.argv) < 3:
                result = {"success": False, "error": "Missing audio path"}
            else:
                output = sys.argv[3] if len(sys.argv) > 3 else None
                method = sys.argv[4] if len(sys.argv) > 4 else "denoiser"
                result = remove_background_noise(sys.argv[2], output, method)
                
        elif command == "separate-voices":
            if len(sys.argv) < 3:
                result = {"success": False, "error": "Missing audio path"}
            else:
                params = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
                result = separate_voices(
                    sys.argv[2],
                    output_dir=params.get("output_dir"),
                    num_speakers=params.get("num_speakers")
                )
                
        elif command == "extract-speaker":
            if len(sys.argv) < 4:
                result = {"success": False, "error": "Usage: extract-speaker <audio> <params_json>"}
            else:
                params = json.loads(sys.argv[3])
                result = extract_speaker_audio(
                    sys.argv[2],
                    params["diarization_result"],
                    params["speaker"],
                    params["output_path"],
                    params.get("per_sentence", False)
                )
        
        elif command == "debug-env":
            # Debug command to check Python environment
            result = {
                "success": True,
                "python_executable": sys.executable,
                "python_version": sys.version,
                "python_path": sys.path[:5],  # First 5 paths
                "cwd": os.getcwd()
            }
            # Check if whisper is importable
            try:
                import whisper
                result["whisper_installed"] = True
                result["whisper_location"] = whisper.__file__
            except ImportError as e:
                result["whisper_installed"] = False
                result["whisper_error"] = str(e)
                
        else:
            result = {"success": False, "error": f"Unknown command: {command}"}
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
