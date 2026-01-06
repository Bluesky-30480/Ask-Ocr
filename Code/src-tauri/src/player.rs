use std::sync::mpsc::{channel, Sender};
use std::thread;
use rodio::{Decoder, OutputStream, Sink};
use std::fs::File;
use std::io::BufReader;
use tauri::State;
use std::sync::Mutex;

pub(crate) enum AudioCommand {
    Play(String),
    Pause,
    Resume,
    Stop,
    SetVolume(f32),
    Seek(f64),
}

pub struct AudioPlayer {
    sender: Mutex<Sender<AudioCommand>>,
}

impl AudioPlayer {
    pub fn new() -> Self {
        let (tx, rx) = channel();
        
        thread::spawn(move || {
            // Initialize audio output stream in a separate thread
            // This stream must stay alive for playback to work
            let (_stream, stream_handle) = match OutputStream::try_default() {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("Failed to get default audio output stream: {}", e);
                    return;
                }
            };

            let sink = match Sink::try_new(&stream_handle) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("Failed to create audio sink: {}", e);
                    return;
                }
            };
            
            while let Ok(command) = rx.recv() {
                match command {
                    AudioCommand::Play(path) => {
                        match File::open(&path) {
                            Ok(file) => {
                                let reader = BufReader::new(file);
                                match Decoder::new(reader) {
                                    Ok(source) => {
                                        // Stop any currently playing sound
                                        if !sink.empty() {
                                            sink.stop();
                                            // Re-create sink or just append? 
                                            // Sink::stop() clears the queue but might detach.
                                            // Ideally we create a new sink or just append to empty.
                                            // Rodio's sink.stop() clears the queue.
                                        }
                                        
                                        // We need to create a new sink if the previous one is "done" or stopped?
                                        // Actually, sink.append() works after stop().
                                        // But let's be safe and just append.
                                        sink.append(source);
                                        sink.play();
                                    },
                                    Err(e) => eprintln!("Error decoding audio file: {}", e),
                                }
                            },
                            Err(e) => eprintln!("Error opening audio file '{}': {}", path, e),
                        }
                    },
                    AudioCommand::Pause => sink.pause(),
                    AudioCommand::Resume => sink.play(),
                    AudioCommand::Stop => sink.stop(),
                    AudioCommand::SetVolume(vol) => sink.set_volume(vol),
                    AudioCommand::Seek(time) => {
                        let _ = sink.try_seek(std::time::Duration::from_secs_f64(time));
                    },
                }
            }
        });

        Self {
            sender: Mutex::new(tx),
        }
    }

    pub fn send(&self, command: AudioCommand) {
        if let Ok(sender) = self.sender.lock() {
            let _ = sender.send(command);
        }
    }
}

#[tauri::command]
pub fn play_audio(state: State<AudioPlayer>, path: String) {
    state.send(AudioCommand::Play(path));
}

#[tauri::command]
pub fn pause_audio(state: State<AudioPlayer>) {
    state.send(AudioCommand::Pause);
}

#[tauri::command]
pub fn resume_audio(state: State<AudioPlayer>) {
    state.send(AudioCommand::Resume);
}

#[tauri::command]
pub fn stop_audio(state: State<AudioPlayer>) {
    state.send(AudioCommand::Stop);
}

#[tauri::command]
pub fn set_volume(state: State<AudioPlayer>, volume: f32) {
    state.send(AudioCommand::SetVolume(volume));
}

#[tauri::command]
pub fn seek_audio(state: State<AudioPlayer>, time: f64) {
    state.send(AudioCommand::Seek(time));
}
